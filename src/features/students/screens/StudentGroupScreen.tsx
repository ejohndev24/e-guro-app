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
import * as FileSystem from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Classroom, StudentGroup } from "@/core/types";
import {
  Avatar,
  Card,
  ErrorState,
  LoadingState,
  ScreenHeader,
} from "@/shared/components/ui";
import { saveAutoSizedWorkbook } from "@/shared/utils/spreadsheetExport";
import { STUDENT_GROUPS_QUERY } from "@/features/students/graphql/queries/getStudents";
import { ImportModal, StudentModal } from "@/features/students/screens/StudentsScreen";
import {
  CreateClassModal,
  ImportClassesModal,
} from "@/features/classes/screens/ClassesScreen";
import {
  createGroupSummaryCsv,
  groupSummaryFileName,
} from "@/features/students/utils/groupSummaryCsv";
import { GroupAdviserControl } from "@/features/students/components/GroupAdviserControl";
import { AppMessageModal, showAppBanner } from "@/shared/components/feedback";
import {
  DELETE_CLASS_MUTATION,
  DELETE_STUDENT_GROUP_MUTATION,
  REMOVE_STUDENT_FROM_GROUP_MUTATION,
} from "@/features/students/graphql/mutations/deleteGroup";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
const { spacing, typography, colors, borderRadius } = theme;
type Tab = "overview" | "classes" | "students";
const StudentGroupScreen = () => {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<
    "add" | "import" | "class" | "classImport"
  >();
  const [downloading, setDownloading] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<{
    id: string;
    fullName: string;
  }>();
  const [classToDelete, setClassToDelete] = useState<Classroom>();
  const [deletingSection, setDeletingSection] = useState(false);
  const { data, loading, error, refetch } = useQuery<{
    studentGroups: StudentGroup[];
  }>(STUDENT_GROUPS_QUERY, {
    fetchPolicy: "network-only",
  });
  const [removeStudentFromGroup, removeState] = useMutation<{
    removeStudentFromGroup: boolean;
  }>(REMOVE_STUDENT_FROM_GROUP_MUTATION);
  const [deleteClass, deleteClassState] = useMutation<{
    deleteClass: boolean;
  }>(DELETE_CLASS_MUTATION);
  const [deleteStudentGroup, deleteSectionState] = useMutation<{
    deleteStudentGroup: boolean;
  }>(DELETE_STUDENT_GROUP_MUTATION);
  const group = data?.studentGroups.find((item) => item.id === id);
  if (loading && !group)
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ScreenHeader title="Section" onBack={router.back} />
        <LoadingState />
      </View>
    );
  if (error || !group)
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ScreenHeader title="Section" onBack={router.back} />
        <ErrorState
          message={error?.message ?? "This section is unavailable."}
          retry={refetch}
        />
      </View>
    );
  const classroomIds = group.classes.map((item) => item.id);
  const downloadSummary = async () => {
    if (Platform.OS !== "android") {
      Alert.alert(
        "Android download only",
        "Direct folder saving is currently available on Android.",
      );
      return;
    }
    setDownloading(true);
    try {
      const permission =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return;
      const fileName = await saveAutoSizedWorkbook(
        permission.directoryUri,
        groupSummaryFileName(group),
        createGroupSummaryCsv(group),
        "Section summary",
      );
      Alert.alert(
        "Summary downloaded",
        `${fileName} was saved to the folder you selected.`,
      );
    } catch (downloadError) {
      Alert.alert(
        "Summary not downloaded",
        downloadError instanceof Error ? downloadError.message : "Try again.",
      );
    } finally {
      setDownloading(false);
    }
  };
  const removeStudent = async () => {
    if (!studentToRemove) return;
    try {
      await removeStudentFromGroup({
        variables: {
          groupId: group.id,
          studentId: studentToRemove.id,
        },
      });
      const studentName = studentToRemove.fullName;
      setStudentToRemove(undefined);
      await refetch();
      showAppBanner(
        "Student removed",
        `${studentName} was removed from this section.`,
        "success",
      );
    } catch (removeError) {
      showAppBanner(
        "Could not remove student",
        removeError instanceof Error
          ? removeError.message
          : "Please try again.",
        "danger",
      );
    }
  };
  const removeClass = async () => {
    if (!classToDelete) return;
    try {
      const className = classToDelete.subject;
      await deleteClass({
        variables: {
          classroomId: classToDelete.id,
        },
      });
      setClassToDelete(undefined);
      await refetch();
      showAppBanner(
        "Class deleted",
        `${className} was removed from this section.`,
        "success",
      );
    } catch (deleteError) {
      showAppBanner(
        "Could not delete class",
        deleteError instanceof Error
          ? deleteError.message
          : "Please try again.",
        "danger",
      );
    }
  };
  const removeSection = async () => {
    try {
      await deleteStudentGroup({
        variables: {
          groupId: group.id,
        },
        refetchQueries: [
          {
            query: STUDENT_GROUPS_QUERY,
          },
        ],
        awaitRefetchQueries: true,
      });
      setDeletingSection(false);
      showAppBanner(
        "Section deleted",
        `${group.displayName} and its classes were deleted.`,
        "success",
      );
      router.back();
    } catch (deleteError) {
      showAppBanner(
        "Could not delete section",
        deleteError instanceof Error
          ? deleteError.message
          : "Please try again.",
        "danger",
      );
    }
  };
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
        title={group.displayName}
        subtitle="Section profile"
        onBack={router.back}
      />
      <View style={styles.actionsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.actions}
        >
          <Action
            icon="download-outline"
            label={downloading ? "Saving…" : "Excel summary"}
            disabled={downloading}
            onPress={() => void downloadSummary()}
          />
          <Action
            icon="cloud-upload-outline"
            label="Import classes"
            onPress={() => setModal("classImport")}
          />
          <Action
            icon="cloud-upload-outline"
            label="Import students"
            onPress={() => setModal("import")}
          />
          <Action
            icon="book-outline"
            label="Add class"
            onPress={() => setModal("class")}
          />
          <Action
            icon="person-add-outline"
            label="Add student"
            onPress={() => setModal("add")}
          />
        </ScrollView>
      </View>
      <View style={styles.tabs}>
        {(["overview", "classes", "students"] as Tab[]).map((item) => (
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
        ))}
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {tab === "overview" && (
          <>
            <Card>
              <Text style={styles.cardTitle}>Section information</Text>
              <Info
                label="Grade/Year level"
                value={
                  group.gradeLevel === 0
                    ? "Kindergarten"
                    : String(group.gradeLevel)
                }
              />
              <Info label="Section" value={group.section} />
              <Info
                label="Your role"
                value={group.isAdvisory ? "Class adviser" : "Subject teacher"}
              />
              <Info label="School year" value={group.schoolYear} />
              <Info label="Term" value={group.term} />
              <Info label="Total students" value={String(group.studentCount)} />
              {[
                "KINDERGARTEN",
                "ELEMENTARY",
                "JUNIOR_HIGH",
                "SENIOR_HIGH",
              ].includes(group.educationLevel) && (
                <GroupAdviserControl group={group} refresh={() => refetch()} />
              )}
              {group.isAdvisory && (
                <Pressable
                  onPress={() =>
                    router.push(`/section/${group.id}/attendance` as never)
                  }
                  style={styles.attendanceAction}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={moderateScale(17)}
                    color={colors.surface}
                  />
                  <Text style={styles.attendanceActionText}>
                    Section attendance
                  </Text>
                </Pressable>
              )}
            </Card>
            <Pressable
              onPress={() => setDeletingSection(true)}
              style={styles.deleteSection}
            >
              <Ionicons
                name="trash-outline"
                size={moderateScale(18)}
                color={colors.danger}
              />
              <Text style={styles.deleteSectionText}>Delete section</Text>
            </Pressable>
          </>
        )}
        {tab === "classes" &&
          (group.classes.length ? (
            <Card style={styles.classesCard}>
              {group.classes.map((room, index) => (
                <View
                  key={room.id}
                  style={[styles.classRow, index > 0 && styles.classBorder]}
                >
                  <Pressable
                    onPress={() => router.push(`/class/${room.id}`)}
                    style={styles.classOpen}
                  >
                    <View style={styles.subjectIcon}>
                      <Ionicons
                        name="book"
                        size={moderateScale(18)}
                        color={colors.primary}
                      />
                    </View>
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text style={styles.subject}>{room.subject}</Text>
                      <Text style={styles.meta}>
                        {room.scheduleDay.split(",").join(", ")},{" "}
                        {formatTime(room.startTime)}–{formatTime(room.endTime)}
                      </Text>
                      <Text style={styles.meta}>
                        {room.room}, {room.studentCount} student
                        {room.studentCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Delete ${room.subject}`}
                    onPress={() => setClassToDelete(room)}
                    hitSlop={spacing(1)}
                    style={styles.removeClass}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={moderateScale(18)}
                      color={colors.danger}
                    />
                  </Pressable>
                </View>
              ))}
            </Card>
          ) : (
            <SectionEmptyState
              icon="book-outline"
              title="No classes yet"
              detail="Add the section's first subject class to set its schedule."
              primaryLabel="Add class"
              onPrimary={() => setModal("class")}
              secondaryLabel="Import classes"
              onSecondary={() => setModal("classImport")}
            />
          ))}
        {tab === "students" &&
          (group.students.length ? (
            <Card style={styles.studentsCard}>
              {group.students.map((student, index) => (
                <View
                  key={student.id}
                  style={[styles.studentRow, index > 0 && styles.border]}
                >
                  <Pressable
                    onPress={() => router.push(`/student/${student.id}`)}
                    style={styles.studentOpen}
                  >
                    <Avatar name={student.fullName} size={moderateScale(40)} />
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text style={styles.subject}>{student.fullName}</Text>
                      <Text style={styles.meta}>ID: {student.studentNo}</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Remove ${student.fullName} from section`}
                    onPress={() =>
                      setStudentToRemove({
                        id: student.id,
                        fullName: student.fullName,
                      })
                    }
                    hitSlop={spacing(1)}
                    style={styles.removeStudent}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={moderateScale(18)}
                      color={colors.danger}
                    />
                  </Pressable>
                </View>
              ))}
            </Card>
          ) : (
            <SectionEmptyState
              icon="people-outline"
              title="No students yet"
              detail="Add or import students to create this section's roster."
              primaryLabel="Add student"
              onPrimary={() => setModal("add")}
              secondaryLabel="Import students"
              onSecondary={() => setModal("import")}
            />
          ))}
      </ScrollView>
      <StudentModal
        visible={modal === "add"}
        groupId={group.id}
        classes={group.classes}
        initialClassroomIds={classroomIds}
        close={() => setModal(undefined)}
        completed={async () => {
          setModal(undefined);
          await refetch();
        }}
      />
      <ImportModal
        visible={modal === "import"}
        groupId={group.id}
        classes={group.classes}
        initialClassroomIds={classroomIds}
        close={() => setModal(undefined)}
        completed={async (count) => {
          setModal(undefined);
          await refetch();
          Alert.alert(
            "Import complete",
            `${count} student${count === 1 ? "" : "s"} imported.`,
          );
        }}
      />
      <CreateClassModal
        visible={modal === "class"}
        group={group}
        close={() => setModal(undefined)}
        completed={async () => {
          setModal(undefined);
          await refetch();
        }}
      />
      <ImportClassesModal
        visible={modal === "classImport"}
        group={group}
        close={() => setModal(undefined)}
        completed={async () => {
          setModal(undefined);
          await refetch();
        }}
      />
      <AppMessageModal
        visible={deletingSection}
        title="Delete section?"
        message={`This deletes ${group.displayName}, its subject classes, attendance, grades, and section-only students. Students used in another section or class will be kept.`}
        confirmLabel="Delete section"
        variant="danger"
        busy={deleteSectionState.loading}
        onCancel={() => setDeletingSection(false)}
        onConfirm={() => void removeSection()}
      />
      <AppMessageModal
        visible={Boolean(classToDelete)}
        title="Delete class?"
        message={`${classToDelete?.subject ?? "This class"} and its class-specific attendance, grades, and reports will be deleted. Students remain in this section.`}
        confirmLabel="Delete class"
        variant="danger"
        busy={deleteClassState.loading}
        onCancel={() => setClassToDelete(undefined)}
        onConfirm={() => void removeClass()}
      />
      <AppMessageModal
        visible={Boolean(studentToRemove)}
        title="Remove student?"
        message={`${studentToRemove?.fullName ?? "This student"} will be removed from this section and its subject classes. The student is kept if they belong to another section or class.`}
        confirmLabel="Remove student"
        variant="danger"
        busy={removeState.loading}
        onCancel={() => setStudentToRemove(undefined)}
        onConfirm={() => void removeStudent()}
      />
    </View>
  );
};
export default StudentGroupScreen;
const Action = ({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    style={[styles.action, disabled && styles.actionDisabled]}
  >
    <Ionicons name={icon} size={moderateScale(20)} color={colors.primary} />
    <Text style={styles.actionText}>{label}</Text>
  </Pressable>
);
const SectionEmptyState = ({
  icon,
  title,
  detail,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon} size={moderateScale(29)} color={colors.primary} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyDetail}>{detail}</Text>
    <View style={styles.emptyActions}>
      {secondaryLabel && onSecondary && (
        <Pressable onPress={onSecondary} style={styles.emptySecondary}>
          <Text style={styles.emptySecondaryText}>{secondaryLabel}</Text>
        </Pressable>
      )}
      <Pressable onPress={onPrimary} style={styles.emptyPrimary}>
        <Ionicons name="add" size={moderateScale(17)} color={colors.surface} />
        <Text style={styles.emptyPrimaryText}>{primaryLabel}</Text>
      </Pressable>
    </View>
  </View>
);
const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.info}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`;
};
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actionsBar: {
    height: moderateScale(67),
  },
  actions: {
    gap: spacing(1),
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1.25),
  },
  action: {
    height: moderateScale(47),
    paddingHorizontal: spacing(1.75),
    borderRadius: borderRadius.medium,
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.875),
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    textAlign: "center",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing(1.5),
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
    fontFamily: typography.fontFamily.medium,
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  content: {
    padding: spacing(1.75),
    paddingBottom: spacing(4.375),
    gap: spacing(1.25),
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing(1),
  },
  attendanceAction: {
    minHeight: moderateScale(42),
    marginTop: spacing(1.25),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.75),
  },
  attendanceActionText: {
    color: colors.surface,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  deleteSection: {
    minHeight: moderateScale(46),
    borderWidth: moderateScale(1),
    borderColor: colors.dangerSoft,
    borderRadius: borderRadius.large,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.875),
    marginTop: spacing(1),
  },
  deleteSectionText: {
    color: colors.danger,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  emptyState: {
    minHeight: moderateScale(240),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(3.125),
    borderRadius: borderRadius.large,
    backgroundColor: colors.surface,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
  },
  emptyIcon: {
    width: moderateScale(58),
    height: moderateScale(58),
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
  emptyDetail: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.medium,
    textAlign: "center",
    marginTop: spacing(0.75),
    fontFamily: typography.fontFamily.regular,
  },
  emptyActions: {
    flexDirection: "row",
    gap: spacing(1),
    marginTop: spacing(2),
  },
  emptyPrimary: {
    height: moderateScale(40),
    paddingHorizontal: spacing(1.75),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.625),
  },
  emptyPrimaryText: {
    color: colors.surface,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  emptySecondary: {
    height: moderateScale(40),
    paddingHorizontal: spacing(1.75),
    borderRadius: borderRadius.medium,
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySecondaryText: {
    color: colors.primary,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  info: {
    flexDirection: "row",
    paddingVertical: spacing(0.625),
  },
  infoLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    color: colors.muted,
    fontSize: typography.fontSize.small,
  },
  infoValue: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.medium,
  },
  section: {
    color: colors.text,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing(1),
    fontFamily: typography.fontFamily.bold,
  },
  classesCard: {
    paddingVertical: spacing(1),
  },
  classRow: {
    minHeight: moderateScale(64),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
  },
  classBorder: {
    borderTopWidth: moderateScale(1),
    borderTopColor: colors.border,
    marginTop: spacing(0.5),
    paddingTop: spacing(0.5),
  },
  classOpen: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
  },
  removeClass: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: borderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
  },
  studentsCard: {
    paddingVertical: spacing(1),
  },
  studentRow: {
    minHeight: moderateScale(62),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
  },
  studentOpen: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.375),
  },
  removeStudent: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: borderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
  },
  border: {
    borderTopWidth: moderateScale(1),
    borderTopColor: colors.border,
  },
  subjectIcon: {
    width: moderateScale(35),
    height: moderateScale(35),
    borderRadius: borderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  subject: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
  },
  meta: {
    fontFamily: typography.fontFamily.regular,
    color: colors.muted,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.375),
  },
});
