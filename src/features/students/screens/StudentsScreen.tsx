import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, EmptyState, ErrorState, LoadingState } from '@/shared/components/ui';
import { STUDENTS_QUERY } from '../graphql/queries/getStudents';
import { CLASSES_QUERY } from '@/features/classes/graphql/queries/getClasses';
import { MOBILE_ME_QUERY } from '@/features/auth/graphql/queries';
import { IMPORT_TEACHER_STUDENTS_MUTATION, SAVE_TEACHER_STUDENT_MUTATION } from '../graphql/mutations/manageStudents';
import { colors } from '@/core/theme';
import { Classroom, Student } from '@/core/types';

const StudentsScreen = () => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'import'>();
  const { data, loading, error, refetch } = useQuery<{ students: Student[] }>(STUDENTS_QUERY, { variables: { search: search || null } });
  const { data: classesData } = useQuery<{ classes: Classroom[] }>(CLASSES_QUERY);
  const { data: account } = useQuery<{ me: { isIndependent: boolean } }>(MOBILE_ME_QUERY);
  const classes = classesData?.classes ?? [];
  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <View style={styles.heading}><View><Text style={styles.eyebrow}>DIRECTORY</Text><Text style={styles.title}>Students</Text></View>{account?.me.isIndependent && <View style={styles.headingActions}><Pressable accessibilityLabel="Import CSV" onPress={() => setModal('import')} style={styles.secondaryAction}><Ionicons name="document-attach-outline" size={18} color={colors.primary} /><Text style={styles.secondaryActionText}>Import CSV</Text></Pressable><Pressable accessibilityLabel="Add student" onPress={() => setModal('add')} style={styles.primaryAction}><Ionicons name="person-add-outline" size={19} color="#fff" /></Pressable></View>}</View>
    <View style={styles.search}><Ionicons name="search" size={19} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search name or student ID" placeholderTextColor="#98A2B3" style={styles.searchInput} autoCorrect={false} /></View>
    {loading && !data ? <LoadingState /> : error && !data ? <ErrorState message={error.message} retry={refetch} /> :
      <FlatList data={data?.students} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" onRefresh={refetch} refreshing={loading}
        ListEmptyComponent={<EmptyState title="No students yet" detail="Add a student here, or import a CSV file and assign the students to classes." />}
        renderItem={({ item, index }) => <Pressable onPress={() => router.push(`/student/${item.id}`)} style={[styles.row, index === 0 && styles.first]}><Avatar name={item.fullName} /><View style={styles.copy}><Text style={styles.name}>{item.fullName}</Text><Text style={styles.id}>ID: {item.studentNo}</Text></View><Ionicons name="chevron-forward" size={20} color="#ABB5C3" /></Pressable>} />}
    <StudentModal visible={modal === 'add'} classes={classes} close={() => setModal(undefined)} completed={async () => { setModal(undefined); await refetch(); }} />
    <ImportModal visible={modal === 'import'} classes={classes} close={() => setModal(undefined)} completed={async (count) => { setModal(undefined); await refetch(); Alert.alert('Import complete', `${count} student${count === 1 ? '' : 's'} imported.`); }} />
  </View>;
}

export default StudentsScreen;

