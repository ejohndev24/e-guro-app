import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradebook } from '@/core/types';
import { colors } from '@/core/theme';
import { ErrorState, LoadingState, ScreenHeader } from '@/shared/components/ui';
import { GRADE_ROSTER_QUERY } from '../graphql/queries/getGradeRoster';
import { CREATE_ASSESSMENT_MUTATION, SAVE_ASSESSMENT_SCORES_MUTATION } from '../graphql/mutations/saveGrades';

type Data = { gradebook: Gradebook };
type ScoreValues = Record<string, string>;

const GradesScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [quarter, setQuarter] = useState(1);
  const [activeId, setActiveId] = useState<string>();
  const [scores, setScores] = useState<ScoreValues>({});
  const [adding, setAdding] = useState(false);
  const { data, loading, error, refetch } = useQuery<Data>(GRADE_ROSTER_QUERY, { variables: { classroomId: id, quarter }, skip: !id, fetchPolicy: 'network-only' });
  const [saveScores, saveState] = useMutation(SAVE_ASSESSMENT_SCORES_MUTATION);

  const assessments = useMemo(() => data?.gradebook.categories.flatMap((category) => category.assessments.map((assessment) => ({ ...assessment, categoryName: category.name, categoryWeight: category.weight }))) ?? [], [data]);
  const active = assessments.find((item) => item.id === activeId);

  useEffect(() => {
    if (!assessments.some((item) => item.id === activeId)) setActiveId(assessments[0]?.id);
  }, [assessments, activeId]);
  useEffect(() => {
    if (!active || !data) { setScores({}); return; }
    setScores(Object.fromEntries(data.gradebook.students.map(({ student }) => {
      const saved = active.scores.find((item) => item.studentId === student.id)?.score;
      return [student.id, saved === undefined ? '' : String(saved)];
    })));
  }, [activeId, data]);

  const valid = !active || Object.values(scores).every((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= active.maxScore));
  const setScore = (studentId: string, value: string) => {
    if (/^\d{0,5}(\.\d{0,2})?$/.test(value)) setScores((current) => ({ ...current, [studentId]: value }));
  };
  const submit = async () => {
    if (!active || !data || !valid) return Alert.alert('Check the scores', `Each score must be between 0 and ${active?.maxScore ?? 0}.`);
    try {
      await saveScores({ variables: { input: { assessmentId: active.id, scores: data.gradebook.students.map(({ student }) => ({ studentId: student.id, ...(scores[student.id] === '' ? {} : { score: Number(scores[student.id]) }) })) } } });
      await refetch();
      Alert.alert('Scores saved', `${active.title} has been updated.`);
    } catch (saveError) { Alert.alert('Scores not saved', saveError instanceof Error ? saveError.message : 'Try again.'); }
  }

  return <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScreenHeader title="Encode Grades" subtitle={data?.gradebook.classroom.displayName} onBack={router.back} action={data?.gradebook.schemeName ? <Pressable onPress={() => setAdding(true)} style={styles.add}><Ionicons name="add" size={22} color="#fff" /></Pressable> : undefined} />
    {loading && !data ? <LoadingState /> : error && !data ? <ErrorState message={error.message} retry={refetch} /> : <>
      <View style={styles.quarters}>{[1, 2, 3, 4].map((value) => <Pressable key={value} onPress={() => setQuarter(value)} style={[styles.quarter, quarter === value && styles.quarterActive]}><Text style={[styles.quarterText, quarter === value && styles.quarterTextActive]}>Q{value}</Text></Pressable>)}</View>
      {!data?.gradebook.schemeName ? <View style={styles.empty}><Ionicons name="options-outline" size={38} color={colors.muted} /><Text style={styles.emptyTitle}>No grading template assigned</Text><Text style={styles.emptyCopy}>Ask your school administrator to assign a 100% grading template to this class in the E-Guro portal.</Text></View> : <>
        <View style={styles.scheme}><Text style={styles.schemeName}>{data.gradebook.schemeName}</Text><Text style={styles.schemeHint}>Tap an assessment to encode scores</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assessments}>{data.gradebook.categories.map((category) => <View key={category.id} style={styles.category}><Text style={styles.categoryName}>{category.name} · {category.weight}%</Text><View style={styles.assessmentRow}>{category.assessments.map((item) => <Pressable key={item.id} onPress={() => setActiveId(item.id)} style={[styles.assessment, activeId === item.id && styles.assessmentActive]}><Text style={[styles.assessmentTitle, activeId === item.id && styles.assessmentTitleActive]}>{item.title}</Text><Text style={styles.points}>{item.maxScore} pts</Text></Pressable>)}<Pressable onPress={() => setAdding(true)} style={styles.smallAdd}><Ionicons name="add" size={17} color={colors.primary} /></Pressable></View></View>)}</ScrollView>
        {!active ? <View style={styles.empty}><Text style={styles.emptyTitle}>Add the first assessment</Text><Text style={styles.emptyCopy}>Create a quiz, recitation, project or examination under one of the approved categories.</Text></View> : <><View style={styles.tableHead}><View><Text style={styles.activeTitle}>{active.title}</Text><Text style={styles.activeMeta}>{active.categoryName} · Maximum {active.maxScore}</Text></View><Text style={styles.gradeHead}>Final</Text></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.table}>{data.gradebook.students.map(({ student, finalGrade }, index) => <View key={student.id} style={[styles.row, index > 0 && styles.border]}><View style={styles.nameWrap}><Text numberOfLines={1} style={styles.name}>{student.lastName}, {student.firstName}</Text><Text style={styles.studentId}>{student.studentNo}</Text></View><TextInput value={scores[student.id] ?? ''} onChangeText={(value) => setScore(student.id, value)} keyboardType="decimal-pad" placeholder="—" selectTextOnFocus style={[styles.score, Number(scores[student.id]) > active.maxScore && styles.scoreInvalid]} /><Text style={[styles.final, (finalGrade ?? 100) < 75 && styles.low]}>{finalGrade?.toFixed(1) ?? '—'}</Text></View>)}</ScrollView><View style={styles.footer}><Pressable disabled={saveState.loading || !valid} onPress={submit} style={[styles.save, (saveState.loading || !valid) && { opacity: .55 }]}><Text style={styles.saveText}>{saveState.loading ? 'Saving…' : `Save ${active.title}`}</Text></Pressable></View></>}
      </>}
    </>}
    {adding && data && <AssessmentModal classroomId={id!} quarter={quarter} categories={data.gradebook.categories} close={() => setAdding(false)} completed={async () => { setAdding(false); await refetch(); }} />}
  </KeyboardAvoidingView>;
}

