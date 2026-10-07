import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/core/theme';
import { Classroom, StudentGroup } from '@/core/types';
import { Avatar, Card, EmptyState, ErrorState, LoadingState, ScreenHeader } from '@/shared/components/ui';
import { saveAutoSizedWorkbook } from '@/shared/utils/spreadsheetExport';
import { STUDENT_GROUPS_QUERY } from '../graphql/queries/getStudents';
import { ImportModal, StudentModal } from './StudentsScreen';
import { CreateClassModal } from '@/features/classes/screens/ClassesScreen';
import { createGroupSummaryCsv, groupSummaryFileName } from '../utils/groupSummaryCsv';
import { GroupAdviserControl } from '../components';
import { AppMessageModal, showAppBanner } from '@/shared/components/feedback';
import { DELETE_CLASS_MUTATION, DELETE_STUDENT_GROUP_MUTATION, REMOVE_STUDENT_FROM_GROUP_MUTATION } from '../graphql/mutations/deleteGroup';

type Tab = 'overview' | 'classes' | 'students';

const StudentGroupScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('overview');
  const [modal, setModal] = useState<'add' | 'import' | 'class'>();
  const [downloading, setDownloading] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; fullName: string }>();
  const [classToDelete, setClassToDelete] = useState<Classroom>();
  const [deletingSection, setDeletingSection] = useState(false);
  const { data, loading, error, refetch } = useQuery<{ studentGroups: StudentGroup[] }>(STUDENT_GROUPS_QUERY, { fetchPolicy: 'network-only' });
  const [removeStudentFromGroup, removeState] = useMutation<{ removeStudentFromGroup: boolean }>(REMOVE_STUDENT_FROM_GROUP_MUTATION);
  const [deleteClass, deleteClassState] = useMutation<{ deleteClass: boolean }>(DELETE_CLASS_MUTATION);
  const [deleteStudentGroup, deleteSectionState] = useMutation<{ deleteStudentGroup: boolean }>(DELETE_STUDENT_GROUP_MUTATION);
  const group = data?.studentGroups.find((item) => item.id === id);
  if (loading && !group) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="Section" onBack={router.back} /><LoadingState /></View>;
  if (error || !group) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="Section" onBack={router.back} /><ErrorState message={error?.message ?? 'This section is unavailable.'} retry={refetch} /></View>;
  const classroomIds = group.classes.map((item) => item.id);
  const downloadSummary = async () => {
    if (Platform.OS !== 'android') { Alert.alert('Android download only', 'Direct folder saving is currently available on Android.'); return; }
    setDownloading(true);
    try {
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return;
      const fileName = await saveAutoSizedWorkbook(permission.directoryUri, groupSummaryFileName(group), createGroupSummaryCsv(group), 'Section summary');
      Alert.alert('Summary downloaded', `${fileName} was saved to the folder you selected.`);
    } catch (downloadError) { Alert.alert('Summary not downloaded', downloadError instanceof Error ? downloadError.message : 'Try again.'); }
    finally { setDownloading(false); }
  };
  const removeStudent = async () => {
    if (!studentToRemove) return;
    try {
      await removeStudentFromGroup({ variables: { groupId: group.id, studentId: studentToRemove.id } });
      const studentName = studentToRemove.fullName;
      setStudentToRemove(undefined);
      await refetch();
      showAppBanner('Student removed', `${studentName} was removed from this section.`, 'success');
    } catch (removeError) {
      showAppBanner('Could not remove student', removeError instanceof Error ? removeError.message : 'Please try again.', 'danger');
    }
  };
  const removeClass = async () => {
    if (!classToDelete) return;
    try {
      const className = classToDelete.subject;
      await deleteClass({ variables: { classroomId: classToDelete.id } });
      setClassToDelete(undefined);
      await refetch();
      showAppBanner('Class deleted', `${className} was removed from this section.`, 'success');
    } catch (deleteError) {
      showAppBanner('Could not delete class', deleteError instanceof Error ? deleteError.message : 'Please try again.', 'danger');
    }
  };
  const removeSection = async () => {
    try {
      await deleteStudentGroup({ variables: { groupId: group.id } });
      setDeletingSection(false);
      showAppBanner('Section deleted', `${group.displayName} and its classes were deleted.`, 'success');
      router.back();
    } catch (deleteError) {
      showAppBanner('Could not delete section', deleteError instanceof Error ? deleteError.message : 'Please try again.', 'danger');
    }
  };
  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <ScreenHeader title={group.displayName} subtitle="Section profile" onBack={router.back} />
    <View style={styles.actions}>
      <Action icon="cloud-upload-outline" label="Import" onPress={() => setModal('import')} />
      <Action icon="download-outline" label={downloading ? 'Saving…' : 'Excel summary'} disabled={downloading} onPress={() => void downloadSummary()} />
      <Action icon="book-outline" label="Add class" onPress={() => setModal('class')} />
      <Action icon="person-add-outline" label="Add student" onPress={() => setModal('add')} />
    </View>
    <View style={styles.tabs}>{(['overview', 'classes', 'students'] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item[0]!.toUpperCase() + item.slice(1)}</Text></Pressable>)}</View>
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {tab === 'overview' && <>
        <Card><Text style={styles.cardTitle}>Section information</Text><Info label="Grade/Year level" value={group.gradeLevel === 0 ? 'Kindergarten' : String(group.gradeLevel)} /><Info label="Section" value={group.section} /><Info label="Your role" value={group.isAdvisory ? 'Class adviser' : 'Subject teacher'} /><Info label="School year" value={group.schoolYear} /><Info label="Term" value={group.term} /><Info label="Total students" value={String(group.studentCount)} />{['KINDERGARTEN', 'ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'].includes(group.educationLevel) && <GroupAdviserControl group={group} refresh={() => refetch()} />}{group.isAdvisory && <Pressable onPress={() => router.push(`/section/${group.id}/attendance` as never)} style={styles.attendanceAction}><Ionicons name="calendar-outline" size={17} color="#fff" /><Text style={styles.attendanceActionText}>Section attendance</Text></Pressable>}</Card>
        <Pressable onPress={() => setDeletingSection(true)} style={styles.deleteSection}><Ionicons name="trash-outline" size={18} color={colors.danger} /><Text style={styles.deleteSectionText}>Delete section</Text></Pressable>
      </>}
      {tab === 'classes' && (group.classes.length ? <Card style={styles.classesCard}>{group.classes.map((room, index) => <View key={room.id} style={[styles.classRow, index > 0 && styles.border]}><Pressable onPress={() => router.push(`/class/${room.id}`)} style={styles.classOpen}><View style={styles.subjectIcon}><Ionicons name="book" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.subject}>{room.subject}</Text><Text style={styles.meta}>{room.scheduleDay.split(',').join(', ')} · {formatTime(room.startTime)}–{formatTime(room.endTime)}</Text><Text style={styles.meta}>{room.room} · {room.studentCount} student{room.studentCount === 1 ? '' : 's'}</Text></View></Pressable><Pressable accessibilityLabel={`Delete ${room.subject}`} onPress={() => setClassToDelete(room)} hitSlop={8} style={styles.removeClass}><Ionicons name="trash-outline" size={18} color={colors.danger} /></Pressable></View>)}</Card> : <EmptyState title="No classes yet" detail="Add the section's first subject class to set its schedule." />)}
      {tab === 'students' && (group.students.length ? <Card style={styles.studentsCard}>{group.students.map((student, index) => <View key={student.id} style={[styles.studentRow, index > 0 && styles.border]}><Pressable onPress={() => router.push(`/student/${student.id}`)} style={styles.studentOpen}><Avatar name={student.fullName} size={40} /><View style={{ flex: 1 }}><Text style={styles.subject}>{student.fullName}</Text><Text style={styles.meta}>ID: {student.studentNo}</Text></View></Pressable><Pressable accessibilityLabel={`Remove ${student.fullName} from section`} onPress={() => setStudentToRemove({ id: student.id, fullName: student.fullName })} hitSlop={8} style={styles.removeStudent}><Ionicons name="trash-outline" size={18} color={colors.danger} /></Pressable></View>)}</Card> : <EmptyState title="No students yet" detail="Add or import students to create this section's roster." />)}
    </ScrollView>
    <StudentModal visible={modal === 'add'} groupId={group.id} classes={group.classes} initialClassroomIds={classroomIds} close={() => setModal(undefined)} completed={async () => { setModal(undefined); await refetch(); }} />
    <ImportModal visible={modal === 'import'} groupId={group.id} classes={group.classes} initialClassroomIds={classroomIds} close={() => setModal(undefined)} completed={async (count) => { setModal(undefined); await refetch(); Alert.alert('Import complete', `${count} student${count === 1 ? '' : 's'} imported.`); }} />
    <CreateClassModal visible={modal === 'class'} group={group} close={() => setModal(undefined)} completed={async () => { setModal(undefined); await refetch(); }} />
    <AppMessageModal visible={deletingSection} title="Delete section?" message={`This deletes ${group.displayName}, its subject classes, attendance, grades, and section-only students. Students used in another section or class will be kept.`} confirmLabel="Delete section" variant="danger" busy={deleteSectionState.loading} onCancel={() => setDeletingSection(false)} onConfirm={() => void removeSection()} />
    <AppMessageModal visible={Boolean(classToDelete)} title="Delete class?" message={`${classToDelete?.subject ?? 'This class'} and its class-specific attendance, grades, and reports will be deleted. Students remain in this section.`} confirmLabel="Delete class" variant="danger" busy={deleteClassState.loading} onCancel={() => setClassToDelete(undefined)} onConfirm={() => void removeClass()} />
    <AppMessageModal visible={Boolean(studentToRemove)} title="Remove student?" message={`${studentToRemove?.fullName ?? 'This student'} will be removed from this section and its subject classes. The student is kept if they belong to another section or class.`} confirmLabel="Remove student" variant="danger" busy={removeState.loading} onCancel={() => setStudentToRemove(undefined)} onConfirm={() => void removeStudent()} />
  </View>;
};

