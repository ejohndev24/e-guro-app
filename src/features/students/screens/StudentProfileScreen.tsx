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
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Card,
  ErrorState,
  LoadingState,
  ScreenHeader,
  StatusPill,
} from "@/shared/components/ui";
import { STUDENT_QUERY } from "@/features/students/graphql/queries/getStudentProfile";
import { StudentModal } from "@/features/students/screens/StudentsScreen";
import { Attendance, Classroom, Grade, Student } from "@/core/types";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
import { StudentProfileHeader } from "@/features/students/components/StudentProfileHeader";
const { spacing, typography, colors, borderRadius } = theme;
type Tab = "overview" | "grades" | "attendance" | "details";
type ProfileData = {
  student: {
    student: Student;
    overallGrade: number;
    attendanceRate: number;
    classes: {
      classroom: Classroom;
      averageGrade?: number | null;
      attendanceRate: number;
    }[];
    recentAttendance: Attendance[];
    grades: Grade[];
  };
};
const StudentProfileScreen = () => {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const { data, loading, error, refetch } = useQuery<ProfileData>(
    STUDENT_QUERY,
    {
      variables: {
        id,
      },
      skip: !id,
      fetchPolicy: "network-only",
    },
  );
  if (loading && !data)
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ScreenHeader title="Student Profile" onBack={router.back} />
        <LoadingState />
      </View>
    );
  if (error && !data)
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ScreenHeader title="Student Profile" onBack={router.back} />
        <ErrorState message={error.message} retry={refetch} />
      </View>
    );
  const profile = data!.student;
  const primaryClassroom = profile.classes[0]?.classroom;
  const sectionLabel = primaryClassroom
    ? `${primaryClassroom.gradeLevel === 0 ? "Kindergarten" : `Grade/Year ${primaryClassroom.gradeLevel}`} - ${primaryClassroom.section}`
    : "No enrolled section";
  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <ScreenHeader
        title="Student Profile"
        onBack={router.back}
        action={
          <Pressable
            accessibilityLabel="Edit student"
            onPress={() => setEditing(true)}
          >
            <Ionicons
              name="pencil-outline"
              size={moderateScale(21)}
              color={colors.primary}
            />
          </Pressable>
        }
      />
      <StudentProfileHeader
        student={profile.student}
        classLabel={sectionLabel}
      />
      <View style={styles.tabs}>
        {(["overview", "grades", "attendance", "details"] as Tab[]).map(
          (item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[styles.tab, tab === item && styles.tabActive]}
            >
              <Text
                style={[styles.tabText, tab === item && styles.tabTextActive]}
              >
                {item[0]!.toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          ),
        )}
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {tab === "overview" && (
          <>
            <View style={styles.metrics}>
              <Metric
                value={`${profile.attendanceRate}%`}
                label="Attendance"
                color={colors.success}
                bg={colors.successSoft}
              />
              <Metric
                value={
                  profile.grades.length ? profile.overallGrade.toFixed(1) : "—"
                }
                label="Average grade"
                color={colors.purple}
                bg={colors.purpleSoft}
              />
            </View>
            <Text style={styles.section}>Current subjects</Text>
            <ClassPerformance classes={profile.classes} />
          </>
        )}
        {tab === "grades" && (
          <>
            <Text style={styles.sectionFirst}>Subject performance</Text>
            <ClassPerformance classes={profile.classes} />
            <Text style={styles.note}>
              Quarterly and final grades come from the same encoded class
              records used in Reports.
            </Text>
          </>
        )}
        {tab === "attendance" && (
          <>
            <Text style={styles.sectionFirst}>Recent attendance</Text>
            <Card>
              {profile.recentAttendance.length ? (
                profile.recentAttendance.map((item, index) => (
                  <View
                    key={item.id}
                    style={[styles.attendanceRow, index > 0 && styles.border]}
                  >
                    <Text style={styles.attendanceDate}>
                      {new Intl.DateTimeFormat("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(item.date))}
                    </Text>
                    <StatusPill status={item.status} />
                    <Text style={styles.attendanceTime}>
                      {item.checkedAt
                        ? new Intl.DateTimeFormat("en-PH", {
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(item.checkedAt))
                        : "—"}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>
                  No attendance has been recorded.
                </Text>
              )}
            </Card>
          </>
        )}
        {tab === "details" && (
          <>
            <Text style={styles.sectionFirst}>Student information</Text>
            <Card>
              <Detail label="Full name" value={profile.student.fullName} />
              <Detail label="Student ID" value={profile.student.studentNo} />
              <Detail
                label="LRN"
                value={profile.student.lrn ?? "Not provided"}
              />
              <Detail
                label="Birth date"
                value={
                  profile.student.birthDate?.slice(0, 10) ?? "Not provided"
                }
              />
              <Detail
                label="Gender"
                value={
                  profile.student.sex
                    ? profile.student.sex[0] +
                      profile.student.sex.slice(1).toLowerCase()
                    : "Not provided"
                }
              />
              <Detail
                label="Email"
                value={profile.student.email ?? "Not provided"}
              />
              <Detail
                label="Enrolled subjects"
                value={String(profile.classes.length)}
              />
            </Card>
          </>
        )}
      </ScrollView>
      <StudentModal
        visible={editing}
        student={profile.student}
        classes={profile.classes.map((entry) => entry.classroom)}
        initialClassroomIds={profile.classes.map((entry) => entry.classroom.id)}
        close={() => setEditing(false)}
        completed={async () => {
          setEditing(false);
          await refetch();
        }}
      />
    </View>
  );
};
export default StudentProfileScreen;
const Metric = ({
  value,
  label,
  color,
  bg,
}: {
  value: string;
  label: string;
  color: string;
  bg: string;
}) => (
  <View
    style={[
      styles.metric,
      {
        backgroundColor: bg,
      },
    ]}
  >
    <Text
      style={[
        styles.metricValue,
        {
          color,
        },
      ]}
    >
      {value}
    </Text>
    <Text
      style={[
        styles.metricLabel,
        {
          color,
        },
      ]}
    >
      {label}
    </Text>
  </View>
);
const Detail = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);
const ClassPerformance = ({
  classes,
}: {
  classes: ProfileData["student"]["classes"];
}) => (
  <Card>
    {classes.length ? (
      classes.map((entry, index) => (
        <Pressable
          key={entry.classroom.id}
          onPress={() => router.push(`/class/${entry.classroom.id}`)}
          style={[styles.classRow, index > 0 && styles.border]}
        >
          <View style={styles.classIcon}>
            <Ionicons
              name="book-outline"
              size={moderateScale(18)}
              color={colors.primary}
            />
          </View>
          <View
            style={{
              flex: 1,
            }}
          >
            <Text style={styles.subject}>{entry.classroom.subject}</Text>
            <Text style={styles.meta}>
              {entry.classroom.section}, {entry.attendanceRate}% attendance
            </Text>
          </View>
          <Text
            style={[
              styles.grade,
              (entry.averageGrade ?? 100) < 75 && styles.low,
            ]}
          >
            {entry.averageGrade?.toFixed(1) ?? "—"}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={moderateScale(16)}
            color={colors.muted}
          />
        </Pressable>
      ))
    ) : (
      <Text style={styles.empty}>No enrolled subjects.</Text>
    )}
  </Card>
);
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: moderateScale(1),
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing(1.375),
    borderBottomWidth: moderateScale(2),
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.semiBold,
    fontFamily: typography.fontFamily.semiBold,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  content: {
    padding: spacing(1.875),
    paddingBottom: spacing(4.375),
  },
  metrics: {
    flexDirection: "row",
    gap: spacing(1.25),
  },
  metric: {
    flex: 1,
    alignItems: "center",
    borderRadius: borderRadius.large,
    paddingVertical: spacing(2),
  },
  metricValue: {
    fontSize: typography.fontSize.large,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  metricLabel: {
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.375),
    fontWeight: typography.fontWeight.semiBold,
    fontFamily: typography.fontFamily.semiBold,
  },
  section: {
    color: colors.text,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing(2.75),
    marginBottom: spacing(1.125),
    fontFamily: typography.fontFamily.bold,
  },
  sectionFirst: {
    color: colors.text,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing(1.125),
    fontFamily: typography.fontFamily.bold,
  },
  classRow: {
    minHeight: moderateScale(61),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.125),
  },
  border: {
    borderTopWidth: moderateScale(1),
    borderTopColor: colors.border,
  },
  classIcon: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  subject: {
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.bold,
  },
  meta: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.375),
    fontFamily: typography.fontFamily.regular,
  },
  grade: {
    color: colors.success,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.bold,
  },
  low: {
    color: colors.danger,
  },
  attendanceRow: {
    minHeight: moderateScale(52),
    flexDirection: "row",
    alignItems: "center",
  },
  attendanceDate: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.semiBold,
    fontFamily: typography.fontFamily.semiBold,
  },
  attendanceTime: {
    width: moderateScale(65),
    textAlign: "right",
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    fontFamily: typography.fontFamily.regular,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: spacing(0.875),
  },
  detailLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.regular,
  },
  detailValue: {
    flex: 1.3,
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.semiBold,
    textAlign: "right",
    fontFamily: typography.fontFamily.semiBold,
  },
  note: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    lineHeight: typography.lineHeight.small,
    textAlign: "center",
    marginTop: spacing(1.875),
    fontFamily: typography.fontFamily.regular,
  },
  empty: {
    color: colors.muted,
    textAlign: "center",
    padding: spacing(2.5),
  },
});
