import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, ErrorState, LoadingState, ScreenHeader } from '@/shared/components/ui';
import { CLASS_DETAIL_QUERY } from '../graphql/queries/getClassDetail';
import { SET_ATTENDANCE_MUTATION } from '@/features/attendance/graphql/mutations/attendanceMutations';
import { colors } from '@/core/theme';
import { Classroom, RosterStudent, Student } from '@/core/types';
import { MOBILE_ME_QUERY } from '@/features/auth/graphql/queries';
import { ADD_STUDENT_TO_CLASS_MUTATION } from '@/features/students/graphql/mutations/addStudentToClass';
import { IMPORT_TEACHER_STUDENTS_MUTATION } from '@/features/students/graphql/mutations/manageStudents';
import { STUDENTS_QUERY } from '@/features/students/graphql/queries/getStudents';

type Detail = { classDetail: { classroom: Classroom; roster: RosterStudent[] } };

const ClassDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const date = new Date().toISOString().slice(0, 10);
  const { data, loading, error, refetch } = useQuery<Detail>(CLASS_DETAIL_QUERY, { variables: { id, date, quarter: 1 }, skip: !id });
  const [setAttendance, { loading: saving }] = useMutation(SET_ATTENDANCE_MUTATION);
  const { data: account } = useQuery<{ me: { isIndependent: boolean } }>(MOBILE_ME_QUERY);
  const filtered = data?.classDetail.roster.filter(({ student }) => student.fullName.toLowerCase().includes(search.toLowerCase()) || student.studentNo.includes(search)) ?? [];

  const update = async (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    try {
      await setAttendance({ variables: { classroomId: id, studentId, date, status }, refetchQueries: [{ query: CLASS_DETAIL_QUERY, variables: { id, date, quarter: 1 } }] });
    } catch (mutationError) { Alert.alert('Attendance not saved', mutationError instanceof Error ? mutationError.message : 'Try again.'); }
  }

  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <ScreenHeader title={data?.classDetail.classroom.subject ?? 'Class list'} subtitle={data ? `${data.classDetail.classroom.gradeLevel === 0 ? 'Kindergarten' : `Grade/Year ${data.classDetail.classroom.gradeLevel}`} · ${data.classDetail.classroom.section}` : undefined} onBack={router.back} action={account?.me.isIndependent ? <Pressable accessibilityLabel="Add students" onPress={() => setAddingStudent(true)}><Ionicons name="person-add-outline" size={23} color={colors.primary} /></Pressable> : undefined} />
    {loading && !data ? <LoadingState /> : error && !data ? <ErrorState message={error.message} retry={refetch} /> : <>
      <View style={styles.summary}><View><Text style={styles.summaryValue}>{data!.classDetail.roster.length}</Text><Text style={styles.summaryLabel}>Students</Text></View><View style={styles.summaryDivider} /><View><Text style={[styles.summaryValue, { color: colors.success }]}>{data!.classDetail.roster.filter((x) => x.attendance?.status === 'PRESENT').length}</Text><Text style={styles.summaryLabel}>Present today</Text></View><Pressable onPress={() => router.push(`/grades/${id}`)} style={styles.gradeButton}><Ionicons name="create-outline" size={17} color="#fff" /><Text style={styles.gradeButtonText}>Grades</Text></Pressable></View>
      <View style={styles.search}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search student…" placeholderTextColor="#98A2B3" style={styles.input} /></View>
      <FlatList data={filtered} keyExtractor={(item) => item.student.id} contentContainerStyle={styles.list} refreshing={loading || saving} onRefresh={refetch}
        renderItem={({ item, index }) => <View style={[styles.row, index > 0 && styles.border]}><Text style={styles.index}>{index + 1}</Text><Pressable onPress={() => router.push(`/student/${item.student.id}`)}><Avatar name={item.student.fullName} size={40} /></Pressable><Pressable onPress={() => router.push(`/student/${item.student.id}`)} style={styles.copy}><Text style={styles.name}>{item.student.fullName}</Text><Text style={styles.id}>ID: {item.student.studentNo}</Text></Pressable><View style={styles.markButtons}><Pressable accessibilityLabel="Mark present" onPress={() => update(item.student.id, 'PRESENT')} style={[styles.present, item.attendance?.status === 'PRESENT' && { borderWidth: 2, borderColor: colors.success }]}><Ionicons name="checkmark" size={17} color={colors.success} /></Pressable><Pressable accessibilityLabel="Mark absent" onPress={() => update(item.student.id, 'ABSENT')} style={[styles.absent, item.attendance?.status === 'ABSENT' && { borderWidth: 2, borderColor: colors.danger }]}><Ionicons name="close" size={17} color={colors.danger} /></Pressable></View></View>} />
    </>}
    {id && <AddStudentModal visible={addingStudent} classroomId={id} enrolledStudentIds={data?.classDetail.roster.map(({ student }) => student.id) ?? []} close={() => setAddingStudent(false)} completed={async () => { setAddingStudent(false); await refetch(); }} />}
  </View>;
}

