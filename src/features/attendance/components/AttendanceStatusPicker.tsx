/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AttendanceStatus, Student } from "@/core/types";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
const { spacing, typography, colors, borderRadius } = theme;
const options: Array<{
  status: AttendanceStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = [
  {
    status: "PRESENT",
    label: "Present",
    icon: "checkmark-circle-outline",
    color: colors.success,
  },
  {
    status: "ABSENT",
    label: "Absent",
    icon: "close-circle-outline",
    color: colors.danger,
  },
  {
    status: "LATE",
    label: "Late",
    icon: "time-outline",
    color: colors.warning,
  },
  {
    status: "EXCUSED",
    label: "Excused",
    icon: "document-text-outline",
    color: colors.primary,
  },
];
type Props = {
  student: Student;
  status?: AttendanceStatus;
  reason?: string;
  saving?: boolean;
  onSelect: (status: AttendanceStatus, reason?: string) => void;
};
export const AttendanceStatusPicker = ({
  student,
  status,
  reason: currentReason,
  saving = false,
  onSelect,
}: Props) => {
  const [visible, setVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>();
  const [reason, setReason] = useState("");
  const selection = options.find((option) => option.status === status);
  useEffect(() => {
    if (!visible) return;
    setSelectedStatus(status);
    setReason(currentReason ?? "");
  }, [visible, status, currentReason]);
  const choose = (nextStatus: AttendanceStatus) => {
    setSelectedStatus(nextStatus);
    if (nextStatus !== "EXCUSED") {
      setVisible(false);
      onSelect(nextStatus);
    }
  };
  const saveExcused = () => {
    if (!reason.trim()) return;
    setVisible(false);
    onSelect("EXCUSED", reason.trim());
  };
  return (
    <>
      <Pressable
        accessibilityLabel={`Set attendance for ${student.fullName}`}
        onPress={() => setVisible(true)}
        style={[
          styles.trigger,
          selection && {
            borderColor: selection.color,
          },
        ]}
      >
        <Ionicons
          name={selection?.icon ?? "add-circle-outline"}
          size={moderateScale(17)}
          color={selection?.color ?? colors.primary}
        />
        <Text
          style={[
            styles.triggerText,
            {
              color: selection?.color ?? colors.primary,
            },
          ]}
        >
          {selection?.label ?? "Mark"}
        </Text>
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.head}>
              <View>
                <Text style={styles.title}>Mark attendance</Text>
                <Text style={styles.subtitle}>{student.fullName}</Text>
              </View>
              <Pressable onPress={() => setVisible(false)}>
                <Ionicons
                  name="close"
                  size={moderateScale(25)}
                  color={colors.text}
                />
              </Pressable>
            </View>
            <View style={styles.grid}>
              {options.map((option) => (
                <Pressable
                  key={option.status}
                  disabled={saving}
                  onPress={() => choose(option.status)}
                  style={[
                    styles.choice,
                    selectedStatus === option.status && {
                      borderColor: option.color,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={moderateScale(21)}
                    color={option.color}
                  />
                  <Text
                    style={[
                      styles.choiceText,
                      {
                        color: option.color,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {selectedStatus === "EXCUSED" && (
              <>
                <Text style={styles.reasonLabel}>
                  Reason for excused absence
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="e.g. Medical appointment"
                  placeholderTextColor={colors.placeholder}
                  style={styles.reasonInput}
                  autoFocus
                />
                <Pressable
                  disabled={saving || !reason.trim()}
                  onPress={saveExcused}
                  style={[
                    styles.save,
                    (saving || !reason.trim()) && styles.disabled,
                  ]}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Saving…" : "Save excused absence"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};
const styles = StyleSheet.create({
  trigger: {
    minWidth: moderateScale(55),
    height: moderateScale(32),
    paddingHorizontal: spacing(1),
    borderRadius: borderRadius.medium,
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.5),
  },
  triggerText: {
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing(1.5),
  },
  title: {
    color: colors.text,
    fontSize: typography.fontSize.large,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.5),
    fontFamily: typography.fontFamily.regular,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1.25),
    marginTop: spacing(0.75),
  },
  choice: {
    width: "47%",
    minHeight: moderateScale(65),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.large,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.625),
  },
  choiceText: {
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  reasonLabel: {
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing(2),
    fontFamily: typography.fontFamily.bold,
  },
  reasonInput: {
    height: moderateScale(47),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.625),
    color: colors.text,
    marginTop: spacing(1),
  },
  save: {
    height: moderateScale(49),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing(2.25),
  },
  saveText: {
    color: colors.surface,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.bold,
  },
  disabled: {
    opacity: 0.5,
  },
});
