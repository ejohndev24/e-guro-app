/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
import { useMutation, useQuery } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AttendanceScope,
  AttendanceStatus,
  Classroom,
  RosterStudent,
  StudentGroup,
} from "@/core/types";
import {
  Avatar,
  ErrorState,
  LoadingState,
  ScreenHeader,
} from "@/shared/components/ui";
import { SET_ATTENDANCE_MUTATION } from "@/features/attendance/graphql/mutations/attendanceMutations";
import { AttendanceStatusPicker } from "@/features/attendance/components/AttendanceStatusPicker";
import { CLASS_DETAIL_QUERY } from "@/features/classes/graphql/queries/getClassDetail";
import { STUDENT_GROUPS_QUERY } from "@/features/students/graphql/queries/getStudents";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
import { InfoCallout } from "@/shared/components/InfoCallout";
const { spacing, typography, colors, borderRadius } = theme;
type ClassDetail = {
  classDetail: {
    classroom: Classroom;
    roster: RosterStudent[];
  };
};
export const SectionAttendanceScreen = () => {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const date = formatDateKey(selectedDate);
  const sections = useQuery<{
    studentGroups: StudentGroup[];
  }>(STUDENT_GROUPS_QUERY, {
    fetchPolicy: "network-only",
  });
  const section = sections.data?.studentGroups.find((item) => item.id === id);
  const advisoryClass = section?.classes.find((item) => item.isAdvisory);
  const variables = {
    id: advisoryClass?.id,
    date,
    quarter: 1,
    attendanceScope: "DAILY" as AttendanceScope,
  };
  const detail = useQuery<ClassDetail>(CLASS_DETAIL_QUERY, {
    variables,
    skip: !advisoryClass?.id,
    fetchPolicy: "network-only",
  });
  const [setAttendance, saveState] = useMutation(SET_ATTENDANCE_MUTATION);
  const roster = detail.data?.classDetail.roster ?? [];
  const filtered = roster.filter(
    ({ student }) =>
      student.fullName.toLowerCase().includes(search.toLowerCase()) ||
      student.studentNo.includes(search),
  );
  const update = async (
    studentId: string,
    status: AttendanceStatus,
    reason?: string,
  ) => {
    try {
      await setAttendance({
        variables: {
          classroomId: advisoryClass?.id,
          studentId,
          date,
          status,
          reason,
          scope: "DAILY",
        },
        refetchQueries: [
          {
            query: CLASS_DETAIL_QUERY,
            variables,
          },
        ],
      });
    } catch (error) {
      Alert.alert(
        "Attendance not saved",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };
  const moveDate = (days: number) =>
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + days);
      return next;
    });
  if (sections.loading && !section)
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ScreenHeader title="Section attendance" onBack={router.back} />
        <LoadingState />
      </View>
    );
  if (sections.error || !section || !advisoryClass)
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ScreenHeader title="Section attendance" onBack={router.back} />
        <ErrorState
          message={
            sections.error?.message ??
            "Daily attendance is available only for an advisory section."
          }
          retry={sections.refetch}
        />
      </View>
    );
  if (detail.loading && !detail.data)
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
          title={section.displayName}
          subtitle="Daily section attendance"
          onBack={router.back}
        />
        <LoadingState />
      </View>
    );
  if (detail.error)
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
          title={section.displayName}
          subtitle="Daily section attendance"
          onBack={router.back}
        />
        <ErrorState message={detail.error.message} retry={detail.refetch} />
      </View>
    );
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
        title={section.displayName}
        subtitle="Daily section attendance (SF2)"
        onBack={router.back}
      />
      <InfoCallout
        icon="school-outline"
        title="One record for the whole section"
        description="This is daily adviser attendance, not attendance for a subject."
      />
      <View style={styles.dateBar}>
        <Pressable
          accessibilityLabel="Previous day"
          onPress={() => moveDate(-1)}
          style={styles.dateArrow}
        >
          <Ionicons
            name="chevron-back"
            size={moderateScale(19)}
            color={colors.text}
          />
        </Pressable>
        <Pressable
          onPress={() => setSelectedDate(new Date())}
          style={styles.dateCopy}
        >
          <Text style={styles.dateLabel}>
            {new Intl.DateTimeFormat("en-PH", {
              weekday: "short",
              month: "short",
              day: "numeric",
            }).format(selectedDate)}
          </Text>
          <Text style={styles.dateHint}>
            {date === formatDateKey(new Date())
              ? "Today"
              : "Tap to return to today"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Next day"
          onPress={() => moveDate(1)}
          style={styles.dateArrow}
        >
          <Ionicons
            name="chevron-forward"
            size={moderateScale(19)}
            color={colors.text}
          />
        </Pressable>
      </View>
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryValue}>{roster.length}</Text>
          <Text style={styles.summaryLabel}>Students</Text>
        </View>
        <View style={styles.divider} />
        <View>
          <Text
            style={[
              styles.summaryValue,
              {
                color: colors.success,
              },
            ]}
          >
            {
              roster.filter((item) => item.attendance?.status === "PRESENT")
                .length
            }
          </Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={styles.divider} />
        <View>
          <Text
            style={[
              styles.summaryValue,
              {
                color: colors.danger,
              },
            ]}
          >
            {
              roster.filter((item) => item.attendance?.status === "ABSENT")
                .length
            }
          </Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={moderateScale(18)} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search student…"
          placeholderTextColor={colors.placeholder}
          style={styles.searchInput}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.student.id}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshing={detail.loading || saveState.loading}
        onRefresh={detail.refetch}
        renderItem={({ item, index }) => (
          <View style={[styles.row, index > 0 && styles.border]}>
            <Text style={styles.index}>{index + 1}</Text>
            <Avatar name={item.student.fullName} size={moderateScale(40)} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.student.fullName}</Text>
              <Text style={styles.id}>ID: {item.student.studentNo}</Text>
            </View>
            <AttendanceStatusPicker
              student={item.student}
              status={item.attendance?.status}
              reason={item.attendance?.reason}
              saving={saveState.loading}
              onSelect={(status, reason) =>
                void update(item.student.id, status, reason)
              }
            />
          </View>
        )}
      />
    </View>
  );
};
const formatDateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing(2),
    marginTop: spacing(1.25),
  },
  dateArrow: {
    width: moderateScale(40),
    height: moderateScale(40),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.medium,
    backgroundColor: colors.surface,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
  },
  dateCopy: {
    flex: 1,
    alignItems: "center",
  },
  dateLabel: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  dateHint: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    marginTop: spacing(0.25),
    fontFamily: typography.fontFamily.regular,
  },
  summary: {
    margin: spacing(2),
    padding: spacing(1.875),
    borderRadius: borderRadius.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
  },
  summaryValue: {
    color: colors.text,
    fontSize: typography.fontSize.large,
    fontWeight: typography.fontWeight.bold,
    textAlign: "center",
    fontFamily: typography.fontFamily.bold,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    marginTop: spacing(0.25),
    textAlign: "center",
    fontFamily: typography.fontFamily.regular,
  },
  divider: {
    width: moderateScale(1),
    height: moderateScale(38),
    backgroundColor: colors.border,
  },
  search: {
    marginHorizontal: spacing(2),
    marginBottom: spacing(1.25),
    height: moderateScale(43),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(1.625),
    borderRadius: borderRadius.large,
    backgroundColor: colors.neutral,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    marginLeft: spacing(1),
  },
  list: {
    marginHorizontal: spacing(2),
    paddingHorizontal: spacing(1.625),
    paddingBottom: spacing(3.75),
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
  },
  row: {
    minHeight: moderateScale(67),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
  },
  border: {
    borderTopWidth: moderateScale(1),
    borderTopColor: colors.border,
  },
  index: {
    color: colors.muted,
    width: moderateScale(15),
    fontSize: typography.fontSize.small,
    textAlign: "center",
    fontFamily: typography.fontFamily.regular,
  },
  copy: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  id: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.375),
    fontFamily: typography.fontFamily.regular,
  },
});