export default ClassDetailScreen;

const pickerStyles = StyleSheet.create({
  modeTabs: { flexDirection: 'row', padding: 3, borderRadius: 11, backgroundColor: colors.background, marginBottom: 10 },
  modeTab: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modeTabActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  modeTextActive: { color: colors.primary },
  directorySearch: { height: 43, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: colors.border, marginTop: 3 },
  directorySearchInput: { flex: 1, color: colors.text, marginLeft: 8 },
  selectionToolbar: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 },
  selectionCount: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  selectAll: { color: colors.primary, fontSize: 11, fontWeight: '800', paddingVertical: 8 },
  studentChoices: { maxHeight: 330, marginTop: 9 },
  studentChoice: { minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 5 },
  studentChoiceSelected: { backgroundColor: colors.primarySoft },
  choiceCopy: { flex: 1 },
  choiceName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  choiceId: { color: colors.muted, fontSize: 10, marginTop: 2 },
  noAvailable: { color: colors.muted, textAlign: 'center', lineHeight: 19, paddingVertical: 30, paddingHorizontal: 12 },
});

const AddStudentModal = ({ visible, classroomId, enrolledStudentIds, close, completed }: { visible: boolean; classroomId: string; enrolledStudentIds: string[]; close: () => void; completed: () => Promise<void> }) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [directorySearch, setDirectorySearch] = useState('');
  const [values, setValues] = useState({ studentNo: '', firstName: '', lastName: '', email: '' });
  const directory = useQuery<{ students: Student[] }>(STUDENTS_QUERY, { variables: { search: null }, skip: !visible });
  const [add, addState] = useMutation(ADD_STUDENT_TO_CLASS_MUTATION);
  const [enroll, enrollState] = useMutation(IMPORT_TEACHER_STUDENTS_MUTATION);
  const enrolled = new Set(enrolledStudentIds);
  const available = (directory.data?.students ?? []).filter((student) => !enrolled.has(student.id) && (student.fullName.toLowerCase().includes(directorySearch.toLowerCase()) || student.studentNo.toLowerCase().includes(directorySearch.toLowerCase())));
  const availableIds = available.map((student) => student.id);
  const allAvailableSelected = availableIds.length > 0 && availableIds.every((id) => selectedIds.includes(id));
  const selectedStudents = (directory.data?.students ?? []).filter((student) => selectedIds.includes(student.id));

  const toggleStudent = (studentId: string) => setSelectedIds(selectedIds.includes(studentId) ? selectedIds.filter((id) => id !== studentId) : [...selectedIds, studentId]);
  const toggleAll = () => setSelectedIds(allAvailableSelected ? selectedIds.filter((id) => !availableIds.includes(id)) : [...new Set([...selectedIds, ...availableIds])]);
  const finish = async () => {
    setSelectedIds([]);
    setDirectorySearch('');
    setValues({ studentNo: '', firstName: '', lastName: '', email: '' });
    await completed();
  };
  const enrollSelected = async () => {
    try {
      await enroll({ variables: { inputs: selectedStudents.map((student) => ({ studentNo: student.studentNo, firstName: student.firstName, lastName: student.lastName, email: student.email, classroomIds: [classroomId] })) } });
      await finish();
    } catch (error) { Alert.alert('Students not added', error instanceof Error ? error.message : 'Try again.'); }
  };
  const saveNew = async () => {
    try {
      await add({ variables: { input: { classroomId, ...values, email: values.email || undefined } } });
      await finish();
    } catch (error) { Alert.alert('Student not added', error instanceof Error ? error.message : 'Try again.'); }
  };
  const newStudentDisabled = addState.loading || !values.studentNo.trim() || !values.firstName.trim() || !values.lastName.trim();

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><View style={styles.backdrop}><View style={[styles.modalCard, { maxHeight: '90%' }]}><View style={styles.modalHead}><View><Text style={styles.modalTitle}>Add students</Text><Text style={styles.modalHelp}>Select existing students or create a new student.</Text></View><Pressable onPress={close}><Ionicons name="close" size={25} color={colors.text} /></Pressable></View>
    <View style={pickerStyles.modeTabs}><Pressable onPress={() => setMode('existing')} style={[pickerStyles.modeTab, mode === 'existing' && pickerStyles.modeTabActive]}><Text style={[pickerStyles.modeText, mode === 'existing' && pickerStyles.modeTextActive]}>Existing students</Text></Pressable><Pressable onPress={() => setMode('new')} style={[pickerStyles.modeTab, mode === 'new' && pickerStyles.modeTabActive]}><Text style={[pickerStyles.modeText, mode === 'new' && pickerStyles.modeTextActive]}>Create new</Text></Pressable></View>
    {mode === 'existing' ? <>
      <View style={pickerStyles.directorySearch}><Ionicons name="search" size={17} color={colors.muted} /><TextInput value={directorySearch} onChangeText={setDirectorySearch} placeholder="Search student directory" placeholderTextColor="#98A2B3" style={pickerStyles.directorySearchInput} /></View>
      <View style={pickerStyles.selectionToolbar}><Text style={pickerStyles.selectionCount}>{selectedIds.length} selected</Text><Pressable disabled={!available.length} onPress={toggleAll}><Text style={[pickerStyles.selectAll, !available.length && { opacity: .4 }]}>{allAvailableSelected ? 'Clear visible' : directorySearch ? 'Select all results' : 'Select all'}</Text></Pressable></View>
      <ScrollView style={pickerStyles.studentChoices} keyboardShouldPersistTaps="handled">{directory.loading ? <LoadingState /> : available.length ? available.map((student) => <Pressable key={student.id} onPress={() => toggleStudent(student.id)} style={[pickerStyles.studentChoice, selectedIds.includes(student.id) && pickerStyles.studentChoiceSelected]}><Ionicons name={selectedIds.includes(student.id) ? 'checkbox' : 'square-outline'} size={21} color={selectedIds.includes(student.id) ? colors.primary : colors.muted} /><Avatar name={student.fullName} size={35} /><View style={pickerStyles.choiceCopy}><Text style={pickerStyles.choiceName}>{student.fullName}</Text><Text style={pickerStyles.choiceId}>ID: {student.studentNo}</Text></View></Pressable>) : <Text style={pickerStyles.noAvailable}>{directorySearch ? 'No matching students are available.' : 'Every student in your directory is already in this class.'}</Text>}</ScrollView>
      <Pressable disabled={enrollState.loading || !selectedIds.length} onPress={enrollSelected} style={[styles.modalSave, (enrollState.loading || !selectedIds.length) && { opacity: .5 }]}><Text style={styles.gradeButtonText}>{enrollState.loading ? 'Adding…' : `Add selected (${selectedIds.length})`}</Text></Pressable>
    </> : <>
      <TextInput value={values.studentNo} onChangeText={(studentNo) => setValues({ ...values, studentNo })} placeholder="Student number" placeholderTextColor="#98A2B3" style={styles.modalInput} />
      <TextInput value={values.firstName} onChangeText={(firstName) => setValues({ ...values, firstName })} placeholder="First name" placeholderTextColor="#98A2B3" style={styles.modalInput} />
      <TextInput value={values.lastName} onChangeText={(lastName) => setValues({ ...values, lastName })} placeholder="Last name" placeholderTextColor="#98A2B3" style={styles.modalInput} />
      <TextInput value={values.email} onChangeText={(email) => setValues({ ...values, email })} placeholder="Email (optional)" placeholderTextColor="#98A2B3" autoCapitalize="none" keyboardType="email-address" style={styles.modalInput} />
      <Pressable disabled={newStudentDisabled} onPress={saveNew} style={[styles.modalSave, newStudentDisabled && { opacity: .5 }]}><Text style={styles.gradeButtonText}>{addState.loading ? 'Adding…' : 'Create and add student'}</Text></Pressable>
    </>}
  </View></View></Modal>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, summary: { margin: 16, padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, summaryValue: { color: colors.text, fontSize: 19, fontWeight: '800' }, summaryLabel: { color: colors.muted, fontSize: 10, marginTop: 2 }, summaryDivider: { width: 1, height: 38, backgroundColor: colors.border, marginHorizontal: 18 }, gradeButton: { marginLeft: 'auto', backgroundColor: colors.primary, height: 38, borderRadius: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 5 }, gradeButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 }, search: { marginHorizontal: 16, marginBottom: 10, height: 43, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderRadius: 12, backgroundColor: '#EEF1F6' }, input: { flex: 1, color: colors.text, marginLeft: 8 }, list: { marginHorizontal: 16, paddingHorizontal: 13, paddingBottom: 30, backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.border }, row: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10 }, border: { borderTopWidth: 1, borderTopColor: colors.border }, index: { color: colors.muted, width: 15, fontSize: 11, textAlign: 'center' }, copy: { flex: 1 }, name: { color: colors.text, fontSize: 13, fontWeight: '700' }, id: { color: colors.muted, fontSize: 10, marginTop: 3 }, markButtons: { flexDirection: 'row', gap: 5 }, present: { width: 31, height: 31, borderRadius: 9, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' }, absent: { width: 31, height: 31, borderRadius: 9, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }, backdrop: { flex: 1, backgroundColor: '#0B193099', justifyContent: 'flex-end' }, modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, modalTitle: { color: colors.text, fontSize: 21, fontWeight: '800' }, modalHelp: { color: colors.muted, fontSize: 12, marginTop: 4 }, modalInput: { height: 47, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, color: colors.text, marginTop: 10 }, modalSave: { height: 49, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 } });