export default GradesScreen;

const AssessmentModal = ({ classroomId, quarter, categories, close, completed }: { classroomId: string; quarter: number; categories: Gradebook['categories']; close: () => void; completed: () => Promise<void> }) => {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [create, state] = useMutation(CREATE_ASSESSMENT_MUTATION);
  const submit = async () => {
    if (!categoryId || !title.trim() || Number(maxScore) <= 0) return;
    try { await create({ variables: { input: { classroomId, categoryId, title: title.trim(), maxScore: Number(maxScore), quarter } } }); await completed(); }
    catch (createError) { Alert.alert('Assessment not created', createError instanceof Error ? createError.message : 'Try again.'); }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={close}><View style={styles.backdrop}><View style={styles.modal}><View style={styles.modalHead}><View><Text style={styles.modalTitle}>Add assessment</Text><Text style={styles.modalCopy}>Quiz, recitation, project, exam, or any scored work</Text></View><Pressable onPress={close}><Ionicons name="close" size={23} color={colors.muted} /></Pressable></View><Text style={styles.label}>Category</Text><View style={styles.categoryOptions}>{categories.map((category) => <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.categoryOption, categoryId === category.id && styles.categoryOptionActive]}><Text style={[styles.categoryOptionText, categoryId === category.id && styles.categoryOptionTextActive]}>{category.name} · {category.weight}%</Text></Pressable>)}</View><Text style={styles.label}>Assessment name</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Recitation 1" style={styles.input} /><Text style={styles.label}>Maximum score</Text><TextInput value={maxScore} onChangeText={setMaxScore} keyboardType="decimal-pad" style={styles.input} /><Pressable disabled={state.loading || !categoryId || !title.trim()} onPress={() => submit()} style={[styles.save, { marginTop: 22 }, (state.loading || !categoryId || !title.trim()) && { opacity: .55 }]}><Text style={styles.saveText}>{state.loading ? 'Creating…' : 'Create assessment'}</Text></Pressable></View></View></Modal>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, add: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, quarters: { flexDirection: 'row', margin: 14, padding: 4, borderRadius: 12, backgroundColor: '#E9EDF4' }, quarter: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 }, quarterActive: { backgroundColor: colors.surface }, quarterText: { color: colors.muted, fontWeight: '700' }, quarterTextActive: { color: colors.primary }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 35 }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 12 }, emptyCopy: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 7 }, scheme: { paddingHorizontal: 16 }, schemeName: { color: colors.text, fontWeight: '800' }, schemeHint: { color: colors.muted, fontSize: 10, marginTop: 2 }, assessments: { padding: 14, gap: 10 }, category: { gap: 7 }, categoryName: { color: colors.muted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }, assessmentRow: { flexDirection: 'row', gap: 6 }, assessment: { minWidth: 100, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, assessmentActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, assessmentTitle: { color: colors.text, fontSize: 11, fontWeight: '700' }, assessmentTitleActive: { color: colors.primary }, points: { color: colors.muted, fontSize: 9, marginTop: 3 }, smallAdd: { width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary }, tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 8 }, activeTitle: { color: colors.text, fontSize: 14, fontWeight: '800' }, activeMeta: { color: colors.muted, fontSize: 9, marginTop: 2 }, gradeHead: { marginLeft: 'auto', color: colors.muted, fontSize: 9 }, table: { backgroundColor: colors.surface, marginHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingBottom: 15 }, row: { minHeight: 62, flexDirection: 'row', alignItems: 'center' }, border: { borderTopWidth: 1, borderTopColor: colors.border }, nameWrap: { flex: 1 }, name: { color: colors.text, fontSize: 11, fontWeight: '700' }, studentId: { color: colors.muted, fontSize: 9, marginTop: 3 }, score: { width: 70, height: 36, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, textAlign: 'center', color: colors.text }, scoreInvalid: { borderColor: colors.danger }, final: { width: 55, textAlign: 'right', color: colors.success, fontWeight: '800', fontSize: 12 }, low: { color: colors.danger }, footer: { padding: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }, save: { backgroundColor: colors.primary, height: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#fff', fontWeight: '800', fontSize: 14 }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0b193099' }, modal: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, paddingBottom: 35 }, modalHead: { flexDirection: 'row', justifyContent: 'space-between' }, modalTitle: { color: colors.text, fontSize: 19, fontWeight: '800' }, modalCopy: { color: colors.muted, fontSize: 10, marginTop: 3 }, label: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 18, marginBottom: 7 }, categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, categoryOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 }, categoryOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, categoryOptionText: { color: colors.muted, fontSize: 10 }, categoryOptionTextActive: { color: colors.primary, fontWeight: '700' }, input: { height: 47, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.background } });
