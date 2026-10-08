/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
const { spacing, typography, colors, borderRadius } = theme;
export type MessageModalVariant = "default" | "danger";
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
export const AppMessageModal = ({
  visible,
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  variant = "default",
  busy = false,
  onConfirm,
  onCancel,
}: Props) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Pressable disabled={busy} onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={onConfirm}
            style={[
              styles.confirm,
              variant === "danger" && styles.danger,
              busy && styles.disabled,
            ]}
          >
            <Text style={styles.confirmText}>
              {busy ? "Please wait…" : confirmLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(3),
  },
  card: {
    width: "100%",
    maxWidth: moderateScale(380),
    borderRadius: borderRadius.large,
    backgroundColor: colors.surface,
    padding: spacing(2.5),
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    fontSize: typography.fontSize.semiLarge,
    lineHeight: typography.lineHeight.semiLarge,
    fontWeight: typography.fontWeight.bold,
  },
  message: {
    fontFamily: typography.fontFamily.regular,
    color: colors.muted,
    fontSize: typography.fontSize.medium,
    lineHeight: typography.lineHeight.medium,
    marginTop: spacing(1.125),
  },
  actions: {
    flexDirection: "row",
    gap: spacing(1.125),
    marginTop: spacing(2.75),
  },
  cancel: {
    flex: 1,
    height: moderateScale(44),
    borderRadius: borderRadius.medium,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
  },
  confirm: {
    flex: 1,
    height: moderateScale(44),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  danger: {
    backgroundColor: colors.danger,
  },
  confirmText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.surface,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
  },
  disabled: {
    opacity: 0.55,
  },
});
