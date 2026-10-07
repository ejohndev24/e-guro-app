import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, ErrorState, LoadingState } from '@/shared/components/ui';
import { DASHBOARD_QUERY } from '../graphql/queries/getDashboard';
import { colors, shadow } from '@/core/theme';
import { Classroom, Student } from '@/core/types';
import { useAuth } from '@/core/auth/AuthProvider';

type DashboardData = {
  dashboard: {
    teacherName: string;
    stats: { classCount: number; studentCount: number; attendanceRate: number; pendingGrades: number };
    classes: Classroom[];
    atRisk: { student: Student; classroom: Classroom; currentGrade: number }[];
  };
};

const statStyle = [
  { icon: 'library' as const, color: colors.primary, bg: colors.primarySoft },
  { icon: 'people' as const, color: colors.success, bg: colors.successSoft },
  { icon: 'checkmark-circle' as const, color: colors.success, bg: colors.successSoft },
  { icon: 'document-text' as const, color: colors.warning, bg: colors.warningSoft },
];

const DashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { data, loading, error, refetch } = useQuery<DashboardData>(DASHBOARD_QUERY);
  if (loading && !data) return <View style={[styles.full, { paddingTop: insets.top }]}><LoadingState /></View>;
  if (error && !data) return <View style={[styles.full, { paddingTop: insets.top }]}><ErrorState message={error.message} retry={refetch} /></View>;
  const dashboard = data!.dashboard;
  const stats = [
    ['My Classes', dashboard.stats.classCount],
    ['Students', dashboard.stats.studentCount],
    ['Attendance', `${dashboard.stats.attendanceRate}%`],
    ['Pending Grades', dashboard.stats.pendingGrades],
  ] as const;
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const todaysClasses = dashboard.classes.filter((item) => item.scheduleDay.split(',').some((day) => day.trim().toLowerCase() === weekday.toLowerCase()));

  return (
    <ScrollView style={styles.full} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#fff" />}>
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroTop}><Pressable onPress={() => router.push('/settings' as never)} hitSlop={10}><Ionicons name="settings-outline" size={24} color="#fff" /></Pressable><Text style={styles.brand}>E-Guro</Text><Pressable onPress={signOut} hitSlop={10}><Ionicons name="log-out-outline" size={22} color="#fff" /></Pressable></View>
        <Text style={styles.greeting}>Good morning, {dashboard.teacherName.split(' ')[0]}!</Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map(([label, value], index) => (
          <Card key={label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: statStyle[index]!.bg }]}><Ionicons name={statStyle[index]!.icon} size={20} color={statStyle[index]!.color} /></View>
            <Text style={styles.statValue}>{value}</Text><Text numberOfLines={1} style={styles.statLabel}>{label}</Text>
          </Card>
        ))}
      </View>

      <View style={styles.body}>
        <SectionTitle title="Today's schedule" action="View all" onPress={() => router.push('/classes')} />
        <Card style={styles.scheduleCard}>
          {todaysClasses.length ? todaysClasses.map((item, index) => (
            <Pressable key={item.id} onPress={() => router.push(`/class/${item.id}`)} style={[styles.scheduleRow, index > 0 && styles.rowBorder]}>
              <View style={styles.timeWrap}><Text style={styles.time}>{formatTime(item.startTime)}</Text><View style={styles.timelineDot} /></View>
              <View style={styles.scheduleCopy}><Text style={styles.subject}>{item.gradeLevel === 0 ? 'Kindergarten' : `Grade/Year ${item.gradeLevel}`} - {item.subject}</Text><Text style={styles.meta}>{item.section} · {item.room}</Text></View>
              <Ionicons name="chevron-forward" size={18} color="#B2BBC8" />
            </Pressable>
          )) : <View style={styles.scheduleEmpty}><Ionicons name="calendar-outline" size={27} color={colors.muted} /><View style={{ flex: 1 }}><Text style={styles.emptyTitle}>{dashboard.classes.length ? 'No classes scheduled today' : 'No classes assigned yet'}</Text><Text style={styles.meta}>{dashboard.classes.length ? 'Open My Classes to view your full schedule.' : 'Ask your school administrator to create and assign a class.'}</Text></View></View>}
        </Card>

        <SectionTitle title="Quick actions" />
        <View style={styles.actions}>
          <QuickAction icon="checkbox" label="Take attendance" color={colors.success} background={colors.successSoft} onPress={() => dashboard.classes[0] && router.push(`/class/${dashboard.classes[0].id}`)} />
          <QuickAction icon="people" label="Manage students" color={colors.primary} background={colors.primarySoft} onPress={() => router.push('/students')} />
          <QuickAction icon="document-text" label="Encode grades" color={colors.warning} background={colors.warningSoft} onPress={() => dashboard.classes[0] && router.push(`/grades/${dashboard.classes[0].id}`)} />
          <QuickAction icon="bar-chart" label="Reports" color={colors.purple} background={colors.purpleSoft} onPress={() => router.push('/reports')} />
        </View>

        {dashboard.atRisk.length > 0 && <>
          <SectionTitle title="Students to check in with" />
          <Card style={styles.riskCard}>
            {dashboard.atRisk.slice(0, 3).map((entry, index) => (
              <Pressable key={`${entry.classroom.id}-${entry.student.id}`} onPress={() => router.push(`/student/${entry.student.id}`)} style={[styles.riskRow, index > 0 && styles.rowBorder]}>
                <View style={styles.riskInitial}><Text style={styles.riskInitialText}>{entry.student.firstName[0]}</Text></View>
                <View style={{ flex: 1 }}><Text style={styles.subject}>{entry.student.fullName}</Text><Text style={styles.meta}>{entry.classroom.subject}</Text></View>
                <Text style={styles.riskGrade}>{entry.currentGrade.toFixed(1)}</Text>
              </Pressable>
            ))}
          </Card>
        </>}
      </View>
    </ScrollView>
  );
}

