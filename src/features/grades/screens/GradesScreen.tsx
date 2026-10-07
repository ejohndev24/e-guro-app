import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradebook } from '@/core/types';
import { colors } from '@/core/theme';
import { MOBILE_ME_QUERY } from '@/features/auth/graphql/queries';
import { ErrorState, LoadingState, ScreenHeader } from '@/shared/components/ui';
import { GRADE_ROSTER_QUERY } from '../graphql/queries/getGradeRoster';
import { CONFIGURE_CLASS_GRADING_MUTATION, CREATE_ASSESSMENT_MUTATION, SAVE_GRADEBOOK_SCORES_MUTATION } from '../graphql/mutations/saveGrades';

type Data = { gradebook: Gradebook };
type ScoreValues = Record<string, string>;
type ScoreDrafts = Record<string, ScoreValues>;

const GradesScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [quarter, setQuarter] = useState(1);
  const [activeId, setActiveId] = useState<string>();
  const [drafts, setDrafts] = useState<ScoreDrafts>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const scoreInputs = useRef<Record<string, TextInput | null>>({});
  const { data, loading, error, refetch } = useQuery<Data>(GRADE_ROSTER_QUERY, { variables: { classroomId: id, quarter }, skip: !id, fetchPolicy: 'network-only' });
  const { data: account } = useQuery<{ me: { isIndependent: boolean } }>(MOBILE_ME_QUERY);
  const [saveGradebook, saveState] = useMutation(SAVE_GRADEBOOK_SCORES_MUTATION);

  const assessments = useMemo(() => data?.gradebook.categories.flatMap((category) => category.assessments.map((assessment) => ({ ...assessment, categoryName: category.name, categoryWeight: category.weight }))) ?? [], [data]);
  const active = assessments.find((item) => item.id === activeId);
  const scores = active ? drafts[active.id] ?? {} : {};
  const dirtyIds = Object.keys(dirty).filter((assessmentId) => dirty[assessmentId]);

  useEffect(() => {
    if (!assessments.some((item) => item.id === activeId)) setActiveId(assessments[0]?.id);
  }, [assessments, activeId]);

  useEffect(() => {
    if (!data) return;
    setDrafts(Object.fromEntries(assessments.map((assessment) => [assessment.id, Object.fromEntries(data.gradebook.students.map(({ student }) => {
      const saved = assessment.scores.find((item) => item.studentId === student.id)?.score;
      return [student.id, saved == null ? '' : String(saved)];
    }))])));
    setDirty({});
  }, [data, assessments]);

  const assessmentIsValid = (assessmentId: string) => {
    const assessment = assessments.find((item) => item.id === assessmentId);
    if (!assessment) return false;
    return Object.values(drafts[assessmentId] ?? {}).every((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= assessment.maxScore));
  };
  const valid = dirtyIds.every(assessmentIsValid);

  const setScore = (studentId: string, value: string) => {
    if (!active || !/^\d{0,5}(\.\d{0,2})?$/.test(value)) return;
    setDrafts((current) => ({ ...current, [active.id]: { ...(current[active.id] ?? {}), [studentId]: value } }));
    setDirty((current) => ({ ...current, [active.id]: true }));
  };

  const selectQuarter = (value: number) => {
    if (value === quarter) return;
    if (dirtyIds.length) {
      Alert.alert('Unsaved grades', 'Save or discard your changes before changing quarters.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { setDirty({}); setQuarter(value); } },
      ]);
      return;
    }
    setQuarter(value);
  };

  const requestAdd = () => {
    if (dirtyIds.length) return Alert.alert('Save grades first', 'Save your current changes before adding another assessment.');
    setAdding(true);
  };

  const requestConfigure = () => {
    if (dirtyIds.length) return Alert.alert('Save grades first', 'Save your current changes before editing the grading setup.');
    setConfiguring(true);
  };

  const submit = async () => {
    if (!data || !id || !dirtyIds.length) return;
    if (!valid) return Alert.alert('Check the scores', 'One or more scores exceed the maximum score for their assessment.');
    try {
      await saveGradebook({ variables: { input: {
        classroomId: id,
        quarter,
        assessments: dirtyIds.map((assessmentId) => ({
          assessmentId,
          scores: data.gradebook.students.map(({ student }) => ({ studentId: student.id, ...(drafts[assessmentId]?.[student.id] === '' ? {} : { score: Number(drafts[assessmentId]?.[student.id]) }) })),
        })),
      } } });
      setDirty({});
      await refetch();
      Alert.alert('Grades saved', `${dirtyIds.length} changed assessment${dirtyIds.length === 1 ? '' : 's'} saved successfully.`);
    } catch (saveError) {
      Alert.alert('Grades not saved', saveError instanceof Error ? saveError.message : 'Try again.');
    }
  };

  return <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScreenHeader title="Encode Grades" subtitle={data?.gradebook.classroom.displayName} onBack={router.back} action={data?.gradebook.schemeName ? <Pressable onPress={requestAdd} style={styles.add}><Ionicons name="add" size={22} color="#fff" /></Pressable> : undefined} />
    {loading && !data ? <LoadingState /> : error && !data ? <ErrorState message={error.message} retry={refetch} /> : <>
      <View style={styles.quarters}>{[1, 2, 3, 4].map((value) => <Pressable key={value} onPress={() => selectQuarter(value)} style={[styles.quarter, quarter === value && styles.quarterActive]}><Text style={[styles.quarterText, quarter === value && styles.quarterTextActive]}>Q{value}</Text></Pressable>)}</View>
      {!data?.gradebook.schemeName ? <View style={styles.empty}><Ionicons name="options-outline" size={38} color={colors.muted} /><Text style={styles.emptyTitle}>No grading template assigned</Text><Text style={styles.emptyCopy}>Ask your school administrator to assign a 100% grading template to this class in the E-Guro portal.</Text></View> : <>
        <View style={styles.schemeRow}><Text numberOfLines={1} style={styles.schemeName}>{data.gradebook.schemeName}</Text><Text style={styles.draftStatus}>{dirtyIds.length ? `${dirtyIds.length} unsaved` : 'All saved'}</Text>{account?.me.isIndependent && <Pressable onPress={requestConfigure} hitSlop={10} style={styles.setupButton}><Ionicons name="settings-outline" size={16} color={colors.primary} /><Text style={styles.setupText}>Setup</Text></Pressable>}</View>
        <ScrollView horizontal showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.assessmentScroller} contentContainerStyle={styles.assessments}>
          {assessments.map((item) => <Pressable key={item.id} onPress={() => setActiveId(item.id)} style={[styles.assessment, activeId === item.id && styles.assessmentActive, dirty[item.id] && styles.assessmentDirty]}><View style={styles.assessmentTitleRow}><Text numberOfLines={1} style={[styles.assessmentTitle, activeId === item.id && styles.assessmentTitleActive]}>{item.title}</Text>{dirty[item.id] && <View style={styles.dot} />}</View><Text numberOfLines={1} style={styles.points}>{item.categoryName} · {item.categoryWeight}% · {item.maxScore} pts</Text></Pressable>)}
          <Pressable onPress={requestAdd} style={styles.smallAdd}><Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.addAssessmentText}>Assessment</Text></Pressable>
        </ScrollView>
        {!active ? <View style={styles.empty}><Text style={styles.emptyTitle}>Add the first assessment</Text><Text style={styles.emptyCopy}>Create a quiz, recitation, project or examination under one of the approved categories.</Text></View> : <>
          <View style={styles.tableHead}><View><Text style={styles.activeTitle}>{active.title}</Text><Text style={styles.activeMeta}>{active.categoryName} · Maximum {active.maxScore}</Text></View><Text style={styles.gradeHead}>Quarterly</Text></View>
          <ScrollView style={styles.roster} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.table}>
            {data.gradebook.students.map(({ student, finalGrade }, index, students) => <View key={student.id} style={[styles.row, index > 0 && styles.border]}>
              <View style={styles.nameWrap}><Text numberOfLines={1} style={styles.name}>{student.lastName}, {student.firstName}</Text><Text style={styles.studentId}>{student.studentNo}</Text></View>
              <TextInput ref={(input) => { scoreInputs.current[student.id] = input; }} value={scores[student.id] ?? ''} onChangeText={(value) => setScore(student.id, value)} keyboardType="decimal-pad" returnKeyType={index === students.length - 1 ? 'done' : 'next'} blurOnSubmit={index === students.length - 1} onSubmitEditing={() => { const nextStudent = students[index + 1]; if (nextStudent) scoreInputs.current[nextStudent.student.id]?.focus(); }} placeholder="—" selectTextOnFocus style={[styles.score, Number(scores[student.id]) > active.maxScore && styles.scoreInvalid]} />
              <Text style={[styles.final, (finalGrade ?? 100) < 75 && styles.low]}>{finalGrade?.toFixed(0) ?? '—'}</Text>
            </View>)}
          </ScrollView>
          <View style={styles.footer}><Pressable disabled={saveState.loading || !valid || !dirtyIds.length} onPress={submit} style={[styles.save, (saveState.loading || !valid || !dirtyIds.length) && styles.disabled]}><Ionicons name="save-outline" size={18} color="#fff" /><Text style={styles.saveText}>{saveState.loading ? 'Saving…' : dirtyIds.length ? `Save Grades (${dirtyIds.length})` : 'Grades Saved'}</Text></Pressable></View>
        </>}
      </>}
    </>}
    {adding && data && <AssessmentModal classroomId={id!} quarter={quarter} categories={data.gradebook.categories} close={() => setAdding(false)} completed={async () => { setAdding(false); await refetch(); }} />}
    {configuring && data && <GradingSetupModal classroomId={id!} quarter={quarter} categories={data.gradebook.categories} close={() => setConfiguring(false)} completed={async () => { setConfiguring(false); await refetch(); }} />}
  </KeyboardAvoidingView>;
};

