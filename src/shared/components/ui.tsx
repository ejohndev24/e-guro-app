/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "react-native-size-matters";
import { theme, shadow } from "@/core/theme";
const { spacing, typography, colors, borderRadius } = theme;
export const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={spacing(1.5)}>
            <Ionicons
              name="chevron-back"
              size={moderateScale(25)}
              color={colors.text}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      <View
        style={[
          styles.headerSide,
          {
            alignItems: "flex-end",
          },
        ]}
      >
        {action}
      </View>
    </View>
  );
};
export const Card = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) => {
  return <View style={[styles.card, style]}>{children}</View>;
};
export const Avatar = ({
  name,
  size = moderateScale(44),
}: {
  name: string;
  size?: number;
}) => {
  const initials = name
    .split(/[ ,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const palette = [
    colors.avatarBlue,
    colors.avatarGreen,
    colors.avatarRed,
    colors.avatarPurple,
  ];
  const backgroundColor = palette[name.length % palette.length];
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: borderRadius.full,
          backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          {
            fontSize:
              size <= moderateScale(40)
                ? typography.fontSize.small
                : typography.fontSize.medium,
            fontFamily: typography.fontFamily.regular,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};
export const StatusPill = ({ status }: { status: string }) => {
  const success = status === "PRESENT";
  const warning = status === "LATE" || status === "EXCUSED";
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: success
            ? colors.successSoft
            : warning
              ? colors.warningSoft
              : colors.dangerSoft,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily.bold,
          fontSize: typography.fontSize.small,
          fontWeight: typography.fontWeight.bold,
          color: success
            ? colors.success
            : warning
              ? colors.warning
              : colors.danger,
        }}
      >
        {status[0] + status.slice(1).toLowerCase()}
      </Text>
    </View>
  );
};
export const LoadingState = () => {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.stateText}>Loading…</Text>
    </View>
  );
};
export const ErrorState = ({
  message,
  retry,
}: {
  message?: string;
  retry?: () => void;
}) => {
  return (
    <View style={styles.state}>
      <Ionicons
        name="cloud-offline-outline"
        size={moderateScale(42)}
        color={colors.muted}
      />
      <Text style={styles.errorTitle}>Couldn’t load this page</Text>
      <Text style={styles.stateText}>
        {message ?? "Check that the API is running and try again."}
      </Text>
      {retry && (
        <Pressable style={styles.retry} onPress={() => retry()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
};
export const EmptyState = ({
  title,
  detail,
  icon = "file-tray-outline",
}: {
  title: string;
  detail: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) => {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={moderateScale(28)}
          color={colors.primary}
        />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{detail}</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  header: {
    minHeight: moderateScale(64),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(2.25),
    paddingVertical: spacing(1.25),
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerSide: {
    width: moderateScale(42),
  },
  headerCopy: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.semiLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.extraSmall,
    lineHeight: typography.lineHeight.extraSmall,
    color: colors.muted,
    marginTop: spacing(0.25),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    ...shadow,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primaryDark,
    fontWeight: typography.fontWeight.bold,
  },
  pill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.625),
  },
  state: {
    flex: 1,
    minHeight: moderateScale(320),
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(3.75),
    gap: spacing(1.25),
  },
  stateText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.medium,
    color: colors.muted,
    textAlign: "center",
    lineHeight: typography.lineHeight.medium,
  },
  emptyState: {
    flex: 1,
    minHeight: moderateScale(320),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(3.75),
  },
  emptyIcon: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: borderRadius.large,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing(1.625),
    fontFamily: typography.fontFamily.bold,
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.small,
    textAlign: "center",
    marginTop: spacing(0.75),
    fontFamily: typography.fontFamily.regular,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.semiLarge,
    lineHeight: typography.lineHeight.semiLarge,
  },
  retry: {
    marginTop: spacing(1),
    backgroundColor: colors.primary,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(2.25),
    paddingVertical: spacing(1.25),
  },
  retryText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.surface,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
  },
});
