import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '@/core/theme';
import { AttendanceStatus, Student } from '@/core/types';

const options: Array<{ status: AttendanceStatus; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
  { status: 'PRESENT', label: 'Present', icon: 'checkmark-circle-outline', color: colors.success },
  { status: 'ABSENT', label: 'Absent', icon: 'close-circle-outline', color: colors.danger },
  { status: 'LATE', label: 'Late', icon: 'time-outline', color: colors.warning },
  { status: 'EXCUSED', label: 'Excused', icon: 'document-text-outline', color: colors.primary },
];

type Props = {
  student: Student;
  status?: AttendanceStatus;
  reason?: string;
  saving?: boolean;
  onSelect: (status: AttendanceStatus, reason?: string) => void;
};

export const AttendanceStatusPicker = ({ student, status, reason: currentReason, saving = false, onSelect }: Props) => {
  const [visible, setVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>();
  const [reason, setReason] = useState('');
  const selection = options.find((option) => option.status === status);

  useEffect(() => {
    if (!visible) return;
    setSelectedStatus(status);
    setReason(currentReason ?? '');
  }, [visible, status, currentReason]);

  const choose = (nextStatus: AttendanceStatus) => {
    setSelectedStatus(nextStatus);
    if (nextStatus !== 'EXCUSED') {
      setVisible(false);
      onSelect(nextStatus);
    }
  };

  const saveExcused = () => {
    if (!reason.trim()) return;
    setVisible(false);
    onSelect('EXCUSED', reason.trim());
  };

  return <>
    <Pressable accessibilityLabel={`Set attendance for ${student.fullName}`} onPress={() => setVisible(true)} style={[styles.trigger, selection && { borderColor: selection.color }]}><Ionicons name={selection?.icon ?? 'add-circle-outline'} size={17} color={selection?.color ?? colors.primary} /><Text style={[styles.triggerText, { color: selection?.color ?? colors.primary }]}>{selection?.label ?? 'Mark'}</Text></Pressable>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}><View style={styles.backdrop}><View style={styles.card}><View style={styles.head}><View><Text style={styles.title}>Mark attendance</Text><Text style={styles.subtitle}>{student.fullName}</Text></View><Pressable onPress={() => setVisible(false)}><Ionicons name="close" size={25} color={colors.text} /></Pressable></View><View style={styles.grid}>{options.map((option) => <Pressable key={option.status} disabled={saving} onPress={() => choose(option.status)} style={[styles.choice, selectedStatus === option.status && { borderColor: option.color, borderWidth: 2 }]}><Ionicons name={option.icon} size={21} color={option.color} /><Text style={[styles.choiceText, { color: option.color }]}>{option.label}</Text></Pressable>)}</View>{selectedStatus === 'EXCUSED' && <><Text style={styles.reasonLabel}>Reason for excused absence</Text><TextInput value={reason} onChangeText={setReason} placeholder="e.g. Medical appointment" placeholderTextColor="#98A2B3" style={styles.reasonInput} autoFocus /><Pressable disabled={saving || !reason.trim()} onPress={saveExcused} style={[styles.save, (saving || !reason.trim()) && styles.disabled]}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save excused absence'}</Text></Pressable></>}</View></View></Modal>
  </>;
};

const styles = StyleSheet.create({
  trigger: { minWidth: 55, height: 32, paddingHorizontal: 8, borderRadius: 9, borderWidth: 1, borderColor: '#BBD2F8', backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  triggerText: { fontSize: 9, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: '#0B193099', justifyContent: 'flex-end' },
  card: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: colors.text, fontSize: 21, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  choice: { width: '47%', minHeight: 65, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 5 },
  choiceText: { fontSize: 12, fontWeight: '800' },
  reasonLabel: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 16 },
  reasonInput: { height: 47, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, color: colors.text, marginTop: 8 },
  save: { height: 49, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  disabled: { opacity: .5 },
});