export default GradesScreen;

const AssessmentModal = ({ classroomId, quarter, categories, close, completed }: { classroomId: string; quarter: number; categories: Gradebook['categories']; close: () => void; completed: () => Promise<void> }) => {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const maxScoreRef = useRef<TextInput>(null);
  const [create, state] = useMutation(CREATE_ASSESSMENT_MUTATION);
  const submit = async () => {
    if (!categoryId || !title.trim() || Number(maxScore) <= 0) return;
    try {
      await create({ variables: { input: { classroomId, categoryId, title: title.trim(), maxScore: Number(maxScore), quarter } } });
      await completed();
    } catch (createError) {
      Alert.alert('Assessment not created', createError instanceof Error ? createError.message : 'Try again.');
    }
  };
  return <Modal visible transparent animationType="slide" onRequestClose={close}><View style={styles.backdrop}><View style={styles.modal}><View style={styles.modalHead}><View><Text style={styles.modalTitle}>Add assessment</Text><Text style={styles.modalCopy}>Quiz, recitation, project, exam, or any scored work</Text></View><Pressable onPress={close}><Ionicons name="close" size={23} color={colors.muted} /></Pressable></View><Text style={styles.label}>Category</Text><View style={styles.categoryOptions}>{categories.map((category) => <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.categoryOption, categoryId === category.id && styles.categoryOptionActive]}><Text style={[styles.categoryOptionText, categoryId === category.id && styles.categoryOptionTextActive]}>{category.name} · {category.weight}%</Text></Pressable>)}</View><Text style={styles.label}>Assessment name</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Recitation 1" returnKeyType="next" onSubmitEditing={() => maxScoreRef.current?.focus()} style={styles.input} /><Text style={styles.label}>Maximum score</Text><TextInput ref={maxScoreRef} value={maxScore} onChangeText={setMaxScore} keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={submit} style={styles.input} /><Pressable disabled={state.loading || !categoryId || !title.trim()} onPress={submit} style={[styles.save, styles.modalSave, (state.loading || !categoryId || !title.trim()) && styles.disabled]}><Text style={styles.saveText}>{state.loading ? 'Creating…' : 'Create assessment'}</Text></Pressable></View></View></Modal>;
};

