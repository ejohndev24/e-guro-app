import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, ErrorState, LoadingState, ScreenHeader, StatusPill } from '@/shared/components/ui';
import { STUDENT_QUERY } from '../graphql/queries/getStudentProfile';
import { StudentModal } from './StudentsScreen';
import { colors } from '@/core/theme';
import { Attendance, Classroom, Grade, Student } from '@/core/types';

type Tab = 'overview' | 'grades' | 'attendance' | 'details';
type ProfileData = { student: { student: Student; overallGrade: number; attendanceRate: number; classes: { classroom: Classroom; averageGrade?: number | null; attendanceRate: number }[]; recentAttendance: Attendance[]; grades: Grade[] } };

const StudentProfileScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const { data, loading, error, refetch } = useQuery<ProfileData>(STUDENT_QUERY, { variables: { id }, skip: !id, fetchPolicy: 'network-only' });
  if (loading && !data) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="Student Profile" onBack={router.back} /><LoadingState /></View>;
  if (error && !data) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="Student Profile" onBack={router.back} /><ErrorState message={error.message} retry={refetch} /></View>;
  const profile = data!.student;

  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <ScreenHeader title="Student Profile" onBack={router.back} action={<Pressable accessibilityLabel="Edit student" onPress={() => setEditing(true)}><Ionicons name="pencil-outline" size={21} color={colors.primary} /></Pressable>} />
    <View style={styles.identity}><Avatar name={profile.student.fullName} size={58} /><View style={{ flex: 1 }}><Text style={styles.name}>{profile.student.fullName}</Text><Text style={styles.id}>ID: {profile.student.studentNo}</Text><Text style={styles.className}>{profile.classes[0]?.classroom.displayName ?? 'No enrolled class'}</Text></View></View>
    <View style={styles.tabs}>{(['overview', 'grades', 'attendance', 'details'] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item[0]!.toUpperCase() + item.slice(1)}</Text></Pressable>)}</View>
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {tab === 'overview' && <><View style={styles.metrics}><Metric value={`${profile.attendanceRate}%`} label="Attendance" color={colors.success} bg={colors.successSoft} /><Metric value={profile.grades.length ? profile.overallGrade.toFixed(1) : '—'} label="Average grade" color={colors.purple} bg={colors.purpleSoft} /></View><Text style={styles.section}>Current subjects</Text><ClassPerformance classes={profile.classes} /></>}
      {tab === 'grades' && <><Text style={styles.sectionFirst}>Subject performance</Text><ClassPerformance classes={profile.classes} /><Text style={styles.note}>Quarterly and final grades come from the same encoded class records used in Reports.</Text></>}
      {tab === 'attendance' && <><Text style={styles.sectionFirst}>Recent attendance</Text><Card>{profile.recentAttendance.length ? profile.recentAttendance.map((item, index) => <View key={item.id} style={[styles.attendanceRow, index > 0 && styles.border]}><Text style={styles.attendanceDate}>{new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(item.date))}</Text><StatusPill status={item.status} /><Text style={styles.attendanceTime}>{item.checkedAt ? new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(item.checkedAt)) : '—'}</Text></View>) : <Text style={styles.empty}>No attendance has been recorded.</Text>}</Card></>}
      {tab === 'details' && <><Text style={styles.sectionFirst}>Student information</Text><Card><Detail label="Full name" value={profile.student.fullName} /><Detail label="Student ID" value={profile.student.studentNo} /><Detail label="LRN" value={profile.student.lrn ?? 'Not provided'} /><Detail label="Birth date" value={profile.student.birthDate?.slice(0, 10) ?? 'Not provided'} /><Detail label="Sex" value={profile.student.sex ? profile.student.sex[0] + profile.student.sex.slice(1).toLowerCase() : 'Not provided'} /><Detail label="Email" value={profile.student.email ?? 'Not provided'} /><Detail label="Enrolled subjects" value={String(profile.classes.length)} /></Card></>}
    </ScrollView>
    <StudentModal visible={editing} student={profile.student} classes={profile.classes.map((entry) => entry.classroom)} initialClassroomIds={profile.classes.map((entry) => entry.classroom.id)} close={() => setEditing(false)} completed={async () => { setEditing(false); await refetch(); }} />
  </View>;
};

export default StudentProfileScreen;

const Metric = ({ value, label, color, bg }: { value: string; label: string; color: string; bg: string }) => <View style={[styles.metric, { backgroundColor: bg }]}><Text style={[styles.metricValue, { color }]}>{value}</Text><Text style={[styles.metricLabel, { color }]}>{label}</Text></View>;
const Detail = ({ label, value }: { label: string; value: string }) => <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
const ClassPerformance = ({ classes }: { classes: ProfileData['student']['classes'] }) => <Card>{classes.length ? classes.map((entry, index) => <Pressable key={entry.classroom.id} onPress={() => router.push(`/class/${entry.classroom.id}`)} style={[styles.classRow, index > 0 && styles.border]}><View style={styles.classIcon}><Ionicons name="book-outline" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.subject}>{entry.classroom.subject}</Text><Text style={styles.meta}>{entry.classroom.section} · {entry.attendanceRate}% attendance</Text></View><Text style={[styles.grade, (entry.averageGrade ?? 100) < 75 && styles.low]}>{entry.averageGrade?.toFixed(1) ?? '—'}</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>) : <Text style={styles.empty}>No enrolled subjects.</Text>}</Card>;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 18, paddingBottom: 13 },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  id: { color: colors.muted, fontSize: 10, marginTop: 3 },
  className: { color: colors.primary, fontSize: 10, fontWeight: '600', marginTop: 3 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
  tabTextActive: { color: colors.primary, fontWeight: '800' },
  content: { padding: 15, paddingBottom: 35 },
  metrics: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 16 },
  metricValue: { fontSize: 21, fontWeight: '800' },
  metricLabel: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  section: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 22, marginBottom: 9 },
  sectionFirst: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 9 },
  classRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 9 },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  classIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  subject: { color: colors.text, fontWeight: '700', fontSize: 12 },
  meta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  grade: { color: colors.success, fontWeight: '800', fontSize: 14 },
  low: { color: colors.danger },
  attendanceRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  attendanceDate: { flex: 1, color: colors.text, fontSize: 10, fontWeight: '600' },
  attendanceTime: { width: 65, textAlign: 'right', color: colors.muted, fontSize: 9 },
  detailRow: { flexDirection: 'row', paddingVertical: 7 },
  detailLabel: { flex: 1, color: colors.muted, fontSize: 11 },
  detailValue: { flex: 1.3, color: colors.text, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  note: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 15 },
  empty: { color: colors.muted, textAlign: 'center', padding: 20 },
});