export default StudentGroupScreen;

const Action = ({ icon, label, onPress, disabled = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) => <Pressable disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.actionDisabled]}><Ionicons name={icon} size={20} color={colors.primary} /><Text style={styles.actionText}>{label}</Text></Pressable>;
const Info = ({ label, value }: { label: string; value: string }) => <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
const formatTime = (time: string) => { const [hours, minutes] = time.split(':'); const hour = Number(hours); return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`; };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  actions: { flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingBottom: 10 },
  action: { flex: 1, height: 55, borderRadius: 11, borderWidth: 1, borderColor: '#BBD2F8', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  actionDisabled: { opacity: .55 },
  actionText: { color: colors.primary, fontSize: 8, fontWeight: '700', marginTop: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: colors.primary, fontWeight: '800' },
  content: { padding: 14, paddingBottom: 35, gap: 10 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  attendanceAction: { minHeight: 42, marginTop: 10, borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  attendanceActionText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  deleteSection: { minHeight: 46, borderWidth: 1, borderColor: colors.dangerSoft, borderRadius: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8 },
  deleteSectionText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  info: { flexDirection: 'row', paddingVertical: 5 },
  infoLabel: { flex: 1, color: colors.muted, fontSize: 11 },
  infoValue: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '600' },
  section: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 8 },
  classesCard: { paddingVertical: 0 },
  classRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10 },
  classOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  removeClass: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
  studentsCard: { paddingVertical: 0 },
  studentRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  removeStudent: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  subjectIcon: { width: 35, height: 35, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  subject: { color: colors.text, fontSize: 12, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 9, marginTop: 3 },
});