type CategoryDraft = { id?: string; name: string; weight: string; assessmentCount: number };

const GradingSetupModal = ({ classroomId, quarter, categories, close, completed }: { classroomId: string; quarter: number; categories: Gradebook['categories']; close: () => void; completed: () => Promise<void> }) => {
  const [items, setItems] = useState<CategoryDraft[]>(categories.map((category) => ({ id: category.id, name: category.name, weight: String(category.weight), assessmentCount: category.assessments.length })));
  const [configure, state] = useMutation(CONFIGURE_CLASS_GRADING_MUTATION);
  const total = Math.round(items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0) * 100) / 100;
  const names = items.map((item) => item.name.trim().toLowerCase()).filter(Boolean);
  const valid = items.length > 0 && total === 100 && names.length === items.length && new Set(names).size === names.length && items.every((item) => Number(item.weight) > 0);

  const update = (index: number, changes: Partial<CategoryDraft>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  const remove = (index: number) => {
    const item = items[index];
    if (item?.assessmentCount) return Alert.alert('Category is in use', `Move or delete the assessments under ${item.name} before removing it.`);
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };
  const submit = async () => {
    if (!valid) return;
    try {
      await configure({ variables: { input: { classroomId, quarter, categories: items.map(({ id, name, weight }) => ({ ...(id ? { id } : {}), name: name.trim(), weight: Number(weight) })) } } });
      await completed();
    } catch (configureError) {
      Alert.alert('Grading setup not saved', configureError instanceof Error ? configureError.message : 'Try again.');
    }
  };

  return <Modal visible transparent animationType="slide" onRequestClose={close}><View style={styles.backdrop}><View style={[styles.modal, styles.setupModal]}><View style={styles.modalHead}><View style={{ flex: 1 }}><Text style={styles.modalTitle}>Grading setup</Text><Text style={styles.modalCopy}>Categories are specific to this class and must total exactly 100%.</Text></View><Pressable onPress={close}><Ionicons name="close" size={23} color={colors.muted} /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View style={styles.setupHint}><Ionicons name="information-circle-outline" size={17} color={colors.primary} /><Text style={styles.setupHintText}>Recitation normally belongs under Written Works or Performance Tasks. Add a new weighted category only when your school policy requires it.</Text></View>{items.map((item, index) => <View key={item.id ?? `new-${index}`} style={styles.categoryEditRow}><TextInput value={item.name} onChangeText={(name) => update(index, { name })} placeholder="Category name" style={[styles.input, styles.categoryNameInput]} /><View style={styles.weightEdit}><TextInput value={item.weight} onChangeText={(weight) => /^\d{0,3}(\.\d{0,2})?$/.test(weight) && update(index, { weight })} keyboardType="decimal-pad" placeholder="0" style={styles.weightTextInput} /><Text style={styles.percent}>%</Text></View><Pressable onPress={() => remove(index)} style={[styles.removeCategory, item.assessmentCount > 0 && styles.disabled]}><Ionicons name="trash-outline" size={18} color={colors.danger} /></Pressable></View>)}<Pressable onPress={() => setItems((current) => [...current, { name: '', weight: '', assessmentCount: 0 }])} style={styles.addCategory}><Ionicons name="add" size={17} color={colors.primary} /><Text style={styles.addCategoryText}>Add category</Text></Pressable><View style={[styles.totalRow, total === 100 ? styles.totalValid : styles.totalInvalid]}><Text style={styles.totalLabel}>Total weight</Text><Text style={styles.totalValue}>{total}%</Text></View>{state.error && <Text style={styles.setupError}>{state.error.message}</Text>}<Pressable disabled={state.loading || !valid} onPress={submit} style={[styles.save, styles.modalSave, (state.loading || !valid) && styles.disabled]}><Text style={styles.saveText}>{state.loading ? 'Saving…' : 'Save grading setup'}</Text></Pressable></ScrollView></View></View></Modal>;
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  add: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  quarters: { flexDirection: 'row', marginHorizontal: 14, marginTop: 8, padding: 3, borderRadius: 11, backgroundColor: '#E9EDF4' },
  quarter: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  quarterActive: { backgroundColor: colors.surface },
  quarterText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  quarterTextActive: { color: colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 35 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptyCopy: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 7 },
  schemeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 9 },
  schemeName: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 12 },
  draftStatus: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  setupButton: { marginLeft: 9, flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4 },
  setupText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  assessmentScroller: { flexGrow: 0 },
  assessments: { paddingHorizontal: 14, paddingVertical: 9, gap: 7 },
  assessment: { width: 145, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  assessmentActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  assessmentDirty: { borderColor: colors.warning },
  assessmentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  assessmentTitle: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '700' },
  assessmentTitleActive: { color: colors.primary },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  points: { color: colors.muted, fontSize: 8, marginTop: 3 },
  smallAdd: { width: 92, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary },
  addAssessmentText: { color: colors.primary, fontSize: 8, fontWeight: '700', marginTop: 2 },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 6 },
  activeTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  activeMeta: { color: colors.muted, fontSize: 9, marginTop: 2 },
  gradeHead: { marginLeft: 'auto', color: colors.muted, fontSize: 9 },
  roster: { flex: 1 },
  table: { backgroundColor: colors.surface, marginHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingBottom: 8 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  nameWrap: { flex: 1, minWidth: 0, marginRight: 7 },
  name: { color: colors.text, fontSize: 10, fontWeight: '700' },
  studentId: { color: colors.muted, fontSize: 9, marginTop: 3 },
  score: { width: 64, height: 32, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, textAlign: 'center', color: colors.text },
  scoreInvalid: { borderColor: colors.danger },
  final: { width: 50, textAlign: 'right', color: colors.success, fontWeight: '800', fontSize: 12 },
  low: { color: colors.danger },
  footer: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  save: { backgroundColor: colors.primary, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  disabled: { opacity: .5 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0b193099' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, paddingBottom: 35 },
  setupModal: { maxHeight: '90%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  modalCopy: { color: colors.muted, fontSize: 10, marginTop: 3 },
  label: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 18, marginBottom: 7 },
  categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  categoryOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 },
  categoryOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  categoryOptionText: { color: colors.muted, fontSize: 10 },
  categoryOptionTextActive: { color: colors.primary, fontWeight: '700' },
  input: { height: 47, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.background },
  modalSave: { marginTop: 22 },
  setupHint: { flexDirection: 'row', gap: 8, padding: 11, marginTop: 12, marginBottom: 8, borderRadius: 10, backgroundColor: colors.primarySoft },
  setupHintText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 15 },
  categoryEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  categoryNameInput: { flex: 1 },
  weightEdit: { width: 82, height: 47, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.background },
  weightTextInput: { flex: 1, height: 45, paddingLeft: 9, color: colors.text, textAlign: 'right' },
  percent: { color: colors.muted, paddingHorizontal: 8 },
  removeCategory: { width: 35, height: 40, alignItems: 'center', justifyContent: 'center' },
  addCategory: { height: 42, marginTop: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  addCategoryText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  totalRow: { marginTop: 14, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between' },
  totalValid: { backgroundColor: colors.successSoft },
  totalInvalid: { backgroundColor: colors.dangerSoft },
  totalLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  totalValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  setupError: { color: colors.danger, fontSize: 10, marginTop: 10 },
});
