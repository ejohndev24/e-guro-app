import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router as expoRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated as NativeAnimated, Easing, FlatList, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, EmptyState, ErrorState, LoadingState } from '@/shared/components/ui';
import { STUDENT_GROUPS_QUERY } from '../graphql/queries/getStudents';
import { IMPORT_TEACHER_STUDENTS_MUTATION, SAVE_TEACHER_STUDENT_MUTATION } from '../graphql/mutations/manageStudents';
import { CREATE_STUDENT_GROUP_MUTATION } from '../graphql/mutations/createGroup';
import { colors } from '@/core/theme';
import { Classroom, EducationLevel, Student, StudentGroup } from '@/core/types';

const router = expoRouter as { push: (href: string) => void };

const StudentsScreen = () => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'group'>();
  const [expandedId, setExpandedId] = useState<string>();
  const { data, loading, error, refetch } = useQuery<{ studentGroups: StudentGroup[] }>(STUDENT_GROUPS_QUERY, { fetchPolicy: 'cache-and-network' });
  const groups = data?.studentGroups ?? [];
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return groups.flatMap((group) => group.students.filter((student) => student.fullName.toLowerCase().includes(term) || student.studentNo.toLowerCase().includes(term)).map((student) => ({ student, group })));
  }, [groups, search]);
  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <View style={styles.heading}><View><Text style={styles.eyebrow}>TEACHING</Text><Text style={styles.title}>My Sections</Text></View><Pressable accessibilityLabel="Add section" onPress={() => setModal('group')} style={styles.primaryAction}><Ionicons name="add" size={22} color="#fff" /></Pressable></View>
    <View style={styles.search}><Ionicons name="search" size={19} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search name or student ID" placeholderTextColor="#98A2B3" style={styles.searchInput} autoCorrect={false} /></View>
    {loading && !data ? <LoadingState /> : error && !data ? <ErrorState message={error.message} retry={refetch} /> : search.trim() ? <FlatList data={results} keyExtractor={(item) => `${item.group.id}:${item.student.id}`} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchResults} keyboardShouldPersistTaps="handled" ListHeaderComponent={<Text style={styles.resultCount}>Search results ({results.length})</Text>} ListEmptyComponent={<EmptyState title="No matching students" detail="Try another name or student ID." />} renderItem={({ item }) => <Pressable onPress={() => router.push(`/student/${item.student.id}`)} style={styles.searchResult}><Avatar name={item.student.fullName} /><View style={styles.copy}><Text style={styles.name}>{item.student.fullName}</Text><Text style={styles.id}>{item.group.displayName} · ID: {item.student.studentNo}</Text></View><Ionicons name="chevron-forward" size={18} color="#ABB5C3" /></Pressable>} /> : <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupList} refreshControl={undefined}>
      {groups.length ? groups.map((group) => <GroupCard key={group.id} group={group} expanded={expandedId === group.id} toggle={() => setExpandedId(expandedId === group.id ? undefined : group.id)} />) : <EmptyState title="No sections yet" detail="Create a section, then add its subject classes and students." />}
    </ScrollView>}
    <CreateGroupModal visible={modal === 'group'} close={() => setModal(undefined)} completed={async () => { setModal(undefined); await refetch(); }} />
  </View>;
}

const GroupBadge = ({ group }: { group: StudentGroup }) => <View style={styles.groupBadge}><Text style={styles.groupBadgeText}>{group.gradeLevel === 0 ? 'K' : `${group.gradeLevel}${group.section.slice(0, 1).toUpperCase()}`}</Text></View>;