export default DashboardScreen;

const SectionTitle = ({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) => {
  return <View style={styles.sectionTitle}><Text style={styles.sectionText}>{title}</Text>{action && <Pressable onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></Pressable>}</View>;
}

const QuickAction = ({ icon, label, color, background, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; background: string; onPress: () => void }) => {
  return <Pressable onPress={onPress} style={styles.action}><View style={[styles.actionIcon, { backgroundColor: background }]}><Ionicons name={icon} size={24} color={color} /></View><Text style={styles.actionLabel}>{label}</Text></Pressable>;
}

const formatTime = (time: string) => {
  const [hourText, minute = '00'] = time.split(':');
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 28 },
  hero: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 48, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  brand: { color: '#DCE9FF', fontWeight: '700', fontSize: 13 },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '800' },
  date: { color: '#DCE9FF', fontSize: 13, marginTop: 5 },
  statsGrid: { flexDirection: 'row', marginTop: -27, paddingHorizontal: 16, gap: 7 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 4, borderRadius: 13, ...shadow },
  statIcon: { width: 33, height: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  statValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 8.5, fontWeight: '600', marginTop: 2 },
  body: { paddingHorizontal: 16 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  sectionAction: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  scheduleCard: { paddingVertical: 4, paddingHorizontal: 14 },
  scheduleEmpty: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  emptyTitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  scheduleRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center' },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  timeWrap: { width: 75, flexDirection: 'row', alignItems: 'center' },
  time: { width: 61, color: colors.text, fontSize: 12, fontWeight: '600' },
  timelineDot: { width: 4, height: 28, borderRadius: 3, backgroundColor: colors.primary },
  scheduleCopy: { flex: 1, paddingLeft: 13 },
  subject: { color: colors.text, fontSize: 13, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 3, borderWidth: 1, borderColor: colors.border },
  actionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { color: colors.text, fontSize: 9, lineHeight: 12, fontWeight: '600', textAlign: 'center' },
  riskCard: { paddingVertical: 4 },
  riskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 11 },
  riskInitial: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  riskInitialText: { color: colors.danger, fontWeight: '800' },
  riskGrade: { color: colors.danger, backgroundColor: colors.dangerSoft, overflow: 'hidden', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, fontWeight: '800' },
});