const StudentModal = ({ visible, classes, close, completed }: { visible: boolean; classes: Classroom[]; close: () => void; completed: () => Promise<void> }) => {
  const [values, setValues] = useState({ studentNo: '', firstName: '', lastName: '', email: '' });
  const [classroomIds, setClassroomIds] = useState<string[]>([]);
  const [save, state] = useMutation(SAVE_TEACHER_STUDENT_MUTATION);
  const toggle = (id: string) => setClassroomIds(classroomIds.includes(id) ? classroomIds.filter((value) => value !== id) : [...classroomIds, id]);
  const submit = async () => {
    try {
      await save({ variables: { input: { ...values, email: values.email || undefined, classroomIds } } });
      setValues({ studentNo: '', firstName: '', lastName: '', email: '' });
      setClassroomIds([]);
      await completed();
    }
    catch (error) { Alert.alert('Student not saved', error instanceof Error ? error.message : 'Try again.'); }
  }
  const disabled = state.loading || !values.studentNo.trim() || !values.firstName.trim() || !values.lastName.trim();
  return <Sheet visible={visible} title="Add student" subtitle="Select any number of classes, or assign classes later." close={close}><TextInput value={values.studentNo} onChangeText={(studentNo) => setValues({ ...values, studentNo })} placeholder="Student number" placeholderTextColor="#98A2B3" style={styles.input} /><TextInput value={values.firstName} onChangeText={(firstName) => setValues({ ...values, firstName })} placeholder="First name" placeholderTextColor="#98A2B3" style={styles.input} /><TextInput value={values.lastName} onChangeText={(lastName) => setValues({ ...values, lastName })} placeholder="Last name" placeholderTextColor="#98A2B3" style={styles.input} /><TextInput value={values.email} onChangeText={(email) => setValues({ ...values, email })} placeholder="Email (optional)" placeholderTextColor="#98A2B3" keyboardType="email-address" autoCapitalize="none" style={styles.input} /><Text style={styles.label}>Assign to classes</Text><ClassChoices classes={classes} selected={classroomIds} toggle={toggle} /><Pressable disabled={disabled} onPress={submit} style={[styles.save, disabled && styles.disabled]}><Text style={styles.saveText}>{state.loading ? 'Saving…' : 'Save student'}</Text></Pressable></Sheet>;
}

const ImportModal = ({ visible, classes, close, completed }: { visible: boolean; classes: Classroom[]; close: () => void; completed: (count: number) => Promise<void> }) => {
  const [classroomIds, setClassroomIds] = useState<string[]>([]);
  const [importStudents, state] = useMutation(IMPORT_TEACHER_STUDENTS_MUTATION);
  const toggle = (id: string) => setClassroomIds(classroomIds.includes(id) ? classroomIds.filter((value) => value !== id) : [...classroomIds, id]);
  const chooseFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
      if (picked.canceled) return;
      const contents = await FileSystem.readAsStringAsync(picked.assets[0]!.uri);
      const rows = parseStudentsCsv(contents);
      const result = await importStudents({ variables: { inputs: rows.map((row) => ({ ...row, classroomIds })) } });
      await completed(result.data?.importTeacherStudents.count ?? rows.length);
    } catch (error) { Alert.alert('CSV import failed', error instanceof Error ? error.message : 'Check the file and try again.'); }
  }
  return <Sheet visible={visible} title="Import students" subtitle="Choose the classes once, then import all rows from a CSV file." close={close}><View style={styles.csvHint}><Text style={styles.csvTitle}>Required header</Text><Text style={styles.csvCode}>studentNo,firstName,lastName,email</Text><Text style={styles.csvNote}>Email may be blank. Student numbers must be unique in the file.</Text></View><Text style={styles.label}>Assign every imported student to</Text><ClassChoices classes={classes} selected={classroomIds} toggle={toggle} /><Pressable disabled={state.loading} onPress={chooseFile} style={styles.save}><Ionicons name="document-attach-outline" size={18} color="#fff" /><Text style={styles.saveText}>{state.loading ? 'Importing…' : 'Choose CSV file'}</Text></Pressable></Sheet>;
}

const ClassChoices = ({ classes, selected, toggle }: { classes: Classroom[]; selected: string[]; toggle: (id: string) => void }) => {
  if (!classes.length) return <Text style={styles.emptyClasses}>No classes yet. Students can still be added and assigned later.</Text>;
  return <View style={styles.choices}>{classes.map((room) => <Pressable key={room.id} onPress={() => toggle(room.id)} style={[styles.choice, selected.includes(room.id) && styles.choiceSelected]}><Ionicons name={selected.includes(room.id) ? 'checkbox' : 'square-outline'} size={20} color={selected.includes(room.id) ? colors.primary : colors.muted} /><View style={{ flex: 1 }}><Text style={styles.choiceTitle}>{room.subject}</Text><Text style={styles.choiceMeta}>{room.gradeLevel === 0 ? 'Kindergarten' : `Grade/Year ${room.gradeLevel}`} · {room.section}</Text></View></Pressable>)}</View>;
}

