/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
import { useQuery } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, ErrorState, LoadingState } from "@/shared/components/ui";
import { DASHBOARD_QUERY } from "@/features/dashboard/graphql/queries/getDashboard";
import { Classroom, Student } from "@/core/types";
import { useAuth } from "@/core/auth/AuthProvider";
import { moderateScale } from "react-native-size-matters";
import { theme, shadow } from "@/core/theme";
const { spacing, typography, colors, borderRadius } = theme;
type DashboardData = {
  dashboard: {
    teacherName: string;
    stats: {
      classCount: number;
      studentCount: number;
      attendanceRate: number;
      pendingGrades: number;
    };
    classes: Classroom[];
    atRisk: {
      student: Student;
      classroom: Classroom;
      currentGrade: number;
    }[];
  };
};
const statStyle = [
  {
    icon: "library" as const,
    color: colors.primary,
    bg: colors.primarySoft,
  },
  {
    icon: "people" as const,
    color: colors.success,
    bg: colors.successSoft,
  },
  {
    icon: "checkmark-circle" as const,
    color: colors.success,
    bg: colors.successSoft,
  },
  {
    icon: "document-text" as const,
    color: colors.warning,
    bg: colors.warningSoft,
  },
];
const DashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const useCompactStats = width < moderateScale(360);
  const { signOut } = useAuth();
  const { data, loading, error, refetch } =
    useQuery<DashboardData>(DASHBOARD_QUERY);
  if (loading && !data)
    return (
      <View
        style={[
          styles.full,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <LoadingState />
      </View>
    );
  if (error && !data)
    return (
      <View
        style={[
          styles.full,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ErrorState message={error.message} retry={refetch} />
      </View>
    );
  const dashboard = data!.dashboard;
  const stats = [
    ["My Classes", dashboard.stats.classCount],
    ["Students", dashboard.stats.studentCount],
    ["Attendance", `${dashboard.stats.attendanceRate}%`],
    ["Pending Grades", dashboard.stats.pendingGrades],
  ] as const;
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(new Date());
  const todaysClasses = dashboard.classes.filter((item) =>
    item.scheduleDay
      .split(",")
      .some((day) => day.trim().toLowerCase() === weekday.toLowerCase()),
  );
  return (
    <ScrollView
      style={styles.full}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refetch}
          tintColor={colors.surface}
        />
      }
    >
      <View
        style={[
          styles.hero,
          {
            paddingTop: insets.top + spacing(1.5),
          },
        ]}
      >
        <View style={styles.heroTop}>
          <Pressable
            onPress={() => router.push("/settings" as never)}
            hitSlop={spacing(1.25)}
          >
            <Ionicons
              name="settings-outline"
              size={moderateScale(24)}
              color={colors.surface}
            />
          </Pressable>
          <Text style={styles.brand}>E-Guro</Text>
          <Pressable onPress={signOut} hitSlop={spacing(1.25)}>
            <Ionicons
              name="log-out-outline"
              size={moderateScale(22)}
              color={colors.surface}
            />
          </Pressable>
        </View>
        <Text style={styles.greeting}>
          Good morning, {dashboard.teacherName.split(" ")[0]}!
        </Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      <View
        style={[styles.statsGrid, useCompactStats && styles.statsGridCompact]}
      >
        {stats.map(([label, value], index) => (
          <Card
            key={label}
            style={[styles.statCard, useCompactStats && styles.statCardCompact]}
          >
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor: statStyle[index]!.bg,
                },
              ]}
            >
              <Ionicons
                name={statStyle[index]!.icon}
                size={moderateScale(20)}
                color={statStyle[index]!.color}
              />
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={styles.statValue}
            >
              {value}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={styles.statLabel}
            >
              {label}
            </Text>
          </Card>
        ))}
      </View>

      <View style={styles.body}>
        <SectionTitle
          title="Today's schedule"
          action="View all"
          onPress={() => router.push("/classes")}
        />
        <Card style={styles.scheduleCard}>
          {todaysClasses.length ? (
            todaysClasses.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/class/${item.id}`)}
                style={[styles.scheduleRow, index > 0 && styles.rowBorder]}
              >
                <View style={styles.timeWrap}>
                  <Text style={styles.time}>{formatTime(item.startTime)}</Text>
                  <View style={styles.timelineDot} />
                </View>
                <View style={styles.scheduleCopy}>
                  <Text style={styles.subject}>
                    {item.gradeLevel === 0
                      ? "Kindergarten"
                      : `Grade/Year ${item.gradeLevel}`}{" "}
                    - {item.subject}
                  </Text>
                  <Text style={styles.meta}>
                    {item.section}, {item.room}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={moderateScale(18)}
                  color={colors.iconMutedLight}
                />
              </Pressable>
            ))
          ) : (
            <View style={styles.scheduleEmpty}>
              <Ionicons
                name="calendar-outline"
                size={moderateScale(27)}
                color={colors.muted}
              />
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text style={styles.emptyTitle}>
                  {dashboard.classes.length
                    ? "No classes scheduled today"
                    : "No classes assigned yet"}
                </Text>
                <Text style={styles.meta}>
                  {dashboard.classes.length
                    ? "Open My Classes to view your full schedule."
                    : "Ask your school administrator to create and assign a class."}
                </Text>
              </View>
            </View>
          )}
        </Card>

        <SectionTitle title="Quick actions" />
        <View style={styles.actions}>
          <QuickAction
            icon="checkbox"
            label="Take attendance"
            color={colors.success}
            background={colors.successSoft}
            onPress={() =>
              dashboard.classes[0] &&
              router.push(`/class/${dashboard.classes[0].id}`)
            }
          />
          <QuickAction
            icon="people"
            label="Manage students"
            color={colors.primary}
            background={colors.primarySoft}
            onPress={() => router.push("/students")}
          />
          <QuickAction
            icon="document-text"
            label="Encode grades"
            color={colors.warning}
            background={colors.warningSoft}
            onPress={() =>
              dashboard.classes[0] &&
              router.push(`/grades/${dashboard.classes[0].id}`)
            }
          />
          <QuickAction
            icon="bar-chart"
            label="Reports"
            color={colors.purple}
            background={colors.purpleSoft}
            onPress={() => router.push("/reports")}
          />
        </View>

        {dashboard.atRisk.length > 0 && (
          <>
            <SectionTitle title="Students to check in with" />
            <Card style={styles.riskCard}>
              {dashboard.atRisk.slice(0, 3).map((entry, index) => (
                <Pressable
                  key={`${entry.classroom.id}-${entry.student.id}`}
                  onPress={() => router.push(`/student/${entry.student.id}`)}
                  style={[styles.riskRow, index > 0 && styles.rowBorder]}
                >
                  <View style={styles.riskInitial}>
                    <Text style={styles.riskInitialText}>
                      {entry.student.firstName[0]}
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text style={styles.subject}>{entry.student.fullName}</Text>
                    <Text style={styles.meta}>{entry.classroom.subject}</Text>
                  </View>
                  <Text style={styles.riskGrade}>
                    {entry.currentGrade.toFixed(1)}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
};
export default DashboardScreen;
const SectionTitle = ({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) => {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionText}>{title}</Text>
      {action && (
        <Pressable onPress={onPress}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
};
const QuickAction = ({
  icon,
  label,
  color,
  background,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  background: string;
  onPress: () => void;
}) => {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: background,
          },
        ]}
      >
        <Ionicons name={icon} size={moderateScale(24)} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
};
const formatTime = (time: string) => {
  const [hourText, minute = "00"] = time.split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
};
const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing(3.5),
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(2.5),
    paddingBottom: spacing(6),
    borderBottomLeftRadius: borderRadius.large,
    borderBottomRightRadius: borderRadius.large,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(3.25),
  },
  brand: {
    color: colors.brandText,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.bold,
  },
  greeting: {
    color: colors.surface,
    fontSize: typography.fontSize.extraLarge,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  date: {
    color: colors.brandText,
    fontSize: typography.fontSize.medium,
    marginTop: spacing(0.625),
    fontFamily: typography.fontFamily.regular,
  },
  statsGrid: {
    flexDirection: "row",
    marginTop: -spacing(3.375),
    paddingHorizontal: spacing(2),
    gap: spacing(0.875),
  },
  statsGridCompact: {
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(0.75),
    borderRadius: borderRadius.large,
    ...shadow,
  },
  statCardCompact: {
    flexBasis: "45%",
  },
  statIcon: {
    width: moderateScale(33),
    height: moderateScale(33),
    borderRadius: borderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(0.625),
  },
  statValue: {
    color: colors.text,
    fontSize: typography.fontSize.semiLarge,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  statLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.semiBold,
    marginTop: spacing(0.25),
    fontFamily: typography.fontFamily.semiBold,
  },
  body: {
    paddingHorizontal: spacing(2),
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing(3),
    marginBottom: spacing(1.25),
  },
  sectionText: {
    color: colors.text,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  sectionAction: {
    color: colors.primary,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  scheduleCard: {
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.75),
  },
  scheduleEmpty: {
    minHeight: moderateScale(78),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    paddingHorizontal: spacing(0.5),
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing(0.25),
    fontFamily: typography.fontFamily.bold,
  },
  scheduleRow: {
    minHeight: moderateScale(66),
    flexDirection: "row",
    alignItems: "center",
  },
  rowBorder: {
    borderTopWidth: moderateScale(1),
    borderTopColor: colors.border,
  },
  timeWrap: {
    width: moderateScale(84),
    flexDirection: "row",
    alignItems: "center",
  },
  time: {
    width: moderateScale(70),
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.semiBold,
    fontFamily: typography.fontFamily.semiBold,
  },
  timelineDot: {
    width: moderateScale(4),
    height: moderateScale(32),
    borderRadius: borderRadius.small,
    backgroundColor: colors.primary,
  },
  scheduleCopy: {
    flex: 1,
    paddingLeft: spacing(1.625),
  },
  subject: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  meta: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.375),
    fontFamily: typography.fontFamily.regular,
  },
  actions: {
    flexDirection: "row",
    gap: spacing(1),
  },
  action: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    paddingVertical: spacing(1.625),
    paddingHorizontal: spacing(0.375),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
  },
  actionIcon: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: borderRadius.large,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(1),
  },
  actionLabel: {
    color: colors.text,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.small,
    fontWeight: typography.fontWeight.semiBold,
    textAlign: "center",
    fontFamily: typography.fontFamily.semiBold,
  },
  riskCard: {
    paddingVertical: spacing(1),
  },
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(1.375),
    gap: spacing(1.375),
  },
  riskInitial: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: borderRadius.large,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  riskInitialText: {
    color: colors.danger,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  riskGrade: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    overflow: "hidden",
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.125),
    paddingVertical: spacing(0.625),
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
});