const GroupCard = ({ group, expanded, toggle }: { group: StudentGroup; expanded: boolean; toggle: () => void }) => {
  const open = () => router.push(`/group/${group.id}`);
  return <View style={styles.groupCard}>
    <View style={styles.groupCard}><Pressable onPress={toggle} style={styles.groupHead}><GroupBadge group={group} /><View style={styles.groupCopy}><View style={styles.groupTitleRow}><Text numberOfLines={1} style={styles.groupName}>{group.displayName}</Text></View><View style={styles.groupInfoRow}><Text numberOfLines={1} style={styles.groupMeta}>{group.studentCount} student{group.studentCount === 1 ? '' : 's'} · {group.classes.length} subject{group.classes.length === 1 ? '' : 's'}</Text>{group.isAdvisory && <View style={styles.advisoryBadge}><Ionicons name="school-outline" size={10} color={colors.muted} /><Text style={styles.advisoryText}>Advisory</Text></View>}</View></View><Pressable onPress={open} style={styles.profileButton}><Text style={styles.profileButtonText}>View section</Text></Pressable><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.text} /></Pressable><AnimatedGroupRoster expanded={expanded}><View style={styles.groupStudents}>{group.students.map((student) => <Pressable key={student.id} onPress={() => router.push(`/student/${student.id}`)} style={styles.row}><Avatar name={student.fullName} size={39} /><View style={styles.copy}><Text style={styles.name}>{student.fullName}</Text><Text style={styles.id}>ID: {student.studentNo}</Text></View><Ionicons name="chevron-forward" size={18} color="#ABB5C3" /></Pressable>)}</View></AnimatedGroupRoster></View>
  </View>;
};

