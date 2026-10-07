import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme';

export type MessageModalVariant = 'default' | 'danger';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: MessageModalVariant;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const AppMessageModal = ({ visible, title, message, confirmLabel = 'Continue', cancelLabel = 'Cancel', variant = 'default', busy = false, onConfirm, onCancel }: Props) => <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.backdrop}><View style={styles.card}><Text style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text><View style={styles.actions}><Pressable disabled={busy} onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>{cancelLabel}</Text></Pressable><Pressable disabled={busy} onPress={onConfirm} style={[styles.confirm, variant === 'danger' && styles.danger, busy && styles.disabled]}><Text style={styles.confirmText}>{busy ? 'Please wait…' : confirmLabel}</Text></Pressable></View></View></View></Modal>;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0B193099', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 20, backgroundColor: colors.surface, padding: 20 },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  message: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 9 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 22 },
  cancel: { flex: 1, height: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  confirm: { flex: 1, height: 44, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  danger: { backgroundColor: colors.danger },
  confirmText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  disabled: { opacity: .55 },
});
