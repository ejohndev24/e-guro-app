import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apolloClient } from '@/core/apollo/client';
import { colors } from '@/core/theme';
import { Classroom, Gradebook, RosterStudent, Sf2Report, Sf5Report, Sf9Report, Student } from '@/core/types';
import { GRADE_ROSTER_QUERY } from '@/features/grades/graphql/queries/getGradeRoster';
import { CLASS_DETAIL_QUERY } from '@/features/classes/graphql/queries/getClassDetail';
import { Card, ErrorState, LoadingState } from '@/shared/components/ui';
import { saveAutoSizedWorkbook } from '@/shared/utils/spreadsheetExport';
import { REPORTS_QUERY } from '../graphql/queries/getReports';
import { classRecordFileName, combinedClassRecordsFileName, createCombinedClassRecordsCsv, createDepEdClassRecordCsv } from '../utils/depedClassRecordCsv';
import { SAVE_OBSERVED_VALUE_MUTATION, SET_REPORT_STATUS_MUTATION, SF2_REPORT_QUERY, SF5_REPORT_QUERY, SF9_REPORT_QUERY } from '../graphql/schoolForms';
import { combinedSf9FileName, createCombinedSf9Csv, createSf2Csv, createSf5Csv, createSf9Csv, formFileName } from '../utils/schoolFormsCsv';

type Data = {
  dashboard: {
    stats: { classCount: number; studentCount: number; attendanceRate: number; pendingGrades: number; averageGrade: number | null };
    atRisk: { student: { id: string; fullName: string }; classroom: { id: string; subject: string }; currentGrade: number }[];
    gradeReports: { classroom: Classroom; averageGrade: number | null; gradedStudents: number; studentCount: number; passingStudents: number }[];
  };
};