const AnimatedGroupRoster = ({ expanded, children }: { expanded: boolean; children: React.ReactNode }) => {
  const [measured, setMeasured] = useState(false);
  const animatedHeight = useRef(new NativeAnimated.Value(0)).current;
  const contentHeight = useRef(0);
  const animateTo = useCallback((height: number) => {
    animatedHeight.stopAnimation();
    NativeAnimated.timing(animatedHeight, { toValue: height, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [animatedHeight]);
  useEffect(() => { if (expanded && contentHeight.current <= 0) return; animateTo(expanded ? contentHeight.current : 0); }, [animateTo, expanded]);
  useEffect(() => () => animatedHeight.stopAnimation(), [animatedHeight]);
  const measure = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (!Number.isFinite(height) || height <= 0 || Math.abs(contentHeight.current - height) < 0.5) return;
    contentHeight.current = height;
    setMeasured(true);
    if (expanded) animatedHeight.setValue(height);
  }, [animatedHeight, expanded]);
  return <NativeAnimated.View accessibilityElementsHidden={!expanded} importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'} pointerEvents={expanded ? 'auto' : 'none'} style={[styles.collapsibleClip, (measured || !expanded) && { height: animatedHeight }]}><View onLayout={measure} style={[styles.collapsibleMeasure, (measured || !expanded) && styles.collapsibleMeasureClipped]}>{children}</View></NativeAnimated.View>;
};

export default StudentsScreen;

const gradeYearOptions = (educationLevel: EducationLevel) => {
  if (educationLevel === 'KINDERGARTEN') return [0];
  if (educationLevel === 'ELEMENTARY') return [1, 2, 3, 4, 5, 6];
  if (educationLevel === 'JUNIOR_HIGH') return [7, 8, 9, 10];
  if (educationLevel === 'SENIOR_HIGH') return [11, 12];
  return [1, 2, 3, 4, 5, 6];
};

const gradeYearLabel = (educationLevel: EducationLevel, gradeLevel: number) => {
  if (educationLevel === 'KINDERGARTEN') return 'Kindergarten';
  return educationLevel === 'COLLEGE' ? `Year ${gradeLevel}` : `Grade ${gradeLevel}`;
};

const CreateGroupModal = ({ visible, close, completed }: { visible: boolean; close: () => void; completed: () => Promise<void> }) => {
  const now = new Date();
  const schoolYearStart = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const [values, setValues] = useState({ gradeLevel: '', section: '', schoolYear: `${schoolYearStart}-${schoolYearStart + 1}`, term: 'Full Year', educationLevel: 'ELEMENTARY' as EducationLevel, isAdvisory: false });
  const [gradePickerOpen, setGradePickerOpen] = useState(false);
  const [createGroup, state] = useMutation(CREATE_STUDENT_GROUP_MUTATION);
  const basicEducation = ['KINDERGARTEN', 'ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'].includes(values.educationLevel);
  const availableGrades = gradeYearOptions(values.educationLevel);
  const save = async () => {
    try {
      await createGroup({ variables: { input: { ...values, gradeLevel: Number(values.gradeLevel) } } });
      await completed();
    } catch (error) { Alert.alert('Section not created', error instanceof Error ? error.message : 'Try again.'); }
  };
  return <><Sheet visible={visible} title="Add section" subtitle="Create the roster once, then add its subject classes." close={close}>
    <Text style={styles.label}>Education level</Text><View style={styles.chipWrap}>{(['KINDERGARTEN', 'ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'] as EducationLevel[]).map((level) => <Pressable key={level} onPress={() => setValues({ ...values, educationLevel: level, gradeLevel: level === 'KINDERGARTEN' ? '0' : gradeYearOptions(level).includes(Number(values.gradeLevel)) ? values.gradeLevel : '', isAdvisory: ['COLLEGE', 'CUSTOM'].includes(level) ? false : values.isAdvisory, term: level === 'COLLEGE' ? '1st Semester' : 'Full Year' })} style={[styles.formChip, values.educationLevel === level && styles.formChipActive]}><Text style={[styles.formChipText, values.educationLevel === level && styles.formChipTextActive]}>{level.replaceAll('_', ' ')}</Text></Pressable>)}</View>
    <View style={styles.formRow}><View style={{ flex: 1 }}><Text style={styles.label}>Grade/year</Text><Pressable accessibilityRole="button" onPress={() => setGradePickerOpen(true)} style={styles.selectInput}><Text style={[styles.selectInputText, !values.gradeLevel && styles.selectPlaceholder]}>{values.gradeLevel ? gradeYearLabel(values.educationLevel, Number(values.gradeLevel)) : 'Select'}</Text><Ionicons name="chevron-down" size={17} color={colors.muted} /></Pressable></View><View style={{ flex: 1 }}><Text style={styles.label}>Section</Text><TextInput value={values.section} onChangeText={(section) => setValues({ ...values, section })} placeholder="e.g. Rizal or BSIT 2A" placeholderTextColor="#98A2B3" style={styles.input} /></View></View>
    <Text style={styles.label}>School year</Text><View style={styles.chipWrap}>{Array.from({ length: 3 }, (_, index) => `${schoolYearStart - 1 + index}-${schoolYearStart + index}`).map((schoolYear) => <Pressable key={schoolYear} onPress={() => setValues({ ...values, schoolYear })} style={[styles.formChip, values.schoolYear === schoolYear && styles.formChipActive]}><Text style={[styles.formChipText, values.schoolYear === schoolYear && styles.formChipTextActive]}>{schoolYear}</Text></Pressable>)}</View>
    <Text style={styles.label}>Term</Text><View style={styles.chipWrap}>{(values.educationLevel === 'COLLEGE' ? ['1st Semester', '2nd Semester', 'Summer'] : ['Full Year', '1st Semester', '2nd Semester']).map((term) => <Pressable key={term} onPress={() => setValues({ ...values, term })} style={[styles.formChip, values.term === term && styles.formChipActive]}><Text style={[styles.formChipText, values.term === term && styles.formChipTextActive]}>{term}</Text></Pressable>)}</View>
    {basicEducation && <Pressable onPress={() => setValues({ ...values, isAdvisory: !values.isAdvisory })} style={styles.adviserChoice}><Ionicons name={values.isAdvisory ? 'checkbox' : 'square-outline'} size={21} color={values.isAdvisory ? colors.primary : colors.muted} /><View style={{ flex: 1 }}><Text style={styles.choiceTitle}>I am the adviser of this section</Text><Text style={styles.choiceMeta}>Enables daily attendance and section reports.</Text></View></Pressable>}
    <Pressable disabled={state.loading || !values.gradeLevel || !values.section.trim()} onPress={save} style={[styles.save, (state.loading || !values.gradeLevel || !values.section.trim()) && styles.disabled]}><Text style={styles.saveText}>{state.loading ? 'Creating…' : 'Create section'}</Text></Pressable>
  </Sheet><Sheet visible={gradePickerOpen} title="Select grade/year" subtitle={`Choose the ${values.educationLevel === 'COLLEGE' ? 'college year' : 'grade level'} for this section.`} close={() => setGradePickerOpen(false)}><View style={styles.gradePicker}>{availableGrades.map((gradeLevel) => <Pressable key={gradeLevel} onPress={() => { setValues({ ...values, gradeLevel: String(gradeLevel) }); setGradePickerOpen(false); }} style={[styles.gradeOption, values.gradeLevel === String(gradeLevel) && styles.gradeOptionActive]}><Text style={[styles.gradeOptionText, values.gradeLevel === String(gradeLevel) && styles.gradeOptionTextActive]}>{gradeYearLabel(values.educationLevel, gradeLevel)}</Text><Ionicons name={values.gradeLevel === String(gradeLevel) ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={values.gradeLevel === String(gradeLevel) ? colors.primary : '#AAB5C4'} /></Pressable>)}</View></Sheet></>;
};

export const StudentModal = ({ visible, classes, student, groupId, initialClassroomIds = [], close, completed }: { visible: boolean; classes: Classroom[]; student?: Student; groupId?: string; initialClassroomIds?: string[]; close: () => void; completed: () => Promise<void> }) => {
  const [values, setValues] = useState({ studentNo: '', firstName: '', lastName: '', email: '', lrn: '', birthDate: '', sex: '' as '' | 'MALE' | 'FEMALE' });
  const [classroomIds, setClassroomIds] = useState<string[]>([]);
  const [save, state] = useMutation(SAVE_TEACHER_STUDENT_MUTATION);
  useEffect(() => { if (visible) { setClassroomIds(initialClassroomIds); setValues(student ? { studentNo: student.studentNo, firstName: student.firstName, lastName: student.lastName, email: student.email ?? '', lrn: student.lrn ?? '', birthDate: student.birthDate?.slice(0, 10) ?? '', sex: student.sex ?? '' } : { studentNo: '', firstName: '', lastName: '', email: '', lrn: '', birthDate: '', sex: '' }); } }, [visible, student?.id]);
  const toggle = (id: string) => setClassroomIds(classroomIds.includes(id) ? classroomIds.filter((value) => value !== id) : [...classroomIds, id]);
  const submit = async () => {
    try {
      await save({ variables: { input: { studentNo: values.studentNo, firstName: values.firstName, lastName: values.lastName, email: values.email || undefined, lrn: values.lrn || undefined, birthDate: values.birthDate || undefined, sex: values.sex || undefined, classroomIds, groupIds: groupId ? [groupId] : [] } } });
      setValues({ studentNo: '', firstName: '', lastName: '', email: '', lrn: '', birthDate: '', sex: '' });
      setClassroomIds([]);
      await completed();
    }
    catch (error) { Alert.alert('Student not saved', error instanceof Error ? error.message : 'Try again.'); }
  }
  const disabled = state.loading || !values.studentNo.trim() || !values.firstName.trim() || !values.lastName.trim();
  return <Sheet visible={visible} title={student ? 'Edit student' : 'Add student'} subtitle={groupId ? 'This student will be assigned to every class in the section.' : 'Complete learner details now to prepare SF9 and SF5 reports.'} close={close}>
    <TextInput value={values.studentNo} onChangeText={(studentNo) => setValues({ ...values, studentNo })} placeholder="Student number" placeholderTextColor="#98A2B3" style={styles.input} />
    <TextInput value={values.lrn} onChangeText={(lrn) => setValues({ ...values, lrn })} placeholder="LRN" placeholderTextColor="#98A2B3" keyboardType="number-pad" maxLength={12} style={styles.input} />
    <TextInput value={values.firstName} onChangeText={(firstName) => setValues({ ...values, firstName })} placeholder="First name" placeholderTextColor="#98A2B3" style={styles.input} />
    <TextInput value={values.lastName} onChangeText={(lastName) => setValues({ ...values, lastName })} placeholder="Last name" placeholderTextColor="#98A2B3" style={styles.input} />
    <TextInput value={values.birthDate} onChangeText={(birthDate) => setValues({ ...values, birthDate })} placeholder="Birth date (YYYY-MM-DD)" placeholderTextColor="#98A2B3" style={styles.input} />
    <View style={studentFormStyles.sexRow}><Text style={studentFormStyles.sexLabel}>Sex</Text>{(['MALE', 'FEMALE'] as const).map((sex) => <Pressable key={sex} onPress={() => setValues({ ...values, sex })} style={[studentFormStyles.sexChoice, values.sex === sex && studentFormStyles.sexChoiceActive]}><Text style={[studentFormStyles.sexText, values.sex === sex && studentFormStyles.sexTextActive]}>{sex === 'MALE' ? 'Male' : 'Female'}</Text></Pressable>)}</View>
    <TextInput value={values.email} onChangeText={(email) => setValues({ ...values, email })} placeholder="Email (optional)" placeholderTextColor="#98A2B3" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
    {!groupId && <><Text style={styles.label}>Assign to classes</Text><ClassChoices classes={classes} selected={classroomIds} toggle={toggle} /></>}<Pressable disabled={disabled} onPress={submit} style={[styles.save, disabled && styles.disabled]}><Text style={styles.saveText}>{state.loading ? 'Saving…' : 'Save student'}</Text></Pressable>
  </Sheet>;
}

export const ImportModal = ({ visible, classes, groupId, initialClassroomIds = [], close, completed }: { visible: boolean; classes: Classroom[]; groupId?: string; initialClassroomIds?: string[]; close: () => void; completed: (count: number) => Promise<void> }) => {
  const [classroomIds, setClassroomIds] = useState<string[]>([]);
  const [importStudents, state] = useMutation(IMPORT_TEACHER_STUDENTS_MUTATION);
  useEffect(() => { if (visible) setClassroomIds(initialClassroomIds); }, [visible]);
  const toggle = (id: string) => setClassroomIds(classroomIds.includes(id) ? classroomIds.filter((value) => value !== id) : [...classroomIds, id]);
  const chooseFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
      if (picked.canceled) return;
      const contents = await FileSystem.readAsStringAsync(picked.assets[0]!.uri);
      const rows = parseStudentsCsv(contents);
      const result = await importStudents({ variables: { inputs: rows.map((row) => ({ ...row, classroomIds, groupIds: groupId ? [groupId] : [] })) } });
      await completed(result.data?.importTeacherStudents.count ?? rows.length);
    } catch (error) { Alert.alert('CSV import failed', error instanceof Error ? error.message : 'Check the file and try again.'); }
  }
  return <Sheet visible={visible} title="Import students" subtitle={groupId ? 'Every imported student will join this section and all of its classes.' : 'Choose the classes once, then import all rows from a CSV file.'} close={close}><View style={styles.csvHint}><Text style={styles.csvTitle}>Required header</Text><Text style={styles.csvCode}>studentNo,firstName,lastName,email</Text><Text style={styles.csvNote}>Email may be blank. Student numbers must be unique in the file.</Text></View>{!groupId && <><Text style={styles.label}>Assign every imported student to</Text><ClassChoices classes={classes} selected={classroomIds} toggle={toggle} /></>}<Pressable disabled={state.loading} onPress={chooseFile} style={styles.save}><Ionicons name="document-attach-outline" size={18} color="#fff" /><Text style={styles.saveText}>{state.loading ? 'Importing…' : 'Choose CSV file'}</Text></Pressable></Sheet>;
}

