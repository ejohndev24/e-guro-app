import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, ErrorState, LoadingState } from '@/shared/components/ui';
import { REPORTS_QUERY } from '../graphql/queries/getReports';
import { colors } from '@/core/theme';

type Data = { dashboard: { stats: { classCount: number; studentCount: number; attendanceRate: number; pendingGrades: number }; atRisk: { student: { id: string; fullName: string }; classroom: { subject: string }; currentGrade: number }[] } };

const ReportsScreen = () => {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refetch } = useQuery<Data>(REPORTS_QUERY);
  if (loading && !data) return <View style={[styles.screen, { paddingTop: insets.top }]}><LoadingState /></View>;
  if (error && !data) return <View style={[styles.screen, { paddingTop: insets.top }]}><ErrorState message={error.message} retry={refetch} /></View>;
  const stats = data!.dashboard.stats;
  return <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 30 }}>
    <View style={styles.heading}><Text style={styles.eyebrow}>INSIGHTS</Text><Text style={styles.title}>Class Reports</Text></View>
    <View style={styles.grid}><Metric icon="checkmark-done" label="Attendance rate" value={`${stats.attendanceRate}%`} color={colors.success} bg={colors.successSoft} /><Metric icon="people" label="Active students" value={String(stats.studentCount)} color={colors.primary} bg={colors.primarySoft} /><Metric icon="documents" label="Classes" value={String(stats.classCount)} color={colors.purple} bg={colors.purpleSoft} /><Metric icon="alert-circle" label="Grades pending" value={String(stats.pendingGrades)} color={colors.warning} bg={colors.warningSoft} /></View>
    <Text style={styles.section}>Needs attention</Text>
    <Card style={styles.riskCard}>{data!.dashboard.atRisk.length ? data!.dashboard.atRisk.map((entry, i) => <View key={entry.student.id} style={[styles.riskRow, i > 0 && styles.border]}><View style={styles.alert}><Ionicons name="trending-down" color={colors.danger} size={18} /></View><View style={{ flex: 1 }}><Text style={styles.name}>{entry.student.fullName}</Text><Text style={styles.meta}>{entry.classroom.subject}</Text></View><Text style={styles.grade}>{entry.currentGrade.toFixed(1)}</Text></View>) : <Text style={styles.empty}>No students are below the 75-point threshold.</Text>}</Card>
    <Text style={styles.note}>Reports update from the same attendance and grade data used throughout the app.</Text>
  </ScrollView>;
}

export default ReportsScreen;

const Metric = ({ icon, label, value, color, bg }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string; bg: string }) => <Card style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={22} color={color} /></View><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></Card>;
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, heading: { paddingHorizontal: 20 }, eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' }, title: { fontSize: 27, fontWeight: '800', color: colors.text, marginTop: 2 }, grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 }, metric: { width: '48.5%', minHeight: 145 }, metricIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, value: { fontSize: 25, fontWeight: '800', color: colors.text }, label: { color: colors.muted, fontSize: 12, marginTop: 3 }, section: { color: colors.text, fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginBottom: 10 }, riskCard: { marginHorizontal: 16, paddingVertical: 4 }, riskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 11 }, border: { borderTopWidth: 1, borderTopColor: colors.border }, alert: { width: 37, height: 37, borderRadius: 11, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }, name: { color: colors.text, fontWeight: '700', fontSize: 13 }, meta: { color: colors.muted, fontSize: 11, marginTop: 3 }, grade: { color: colors.danger, fontWeight: '800' }, empty: { color: colors.muted, textAlign: 'center', padding: 20 }, note: { margin: 20, color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' } });
