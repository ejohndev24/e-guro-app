import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '@/core/theme';

export const ScreenHeader = ({ title, subtitle, onBack, action }: { title: string; subtitle?: string; onBack?: () => void; action?: ReactNode }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{onBack && <Pressable onPress={onBack} hitSlop={12}><Ionicons name="chevron-back" size={25} color={colors.text} /></Pressable>}</View>
      <View style={styles.headerCopy}><Text style={styles.headerTitle}>{title}</Text>{subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}</View>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{action}</View>
    </View>
  );
}

export const Card = ({ children, style }: { children: ReactNode; style?: object }) => {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const Avatar = ({ name, size = 44 }: { name: string; size?: number }) => {
  const initials = name.split(/[ ,]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const palette = ['#DDEAFF', '#DFF7E9', '#FDE7E7', '#F3E6FF'];
  const backgroundColor = palette[name.length % palette.length];
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}><Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text></View>;
}

export const StatusPill = ({ status }: { status: string }) => {
  const success = status === 'PRESENT';
  const warning = status === 'LATE' || status === 'EXCUSED';
  return <View style={[styles.pill, { backgroundColor: success ? colors.successSoft : warning ? colors.warningSoft : colors.dangerSoft }]}><Text style={{ fontSize: 11, fontWeight: '700', color: success ? colors.success : warning ? colors.warning : colors.danger }}>{status[0] + status.slice(1).toLowerCase()}</Text></View>;
}

export const LoadingState = () => {
  return <View style={styles.state}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.stateText}>Loading…</Text></View>;
}

export const ErrorState = ({ message, retry }: { message?: string; retry?: () => void }) => {
  return <View style={styles.state}><Ionicons name="cloud-offline-outline" size={42} color={colors.muted} /><Text style={styles.errorTitle}>Couldn’t load this page</Text><Text style={styles.stateText}>{message ?? 'Check that the API is running and try again.'}</Text>{retry && <Pressable style={styles.retry} onPress={() => retry()}><Text style={styles.retryText}>Try again</Text></Pressable>}</View>;
}

export const EmptyState = ({ title, detail }: { title: string; detail: string }) => {
  return <View style={styles.state}><Ionicons name="file-tray-outline" size={42} color={colors.muted} /><Text style={styles.errorTitle}>{title}</Text><Text style={styles.stateText}>{detail}</Text></View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerSide: { width: 42 },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.muted, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, ...shadow },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryDark, fontWeight: '800' },
  pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  state: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 10 },
  stateText: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
  errorTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  retry: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});