const ClassChoices = ({ classes, selected, toggle }: { classes: Classroom[]; selected: string[]; toggle: (id: string) => void }) => {
  if (!classes.length) return <Text style={styles.emptyClasses}>No classes yet. Students can still be added and assigned later.</Text>;
  return <View style={styles.choices}>{classes.map((room) => <Pressable key={room.id} onPress={() => toggle(room.id)} style={[styles.choice, selected.includes(room.id) && styles.choiceSelected]}><Ionicons name={selected.includes(room.id) ? 'checkbox' : 'square-outline'} size={20} color={selected.includes(room.id) ? colors.primary : colors.muted} /><View style={{ flex: 1 }}><Text style={styles.choiceTitle}>{room.subject}</Text><Text style={styles.choiceMeta}>{room.gradeLevel === 0 ? 'Kindergarten' : `Grade/Year ${room.gradeLevel}`} · {room.section}</Text></View></Pressable>)}</View>;
}

const Sheet = ({ visible, title, subtitle, close, children }: { visible: boolean; title: string; subtitle: string; close: () => void; children: React.ReactNode }) => {
  if (!visible) return null;
  return <View style={styles.backdrop}><View style={styles.sheet}><View style={styles.sheetHead}><View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{title}</Text><Text style={styles.sheetSubtitle}>{subtitle}</Text></View><Pressable onPress={close}><Ionicons name="close" size={25} color={colors.text} /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView></View></View>;
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

const studentFormStyles = StyleSheet.create({
  sexRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  sexLabel: { color: colors.text, fontSize: 12, fontWeight: '800', marginRight: 4 },
  sexChoice: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sexChoiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sexText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  sexTextActive: { color: '#fff' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, heading: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headingActions: { flexDirection: 'row', gap: 8 }, secondaryAction: { height: 42, paddingHorizontal: 11, gap: 6, flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderColor: '#BBD2F8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }, secondaryActionText: { color: colors.primary, fontWeight: '800', fontSize: 11 }, primaryAction: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' }, title: { fontSize: 27, fontWeight: '800', color: colors.text, marginTop: 2 }, search: { marginHorizontal: 16, marginBottom: 13, height: 46, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, searchInput: { flex: 1, marginLeft: 9, color: colors.text, fontSize: 14 }, list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingBottom: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, row: { minHeight: 69, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border }, first: { borderTopWidth: 0 }, copy: { flex: 1, marginLeft: 12 }, name: { color: colors.text, fontWeight: '700', fontSize: 14 }, id: { color: colors.muted, fontSize: 11, marginTop: 4 },
  iconAction: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#BBD2F8', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  groupList: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },
  groupCard: { borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  groupHead: { minHeight: 66, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  groupBadge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purpleSoft },
  groupBadgeText: { color: colors.purple, fontWeight: '800', fontSize: 13 },
  groupCopy: { flex: 1, minWidth: 0 },
  groupTitleRow: { minHeight: 20 },
  groupName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  groupInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  groupMeta: { color: colors.muted, fontSize: 10 },
  advisoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: '#F2F4F7' },
  advisoryText: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  formChip: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  formChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  formChipText: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  formChipTextActive: { color: colors.primary },
  formRow: { flexDirection: 'row', gap: 9 },
  adviserChoice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 11, backgroundColor: colors.primarySoft, marginTop: 16 },
  profileButton: { height: 30, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BBD2F8', borderRadius: 8 },
  profileButtonText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  groupStudents: { paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.border },
  collapsibleClip: { width: '100%', overflow: 'hidden' },
  collapsibleMeasure: { width: '100%' },
  collapsibleMeasureClipped: { position: 'absolute', top: 0, left: 0, right: 0 },
  searchResults: { paddingHorizontal: 16, paddingBottom: 30, gap: 9 },
  resultCount: { color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 3 },
  searchResult: { minHeight: 70, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface },
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 20, backgroundColor: '#0B193099', justifyContent: 'flex-end' }, sheet: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }, sheetHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }, sheetTitle: { color: colors.text, fontSize: 21, fontWeight: '800' }, sheetSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4, paddingRight: 12 }, input: { height: 47, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, color: colors.text, marginTop: 10 }, selectInput: { height: 47, marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectInputText: { color: colors.text, fontSize: 14 }, selectPlaceholder: { color: '#98A2B3' }, gradePicker: { gap: 8, paddingTop: 4 }, gradeOption: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, gradeOptionActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, gradeOptionText: { color: colors.text, fontSize: 14, fontWeight: '700' }, gradeOptionTextActive: { color: colors.primary }, label: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 18, marginBottom: 8 }, choices: { gap: 7 }, choice: { minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 11, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }, choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, choiceTitle: { color: colors.text, fontWeight: '700', fontSize: 12 }, choiceMeta: { color: colors.muted, fontSize: 10, marginTop: 3 }, emptyClasses: { color: colors.muted, fontSize: 12, lineHeight: 18, padding: 12, backgroundColor: colors.background, borderRadius: 10 }, save: { height: 49, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginTop: 20 }, saveText: { color: '#fff', fontWeight: '800' }, disabled: { opacity: .5 }, csvHint: { padding: 13, borderRadius: 11, backgroundColor: colors.primarySoft, marginTop: 6 }, csvTitle: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' }, csvCode: { color: colors.primaryDark, fontSize: 11, marginTop: 6 }, csvNote: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
});
