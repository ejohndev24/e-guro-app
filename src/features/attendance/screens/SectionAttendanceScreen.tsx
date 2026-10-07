import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/core/theme';
import { AttendanceScope, AttendanceStatus, Classroom, RosterStudent, StudentGroup } from '@/core/types';
import { Avatar, ErrorState, LoadingState, ScreenHeader } from '@/shared/components/ui';
import { SET_ATTENDANCE_MUTATION } from '../graphql/mutations/attendanceMutations';
import { AttendanceStatusPicker } from '../components/AttendanceStatusPicker';
import { CLASS_DETAIL_QUERY } from '@/features/classes/graphql/queries/getClassDetail';
import { STUDENT_GROUPS_QUERY } from '@/features/students/graphql/queries/getStudents';

type ClassDetail = { classDetail: { classroom: Classroom; roster: RosterStudent[] } };

export const SectionAttendanceScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const date = formatDateKey(selectedDate);
  const sections = useQuery<{ studentGroups: StudentGroup[] }>(STUDENT_GROUPS_QUERY, { fetchPolicy: 'network-only' });
  const section = sections.data?.studentGroups.find((item) => item.id === id);
  const advisoryClass = section?.classes.find((item) => item.isAdvisory);
  const variables = { id: advisoryClass?.id, date, quarter: 1, attendanceScope: 'DAILY' as AttendanceScope };
  const detail = useQuery<ClassDetail>(CLASS_DETAIL_QUERY, { variables, skip: !advisoryClass?.id, fetchPolicy: 'network-only' });
  const [setAttendance, saveState] = useMutation(SET_ATTENDANCE_MUTATION);
  const roster = detail.data?.classDetail.roster ?? [];
  const filtered = roster.filter(({ student }) => student.fullName.toLowerCase().includes(search.toLowerCase()) || student.studentNo.includes(search));
  const update = async (studentId: string, status: AttendanceStatus, reason?: string) => {
    try {
      await setAttendance({ variables: { classroomId: advisoryClass?.id, studentId, date, status, reason, scope: 'DAILY' }, refetchQueries: [{ query: CLASS_DETAIL_QUERY, variables }] });
    } catch (error) {
      Alert.alert('Attendance not saved', error instanceof Error ? error.message : 'Please try again.');
    }
  };
  const moveDate = (days: number) => setSelectedDate((current) => { const next = new Date(current); next.setDate(next.getDate() + days); return next; });

  if (sections.loading && !section) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="Section attendance" onBack={router.back} /><LoadingState /></View>;
  if (sections.error || !section || !advisoryClass) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="Section attendance" onBack={router.back} /><ErrorState message={sections.error?.message ?? 'Daily attendance is available only for an advisory section.'} retry={sections.refetch} /></View>;
  if (detail.loading && !detail.data) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title={section.displayName} subtitle="Daily section attendance" onBack={router.back} /><LoadingState /></View>;
  if (detail.error) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title={section.displayName} subtitle="Daily section attendance" onBack={router.back} /><ErrorState message={detail.error.message} retry={detail.refetch} /></View>;

  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <ScreenHeader title={section.displayName} subtitle="Daily section attendance · SF2" onBack={router.back} />
    <View style={styles.context}><View style={styles.contextIcon}><Ionicons name="school-outline" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.contextTitle}>One record for the whole section</Text><Text style={styles.contextHelp}>This is daily adviser attendance, not attendance for a subject.</Text></View></View>
    <View style={styles.dateBar}><Pressable accessibilityLabel="Previous day" onPress={() => moveDate(-1)} style={styles.dateArrow}><Ionicons name="chevron-back" size={19} color={colors.text} /></Pressable><Pressable onPress={() => setSelectedDate(new Date())} style={styles.dateCopy}><Text style={styles.dateLabel}>{new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }).format(selectedDate)}</Text><Text style={styles.dateHint}>{date === formatDateKey(new Date()) ? 'Today' : 'Tap to return to today'}</Text></Pressable><Pressable accessibilityLabel="Next day" onPress={() => moveDate(1)} style={styles.dateArrow}><Ionicons name="chevron-forward" size={19} color={colors.text} /></Pressable></View>
    <View style={styles.summary}><View><Text style={styles.summaryValue}>{roster.length}</Text><Text style={styles.summaryLabel}>Students</Text></View><View style={styles.divider} /><View><Text style={[styles.summaryValue, { color: colors.success }]}>{roster.filter((item) => item.attendance?.status === 'PRESENT').length}</Text><Text style={styles.summaryLabel}>Present</Text></View><View style={styles.divider} /><View><Text style={[styles.summaryValue, { color: colors.danger }]}>{roster.filter((item) => item.attendance?.status === 'ABSENT').length}</Text><Text style={styles.summaryLabel}>Absent</Text></View></View>
    <View style={styles.search}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search student…" placeholderTextColor="#98A2B3" style={styles.searchInput} /></View>
    <FlatList data={filtered} keyExtractor={(item) => item.student.id} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list} refreshing={detail.loading || saveState.loading} onRefresh={detail.refetch} renderItem={({ item, index }) => <View style={[styles.row, index > 0 && styles.border]}><Text style={styles.index}>{index + 1}</Text><Avatar name={item.student.fullName} size={40} /><View style={styles.copy}><Text style={styles.name}>{item.student.fullName}</Text><Text style={styles.id}>ID: {item.student.studentNo}</Text></View><AttendanceStatusPicker student={item.student} status={item.attendance?.status} reason={item.attendance?.reason} saving={saveState.loading} onSelect={(status, reason) => void update(item.student.id, status, reason)} /></View>} />
  </View>;
};

const formatDateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  context: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, padding: 10, borderRadius: 12, gap: 10, backgroundColor: colors.primarySoft },
  contextIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  contextTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  contextHelp: { color: colors.muted, fontSize: 10, marginTop: 2 },
  dateBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10 },
  dateArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dateCopy: { flex: 1, alignItems: 'center' },
  dateLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  dateHint: { color: colors.muted, fontSize: 9, marginTop: 2 },
  summary: { margin: 16, padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  summaryValue: { color: colors.text, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  summaryLabel: { color: colors.muted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  divider: { width: 1, height: 38, backgroundColor: colors.border },
  search: { marginHorizontal: 16, marginBottom: 10, height: 43, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderRadius: 12, backgroundColor: '#EEF1F6' },
  searchInput: { flex: 1, color: colors.text, marginLeft: 8 },
  list: { marginHorizontal: 16, paddingHorizontal: 13, paddingBottom: 30, backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.border },
  row: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10 },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  index: { color: colors.muted, width: 15, fontSize: 11, textAlign: 'center' },
  copy: { flex: 1 },
  name: { color: colors.text, fontSize: 13, fontWeight: '700' },
  id: { color: colors.muted, fontSize: 10, marginTop: 3 },
});