const ReportsScreen = () => {
  const insets = useSafeAreaInsets();
  const [quarter, setQuarter] = useState(1);
  const [sf2Month, setSf2Month] = useState(() => localDateKey(new Date()).slice(0, 7));
  const [exportingId, setExportingId] = useState<string>();
  const [sf9Class, setSf9Class] = useState<Classroom>();
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [sf9SelectedIds, setSf9SelectedIds] = useState<string[]>([]);
  const [sf9SelectionState, setSf9Selection] = useState<{ classroom: Classroom; student: Student }>();
  const sf9Selection = sf9SelectionState as { classroom: Classroom; student: Student };
  const [observedQuarter, setObservedQuarter] = useState(1);
  const { data, loading, error, refetch } = useQuery<Data>(REPORTS_QUERY, { variables: { quarter }, fetchPolicy: 'network-only' });
  const sf9Roster = useQuery<{ classDetail: { roster: RosterStudent[] } }>(CLASS_DETAIL_QUERY, { variables: { id: sf9Class?.id, date: localDateKey(new Date()), quarter: 1, attendanceScope: 'DAILY' }, skip: !sf9Class });
  const sf9Preview = useQuery<{ sf9Report: Sf9Report }>(SF9_REPORT_QUERY, { variables: { classroomId: sf9Selection?.classroom.id, studentId: sf9Selection?.student.id }, skip: !sf9Selection, fetchPolicy: 'network-only' });
  const [saveObserved, saveObservedState] = useMutation(SAVE_OBSERVED_VALUE_MUTATION);

  const toggleSf9Student = (studentId: string) => setSf9SelectedIds((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]);
  const toggleSubject = (subject: string) => setExpandedSubjects((current) => current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject]);

  const shiftSf2Month = (offset: number) => {
    const year = Number(sf2Month.slice(0, 4));
    const month = Number(sf2Month.slice(5, 7));
    const value = new Date(year, month - 1 + offset, 1);
    setSf2Month(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`);
  };

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  const downloadClassRecord = async (classroomId: string) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android download only', 'Direct folder saving is currently available on Android.');
      return;
    }
    setExportingId(classroomId);
    try {
      const result = await apolloClient.query<{ gradebook: Gradebook }>({
        query: GRADE_ROSTER_QUERY,
        variables: { classroomId, quarter },
        fetchPolicy: 'network-only',
      });
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return;
      const baseName = classRecordFileName(result.data.gradebook, quarter).replace(/\.csv$/, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = await saveAutoSizedWorkbook(permission.directoryUri, `${baseName}_${timestamp}.csv`, createDepEdClassRecordCsv(result.data.gradebook, quarter), 'Class record');
      Alert.alert('Report downloaded', `${fileName} was saved to the folder you selected.`);
    } catch (downloadError) {
      Alert.alert('Report not downloaded', downloadError instanceof Error ? downloadError.message : 'Please try again.');
    } finally {
      setExportingId(undefined);
    }
  };

  const downloadSubjectRecords = async (subject: string, reports: Data['dashboard']['gradeReports']) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android download only', 'Direct folder saving is currently available on Android.');
      return;
    }
    const key = `subject:${subject}`;
    setExportingId(key);
    try {
      const results = await Promise.all(reports.map((report) => apolloClient.query<{ gradebook: Gradebook }>({ query: GRADE_ROSTER_QUERY, variables: { classroomId: report.classroom.id, quarter }, fetchPolicy: 'network-only' })));
      const gradebooks = results.map((result) => result.data.gradebook);
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return;
      const fileName = combinedClassRecordsFileName(subject, gradebooks[0]?.classroom.schoolYear ?? '', quarter);
      const savedFileName = await saveAutoSizedWorkbook(permission.directoryUri, fileName, createCombinedClassRecordsCsv(gradebooks, quarter), 'Class records');
      Alert.alert('Records downloaded', `${savedFileName} was saved to the folder you selected.`);
    } catch (downloadError) {
      Alert.alert('Records not downloaded', downloadError instanceof Error ? downloadError.message : 'Please try again.');
    } finally {
      setExportingId(undefined);
    }
  };

  const saveCsv = async (fileName: string, contents: string) => {
    if (Platform.OS !== 'android') throw new Error('Direct folder saving is currently available on Android.');
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) return false;
    await saveAutoSizedWorkbook(permission.directoryUri, fileName, contents, fileName.split('_')[0] ?? 'Report');
    return true;
  };

  const offerStatusAction = (kind: 'SF2' | 'SF9' | 'SF5', report: Sf2Report | Sf9Report | Sf5Report, studentId?: string) => {
    const periodKey = kind === 'SF2' ? (report as Sf2Report).month : report.classroom.schoolYear;
    const next = report.status === 'DRAFT' ? 'FINALIZED' : report.status === 'FINALIZED' ? 'LOCKED' : undefined;
    if (!next || !report.readyToFinalize) { Alert.alert('Excel report downloaded', report.missingFields.length ? `Saved as draft. Complete: ${report.missingFields.join(', ')}` : `This report is ${report.status.toLowerCase()}.`); return; }
    Alert.alert('Excel report downloaded', next === 'FINALIZED' ? 'The data is complete. Finalize this report?' : 'Lock this finalized report? Locked reports cannot be edited.', [
      { text: 'Not now', style: 'cancel' },
      { text: next === 'FINALIZED' ? 'Finalize' : 'Lock', style: next === 'LOCKED' ? 'destructive' : 'default', onPress: async () => { try { await apolloClient.mutate({ mutation: SET_REPORT_STATUS_MUTATION, variables: { kind, classroomId: report.classroom.id, periodKey, status: next, studentId } }); Alert.alert('Report updated', `Status changed to ${next.toLowerCase()}. Export again to include the new status.`); } catch (statusError) { Alert.alert('Status not changed', statusError instanceof Error ? statusError.message : 'Try again.'); } } },
    ]);
  };

  const downloadSchoolForm = async (kind: 'SF2' | 'SF9' | 'SF5', classroom: Classroom, studentId?: string) => {
    setExportingId(`${kind}:${classroom.id}:${studentId ?? ''}`);
    try {
      const month = sf2Month;
      if (kind === 'SF2') {
        const result = await apolloClient.query<{ sf2Report: Sf2Report }>({ query: SF2_REPORT_QUERY, variables: { classroomId: classroom.id, month }, fetchPolicy: 'network-only' });
        if (await saveCsv(formFileName('SF2', result.data.sf2Report, `_${month}`), createSf2Csv(result.data.sf2Report))) offerStatusAction(kind, result.data.sf2Report);
      } else if (kind === 'SF5') {
        const result = await apolloClient.query<{ sf5Report: Sf5Report }>({ query: SF5_REPORT_QUERY, variables: { classroomId: classroom.id }, fetchPolicy: 'network-only' });
        if (await saveCsv(formFileName(result.data.sf5Report.variant, result.data.sf5Report), createSf5Csv(result.data.sf5Report))) offerStatusAction(kind, result.data.sf5Report);
      } else if (studentId) {
        const result = await apolloClient.query<{ sf9Report: Sf9Report }>({ query: SF9_REPORT_QUERY, variables: { classroomId: classroom.id, studentId }, fetchPolicy: 'network-only' });
        if (await saveCsv(formFileName(result.data.sf9Report.variant, result.data.sf9Report, `_${result.data.sf9Report.student.studentNo}`), createSf9Csv(result.data.sf9Report))) offerStatusAction(kind, result.data.sf9Report, studentId);
      }
    } catch (formError) { Alert.alert('Report not downloaded', formError instanceof Error ? formError.message : 'Try again.'); }
    finally { setExportingId(undefined); }
  };

  const downloadSelectedSf9 = async () => {
    if (!sf9Class || !sf9SelectedIds.length) return;
    setExportingId(`SF9-batch:${sf9Class.id}`);
    try {
      const reports = await Promise.all(sf9SelectedIds.map(async (studentId) => (await apolloClient.query<{ sf9Report: Sf9Report }>({ query: SF9_REPORT_QUERY, variables: { classroomId: sf9Class.id, studentId }, fetchPolicy: 'network-only' })).data.sf9Report));
      if (await saveCsv(combinedSf9FileName(sf9Class), createCombinedSf9Csv(reports))) {
        const incomplete = reports.filter((report) => report.missingFields.length > 0);
        Alert.alert('SF9 draft Excel downloaded', incomplete.length ? `${reports.length} student report${reports.length === 1 ? '' : 's'} were saved. ${incomplete.length} still need details before they can be finalized.` : `${reports.length} student report${reports.length === 1 ? '' : 's'} were saved and are ready to finalize.`);
        setSf9Class(undefined);
        setSf9SelectedIds([]);
      }
    } catch (downloadError) { Alert.alert('SF9 reports not downloaded', downloadError instanceof Error ? downloadError.message : 'Try again.'); }
    finally { setExportingId(undefined); }
  };

  if (loading && !data) return <View style={[styles.screen, { paddingTop: insets.top }]}><LoadingState /></View>;
  if (error && !data) return <View style={[styles.screen, { paddingTop: insets.top }]}><ErrorState message={error.message} retry={refetch} /></View>;
  const dashboard = data!.dashboard;
  const stats = dashboard.stats;
  const advisoryClasses = dashboard.gradeReports.map((item) => item.classroom).filter((item) => item.isAdvisory && ['KINDERGARTEN', 'ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'].includes(item.educationLevel));
  const classRecordsBySubject = [...dashboard.gradeReports.reduce((groups, report) => {
    const key = report.classroom.subject.trim().toLowerCase();
    const existing = groups.get(key);
    if (existing) existing.reports.push(report);
    else groups.set(key, { subject: report.classroom.subject, reports: [report] });
    return groups;
  }, new Map<string, { subject: string; reports: Data['dashboard']['gradeReports'] }>()).values()];
  const advisoryGroups = [...advisoryClasses.reduce((groups, room) => {
    const key = [room.gradeLevel, room.section.toLowerCase(), room.schoolYear, room.term].join('|');
    if (!groups.has(key)) groups.set(key, room);
    return groups;
  }, new Map<string, Classroom>()).values()];

  return <ScrollView style={styles.screen} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 30 }}>
    <View style={styles.heading}><Text style={styles.eyebrow}>RECORDS</Text><Text style={styles.title}>Reports</Text><Text style={styles.subtitle}>Class records, attendance, student progress, and promotion reports.</Text></View>
    <View style={styles.quarters}>{[1, 2, 3, 4].map((value) => <Pressable key={value} onPress={() => setQuarter(value)} style={[styles.quarter, quarter === value && styles.quarterActive]}><Text style={[styles.quarterText, quarter === value && styles.quarterTextActive]}>Q{value}</Text></Pressable>)}</View>
    <View style={styles.grid}>
      <Metric icon="school" label={`Q${quarter} average`} value={stats.averageGrade == null ? '—' : stats.averageGrade.toFixed(1)} color={colors.primary} bg={colors.primarySoft} />
      <Metric icon="checkmark-done" label="Attendance rate" value={`${stats.attendanceRate}%`} color={colors.success} bg={colors.successSoft} />
      <Metric icon="people" label="Active students" value={String(stats.studentCount)} color={colors.purple} bg={colors.purpleSoft} />
      <Metric icon="alert-circle" label="Grades pending" value={String(stats.pendingGrades)} color={colors.warning} bg={colors.warningSoft} />
    </View>
    <Text style={styles.section}>Class records · Quarter {quarter}</Text>
    <Card style={styles.card}>{classRecordsBySubject.length ? classRecordsBySubject.map((group) => {
      const expanded = expandedSubjects.includes(group.subject);
      return <View key={group.subject} style={styles.subjectRecordGroup}>
        <View style={styles.subjectRecordHead}><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => toggleSubject(group.subject)} style={styles.subjectToggle}><View style={{ flex: 1 }}><Text style={styles.name}>{group.subject}</Text><Text style={styles.meta}>{group.reports.length} section{group.reports.length === 1 ? '' : 's'}</Text></View></Pressable><Pressable disabled={exportingId != null} onPress={() => void downloadSubjectRecords(group.subject, group.reports)} style={[styles.allSections, exportingId != null && styles.disabled]}><Ionicons name="download-outline" size={14} color={colors.primary} /><Text style={styles.allSectionsText}>{exportingId === `subject:${group.subject}` ? 'Preparing…' : 'All sections'}</Text></Pressable><Pressable accessibilityLabel={expanded ? `Collapse ${group.subject}` : `Expand ${group.subject}`} onPress={() => toggleSubject(group.subject)} hitSlop={8} style={styles.subjectCaret}><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} /></Pressable></View>
        {expanded && group.reports.map((report) => <View key={report.classroom.id} style={styles.reportRow}><View style={{ flex: 1 }}><Text style={styles.sectionName}>{report.classroom.gradeLevel === 0 ? 'Kindergarten' : `Grade/Year ${report.classroom.gradeLevel}`} · {report.classroom.section}</Text><Text style={styles.completion}>{report.gradedStudents}/{report.studentCount} complete · {report.passingStudents} passing</Text></View><View style={styles.reportResult}><Pressable disabled={exportingId != null} onPress={() => void downloadClassRecord(report.classroom.id)} style={[styles.download, exportingId != null && styles.disabled]}><Ionicons name="download-outline" size={15} color="#fff" /><Text style={styles.downloadText}>{exportingId === report.classroom.id ? 'Preparing…' : 'This section'}</Text></Pressable></View></View>)}
      </View>;
    }) : <Text style={styles.empty}>No classes are available for this report.</Text>}</Card>
    <View style={styles.formSectionHead}><Text style={styles.section}>School forms</Text><View style={styles.monthPicker}><Pressable accessibilityLabel="Previous month" onPress={() => shiftSf2Month(-1)}><Ionicons name="chevron-back" color={colors.primary} size={17} /></Pressable><Text style={styles.monthText}>{new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric' }).format(new Date(`${sf2Month}-01T12:00:00`))}</Text><Pressable accessibilityLabel="Next month" onPress={() => shiftSf2Month(1)}><Ionicons name="chevron-forward" color={colors.primary} size={17} /></Pressable></View></View>
    <Card style={styles.card}>{advisoryGroups.length ? advisoryGroups.map((room, index) => <View key={room.id} style={[styles.formRow, index > 0 && styles.border]}><View style={{ flex: 1 }}><Text style={styles.name}>{room.gradeLevel === 0 ? 'Kindergarten' : `Grade/Year ${room.gradeLevel}`} · {room.section}</Text><Text style={styles.meta}>Attendance, learner progress, and promotion</Text></View><View style={styles.formActions}><FormButton label="SF2" onPress={() => void downloadSchoolForm('SF2', room)} disabled={exportingId != null} />{room.educationLevel !== 'KINDERGARTEN' && <FormButton label="SF9" onPress={() => { setSf9SelectedIds([]); setSf9Class(room); }} disabled={exportingId != null} />}<FormButton label={room.educationLevel === 'SENIOR_HIGH' ? 'SF5A' : 'SF5'} onPress={() => void downloadSchoolForm('SF5', room)} disabled={exportingId != null} /></View></View>) : <Text style={styles.empty}>Choose an advisory section to prepare attendance and learner reports.</Text>}</Card>
    <Text style={styles.note}>SF2 is the monthly attendance report. SF9 can be exported per student as a draft; complete its requirements only before finalizing. SF5 summarizes promotion and learning progress for the section.</Text>
    <Modal visible={Boolean(sf9Class)} transparent animationType="slide" onRequestClose={() => setSf9Class(undefined)}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.sheetHead}><View><Text style={styles.sheetTitle}>Select students</Text><Text style={styles.meta}>{sf9Class?.gradeLevel === 0 ? 'Kindergarten' : `Grade/Year ${sf9Class?.gradeLevel}`} · {sf9Class?.section}</Text></View><Pressable onPress={() => setSf9Class(undefined)}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View><Text style={styles.selectionHint}>Export at any time as a draft. Review a student only to complete SF9 details before finalizing.</Text><View style={styles.selectionBar}><Text style={styles.selectionCount}>{sf9SelectedIds.length} selected</Text><Pressable onPress={() => setSf9SelectedIds(sf9SelectedIds.length === (sf9Roster.data?.classDetail.roster.length ?? 0) ? [] : (sf9Roster.data?.classDetail.roster.map((item) => item.student.id) ?? []))} style={styles.selectAll}><Text style={styles.selectAllText}>{sf9SelectedIds.length === (sf9Roster.data?.classDetail.roster.length ?? 0) ? 'Clear all' : 'Select all'}</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>{sf9Roster.loading ? <LoadingState /> : sf9Roster.data?.classDetail.roster.map(({ student }) => <View key={student.id} style={styles.studentChoice}><Pressable onPress={() => toggleSf9Student(student.id)} style={styles.checkbox}><Ionicons name={sf9SelectedIds.includes(student.id) ? 'checkbox' : 'square-outline'} size={21} color={sf9SelectedIds.includes(student.id) ? colors.primary : colors.muted} /></Pressable><View style={{ flex: 1 }}><Text style={styles.name}>{student.fullName}</Text><Text style={styles.meta}>{student.lrn ? `LRN ${student.lrn}` : `Student no. ${student.studentNo}`}</Text></View><Pressable onPress={() => { const room = sf9Class; setSf9Class(undefined); if (room) setSf9Selection({ classroom: room, student }); }} style={styles.prepareButton}><Text style={styles.prepareText}>Review</Text></Pressable></View>)}</ScrollView><Pressable disabled={!sf9SelectedIds.length || exportingId != null} onPress={() => void downloadSelectedSf9()} style={[styles.exportButton, (!sf9SelectedIds.length || exportingId != null) && styles.disabled]}><Ionicons name="download-outline" size={18} color="#fff" /><Text style={styles.downloadText}>{exportingId?.startsWith('SF9-batch:') ? 'Exporting…' : `Export draft Excel (${sf9SelectedIds.length})`}</Text></Pressable></View></View></Modal>
    <Modal visible={Boolean(sf9Selection)} transparent animationType="slide" onRequestClose={() => setSf9Selection(undefined)}>
      <View style={styles.backdrop}><View style={[styles.sheet, { maxHeight: '92%' }]}>
        <View style={styles.sheetHead}><View><Text style={styles.sheetTitle}>Review SF9</Text><Text style={styles.meta}>{sf9Selection?.student.fullName}</Text></View><Pressable onPress={() => setSf9Selection(undefined)}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
        {sf9Preview.loading ? <LoadingState /> : sf9Preview.data && <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
          <Text style={styles.selectionHint}>Optional for draft export. Complete these details only before finalizing this student’s SF9.</Text>
          <Text style={styles.subheading}>Observed values</Text>
          <View style={styles.quarters}>{[1, 2, 3, 4].map((value) => <Pressable key={value} onPress={() => setObservedQuarter(value)} style={[styles.quarter, observedQuarter === value && styles.quarterActive]}><Text style={[styles.quarterText, observedQuarter === value && styles.quarterTextActive]}>Q{value}</Text></Pressable>)}</View>
          {sf9Preview.data.sf9Report.observedValues.map((value) => <View key={value.coreValue} style={styles.valueRow}><Text style={styles.name}>{value.coreValue}</Text><View style={styles.ratingRow}>{(['AO', 'SO', 'RO', 'NO'] as const).map((rating) => <Pressable disabled={saveObservedState.loading} key={rating} onPress={async () => { await saveObserved({ variables: { input: { classroomId: sf9Selection!.classroom.id, studentId: sf9Selection!.student.id, quarter: observedQuarter, coreValue: value.coreValue, rating } } }); await sf9Preview.refetch(); }} style={[styles.rating, value.quarters[observedQuarter - 1] === rating && styles.ratingActive]}><Text style={[styles.ratingText, value.quarters[observedQuarter - 1] === rating && styles.ratingTextActive]}>{rating}</Text></Pressable>)}</View></View>)}
          <Text style={styles.ratingHelp}>AO Always Observed · SO Sometimes Observed · RO Rarely Observed · NO Not Observed</Text>
          {sf9Preview.data.sf9Report.missingFields.length > 0 && <View style={styles.warningBox}><Text style={styles.warningTitle}>Required before finalizing</Text><Text style={styles.warningText}>{sf9Preview.data.sf9Report.missingFields.join('\n')}</Text></View>}
          <Pressable onPress={() => { const selection = sf9Selection; setSf9Selection(undefined); void downloadSchoolForm('SF9', selection.classroom, selection.student.id); }} style={styles.exportButton}><Ionicons name="download-outline" size={18} color="#fff" /><Text style={styles.downloadText}>Export draft Excel</Text></Pressable>
        </ScrollView>}
      </View></View>
    </Modal>
  </ScrollView>;
};

export default ReportsScreen;

const Metric = ({ icon, label, value, color, bg }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string; bg: string }) => <Card style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={22} color={color} /></View><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></Card>;

const FormButton = ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) => <Pressable disabled={disabled} onPress={onPress} style={[styles.formButton, disabled && styles.disabled]}><Text style={styles.formButtonText}>{label}</Text></Pressable>;
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  heading: { paddingHorizontal: 20 },
  eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' },
  title: { fontSize: 27, fontWeight: '800', color: colors.text, marginTop: 2 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  quarters: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, padding: 4, borderRadius: 12, backgroundColor: '#E9EDF4' },
  quarter: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  quarterActive: { backgroundColor: colors.surface },
  quarterText: { color: colors.muted, fontWeight: '700' },
  quarterTextActive: { color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  metric: { width: '48.5%', minHeight: 145 },
  metricIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  value: { fontSize: 25, fontWeight: '800', color: colors.text },
  label: { color: colors.muted, fontSize: 12, marginTop: 3 },
  section: { color: colors.text, fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  formSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 16 },
  monthPicker: { height: 31, paddingHorizontal: 7, borderRadius: 9, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  card: { marginHorizontal: 16, paddingVertical: 4 },
  subjectRecordGroup: { paddingVertical: 11 },
  subjectRecordHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 5 },
  subjectToggle: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  subjectCaret: { width: 24, height: 30, alignItems: 'center', justifyContent: 'center' },
  allSections: { minHeight: 30, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: '#BBD2F8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  allSectionsText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  reportRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 10 },
  sectionName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  reportResult: { alignItems: 'flex-end' },
  completion: { color: colors.muted, fontSize: 9, marginTop: 4 },
  download: { minWidth: 72, height: 32, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  downloadText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  disabled: { opacity: .55 },
  riskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 11 },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  alert: { width: 37, height: 37, borderRadius: 11, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: 13 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  grade: { color: colors.danger, fontWeight: '800' },
  empty: { color: colors.muted, textAlign: 'center', padding: 20 },
  note: { margin: 20, color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  formRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 8 },
  formActions: { flexDirection: 'row', gap: 5 },
  formButton: { minWidth: 42, height: 32, paddingHorizontal: 7, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  formButtonText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: '#0B193099', justifyContent: 'flex-end' },
  sheet: { maxHeight: '82%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  selectionHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 10 },
  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  selectionCount: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  selectAll: { paddingHorizontal: 8, paddingVertical: 5 },
  selectAllText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  studentChoice: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, gap: 9 },
  checkbox: { paddingVertical: 10, paddingRight: 2 },
  prepareButton: { minHeight: 30, paddingHorizontal: 9, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  prepareText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  subheading: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 6 },
  valueRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  ratingRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  rating: { flex: 1, height: 34, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ratingActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  ratingTextActive: { color: '#fff' },
  ratingHelp: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 9 },
  warningBox: { padding: 12, borderRadius: 11, backgroundColor: colors.warningSoft, marginTop: 14 },
  warningTitle: { color: colors.text, fontSize: 11, fontWeight: '800' },
  warningText: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  exportButton: { height: 48, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
});