const Sheet = ({ visible, title, subtitle, close, children }: { visible: boolean; title: string; subtitle: string; close: () => void; children: React.ReactNode }) => {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.sheetHead}><View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{title}</Text><Text style={styles.sheetSubtitle}>{subtitle}</Text></View><Pressable onPress={close}><Ionicons name="close" size={25} color={colors.text} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView></View></View></Modal>;
}

const parseStudentsCsv = (contents: string) => {
  const lines = contents.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('The CSV file has no student rows.');
  const table = lines.map(parseCsvLine);
  const headers = table[0]!.map((value) => value.trim().toLowerCase());
  const indexes = { studentNo: headers.indexOf('studentno'), firstName: headers.indexOf('firstname'), lastName: headers.indexOf('lastname'), email: headers.indexOf('email') };
  if (indexes.studentNo < 0 || indexes.firstName < 0 || indexes.lastName < 0) throw new Error('Use the header: studentNo,firstName,lastName,email');
  return table.slice(1).map((row, index) => {
    const studentNo = row[indexes.studentNo]?.trim() ?? '';
    const firstName = row[indexes.firstName]?.trim() ?? '';
    const lastName = row[indexes.lastName]?.trim() ?? '';
    if (!studentNo || !firstName || !lastName) throw new Error(`Row ${index + 2} is missing a required value.`);
    return { studentNo, firstName, lastName, email: indexes.email >= 0 ? row[indexes.email]?.trim() || undefined : undefined };
  });
}

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { values.push(value); value = ''; }
    else value += character;
  }
  values.push(value);
  return values;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, heading: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headingActions: { flexDirection: 'row', gap: 8 }, secondaryAction: { height: 42, paddingHorizontal: 11, gap: 6, flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderColor: '#BBD2F8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }, secondaryActionText: { color: colors.primary, fontWeight: '800', fontSize: 11 }, primaryAction: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' }, title: { fontSize: 27, fontWeight: '800', color: colors.text, marginTop: 2 }, search: { marginHorizontal: 16, marginBottom: 13, height: 46, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, searchInput: { flex: 1, marginLeft: 9, color: colors.text, fontSize: 14 }, list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingBottom: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, row: { minHeight: 69, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border }, first: { borderTopWidth: 0 }, copy: { flex: 1, marginLeft: 12 }, name: { color: colors.text, fontWeight: '700', fontSize: 14 }, id: { color: colors.muted, fontSize: 11, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: '#0B193099', justifyContent: 'flex-end' }, sheet: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }, sheetHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }, sheetTitle: { color: colors.text, fontSize: 21, fontWeight: '800' }, sheetSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4, paddingRight: 12 }, input: { height: 47, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, color: colors.text, marginTop: 10 }, label: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 18, marginBottom: 8 }, choices: { gap: 7 }, choice: { minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 11, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }, choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, choiceTitle: { color: colors.text, fontWeight: '700', fontSize: 12 }, choiceMeta: { color: colors.muted, fontSize: 10, marginTop: 3 }, emptyClasses: { color: colors.muted, fontSize: 12, lineHeight: 18, padding: 12, backgroundColor: colors.background, borderRadius: 10 }, save: { height: 49, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginTop: 20 }, saveText: { color: '#fff', fontWeight: '800' }, disabled: { opacity: .5 }, csvHint: { padding: 13, borderRadius: 11, backgroundColor: colors.primarySoft, marginTop: 6 }, csvTitle: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' }, csvCode: { color: colors.primaryDark, fontSize: 11, marginTop: 6 }, csvNote: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
});
