import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, ErrorState, LoadingState, ScreenHeader, StatusPill } from '@/shared/components/ui';
import { STUDENT_QUERY } from '../graphql/queries/getStudentProfile';
import { colors } from '@/core/theme';
import { Attendance, Classroom, Grade, Student } from '@/core/types';

type ProfileData = { student: { student: Student; overallGrade: number; attendanceRate: number; classes: { classroom: Classroom; averageGrade?: number; attendanceRate: number }[]; recentAttendance: Attendance[]; grades: Grade[] } };

const StudentProfileScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refetch } = useQuery<ProfileData>(STUDENT_QUERY, { variables: { id }, skip: !id });
  if (loading && !data) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="Student Profile" onBack={router.back} /><LoadingState /></View>;
  if (error && !data) return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="Student Profile" onBack={router.back} /><ErrorState message={error.message} retry={refetch} /></View>;
  const profile = data!.student;
  return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="Student Profile" onBack={router.back} /><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.identity}><Avatar name={profile.student.fullName} size={72} /><Text style={styles.name}>{profile.student.fullName}</Text><Text style={styles.id}>ID: {profile.student.studentNo}</Text><Text style={styles.className}>{profile.classes[0]?.classroom.displayName ?? 'No enrolled class'}</Text></View>
    <View style={styles.metrics}><Metric value={`${profile.attendanceRate}%`} label="Attendance" color={colors.success} bg={colors.successSoft} /><Metric value={profile.overallGrade.toFixed(1)} label="Average grade" color={colors.purple} bg={colors.purpleSoft} /></View>
    <Text style={styles.section}>Class performance</Text>
    <Card style={styles.classCard}>{profile.classes.map((entry, index) => <View key={entry.classroom.id} style={[styles.classRow, index > 0 && styles.border]}><View style={styles.classIcon}><Ionicons name="book-outline" size={19} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.subject}>{entry.classroom.subject}</Text><Text style={styles.meta}>{entry.classroom.section} · {entry.attendanceRate}% attendance</Text></View><Text style={[styles.grade, (entry.averageGrade ?? 100) < 75 && { color: colors.danger }]}>{entry.averageGrade?.toFixed(1) ?? '—'}</Text></View>)}</Card>
    <Text style={styles.section}>Recent attendance</Text>
    <Card style={styles.attendanceCard}>{profile.recentAttendance.length ? profile.recentAttendance.map((item, index) => <View key={item.id} style={[styles.attendanceRow, index > 0 && styles.border]}><Text style={styles.attendanceDate}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(item.date))}</Text><StatusPill status={item.status} /><Text style={styles.attendanceTime}>{item.checkedAt ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(item.checkedAt)) : '—'}</Text></View>) : <Text style={styles.empty}>No attendance has been recorded.</Text>}</Card>
  </ScrollView></View>;
}

export default StudentProfileScreen;

const Metric = ({ value, label, color, bg }: { value: string; label: string; color: string; bg: string }) => <View style={[styles.metric, { backgroundColor: bg }]}><Text style={[styles.metricValue, { color }]}>{value}</Text><Text style={[styles.metricLabel, { color }]}>{label}</Text></View>;
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 35 }, identity: { alignItems: 'center', paddingVertical: 9 }, name: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 10 }, id: { color: colors.muted, fontSize: 11, marginTop: 4 }, className: { color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 5 }, metrics: { flexDirection: 'row', gap: 10, marginTop: 14 }, metric: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 17 }, metricValue: { fontSize: 22, fontWeight: '800' }, metricLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' }, section: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 23, marginBottom: 9 }, classCard: { paddingVertical: 3 }, classRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11 }, border: { borderTopWidth: 1, borderTopColor: colors.border }, classIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, subject: { color: colors.text, fontWeight: '700', fontSize: 13 }, meta: { color: colors.muted, fontSize: 10, marginTop: 3 }, grade: { color: colors.success, fontWeight: '800', fontSize: 15 }, attendanceCard: { paddingVertical: 3 }, attendanceRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center' }, attendanceDate: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '600' }, attendanceTime: { width: 65, textAlign: 'right', color: colors.muted, fontSize: 10 }, empty: { color: colors.muted, textAlign: 'center', padding: 20 } });
