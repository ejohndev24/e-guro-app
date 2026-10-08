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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Avatar,
  ErrorState,
  LoadingState,
  ScreenHeader,
} from "@/shared/components/ui";
import { CLASS_DETAIL_QUERY } from "@/features/classes/graphql/queries/getClassDetail";
import { SET_ATTENDANCE_MUTATION } from "@/features/attendance/graphql/mutations/attendanceMutations";
import { AttendanceStatusPicker } from "@/features/attendance/components/AttendanceStatusPicker";
import {
  AttendanceStatus,
  Classroom,
  RosterStudent,
  Student,
} from "@/core/types";
import { ADD_STUDENT_TO_CLASS_MUTATION } from "@/features/students/graphql/mutations/addStudentToClass";
import { IMPORT_TEACHER_STUDENTS_MUTATION } from "@/features/students/graphql/mutations/manageStudents";
import { STUDENTS_QUERY } from "@/features/students/graphql/queries/getStudents";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
import { InfoCallout } from "@/shared/components/InfoCallout";
const { spacing, typography, colors, borderRadius } = theme;
type Detail = {
  classDetail: {
    classroom: Classroom;
    roster: RosterStudent[];
  };
};
const ClassDetailScreen = () => {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const date = formatDateKey(selectedDate);
  const queryVariables = {
    id,
    date,
    quarter: 1,
    attendanceScope: "SUBJECT" as const,
  };
  const { data, loading, error, refetch } = useQuery<Detail>(
    CLASS_DETAIL_QUERY,
    {
      variables: queryVariables,
      skip: !id,
    },
  );
  const [setAttendance, { loading: saving }] = useMutation(
    SET_ATTENDANCE_MUTATION,
  );
  const filtered =
    data?.classDetail.roster.filter(
      ({ student }) =>
        student.fullName.toLowerCase().includes(search.toLowerCase()) ||
        student.studentNo.includes(search),
    ) ?? [];
  const update = async (
    studentId: string,
    status: AttendanceStatus,
    reason?: string,
  ) => {
    try {
      await setAttendance({
        variables: {
          classroomId: id,
          studentId,
          date,
          status,
          reason,
          scope: "SUBJECT",
        },
        refetchQueries: [
          {
            query: CLASS_DETAIL_QUERY,
            variables: queryVariables,
          },
        ],
      });
    } catch (mutationError) {
      Alert.alert(
        "Attendance not saved",
        mutationError instanceof Error ? mutationError.message : "Try again.",
      );
    }
  };
  const moveDate = (days: number) =>
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + days);
      return next;
    });
  const classroom = data?.classDetail.classroom;
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
        title={data?.classDetail.classroom.subject ?? "Class list"}
        subtitle={
          data
            ? `${data.classDetail.classroom.gradeLevel === 0 ? "Kindergarten" : `Grade/Year ${data.classDetail.classroom.gradeLevel}`}, ${data.classDetail.classroom.section}`
            : undefined
        }
        onBack={router.back}
        action={
          <Pressable
            accessibilityLabel="Add students"
            onPress={() => setAddingStudent(true)}
          >
            <Ionicons
              name="person-add-outline"
              size={moderateScale(23)}
              color={colors.primary}
            />
          </Pressable>
        }
      />
      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState message={error.message} retry={refetch} />
      ) : (
        <>
          <InfoCallout
            icon="book-outline"
            title={
              classroom?.educationLevel === "COLLEGE"
                ? "Class meeting attendance"
                : "Subject attendance"
            }
            description="Attendance for this subject and class schedule."
          />
          <View style={attendanceStyles.dateBar}>
            <Pressable
              accessibilityLabel="Previous day"
              onPress={() => moveDate(-1)}
              style={attendanceStyles.dateArrow}
            >
              <Ionicons
                name="chevron-back"
                size={moderateScale(19)}
                color={colors.text}
              />
            </Pressable>
            <Pressable
              onPress={() => setSelectedDate(new Date())}
              style={attendanceStyles.dateCopy}
            >
              <Text style={attendanceStyles.dateLabel}>
                {new Intl.DateTimeFormat("en-PH", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }).format(selectedDate)}
              </Text>
              <Text style={attendanceStyles.dateHint}>
                {date === formatDateKey(new Date())
                  ? "Today"
                  : "Tap to return to today"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Next day"
              onPress={() => moveDate(1)}
              style={attendanceStyles.dateArrow}
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
              <Text style={styles.summaryValue}>
                {data!.classDetail.roster.length}
              </Text>
              <Text style={styles.summaryLabel}>Students</Text>
            </View>
            <View style={styles.summaryDivider} />
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
                  data!.classDetail.roster.filter(
                    (x) => x.attendance?.status === "PRESENT",
                  ).length
                }
              </Text>
              <Text style={styles.summaryLabel}>Present today</Text>
            </View>
            <Pressable
              onPress={() => router.push(`/grades/${id}`)}
              style={styles.gradeButton}
            >
              <Ionicons
                name="create-outline"
                size={moderateScale(17)}
                color={colors.surface}
              />
              <Text style={styles.gradeButtonText}>Grades</Text>
            </Pressable>
          </View>
          <View style={styles.search}>
            <Ionicons
              name="search"
              size={moderateScale(18)}
              color={colors.muted}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search student…"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.student.id}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.list,
              !filtered.length && styles.emptyList,
            ]}
            refreshing={loading || saving}
            onRefresh={refetch}
            ListEmptyComponent={
              <View style={styles.emptyRoster}>
                <View style={styles.emptyRosterIcon}>
                  <Ionicons
                    name={
                      data!.classDetail.roster.length
                        ? "search-outline"
                        : "people-outline"
                    }
                    size={moderateScale(28)}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.emptyRosterTitle}>
                  {data!.classDetail.roster.length
                    ? "No matching students"
                    : "No students in this class"}
                </Text>
                <Text style={styles.emptyRosterText}>
                  {data!.classDetail.roster.length
                    ? "Try a different name or student number."
                    : "Add existing students or create the first one to start attendance and grades."}
                </Text>
                {!data!.classDetail.roster.length && (
                  <Pressable
                    onPress={() => setAddingStudent(true)}
                    style={styles.emptyRosterButton}
                  >
                    <Ionicons
                      name="person-add-outline"
                      size={moderateScale(17)}
                      color={colors.surface}
                    />
                    <Text style={styles.emptyRosterButtonText}>
                      Add students
                    </Text>
                  </Pressable>
                )}
              </View>
            }
            renderItem={({ item, index }) => (
              <View style={[styles.row, index > 0 && styles.border]}>
                <Text style={styles.index}>{index + 1}</Text>
                <Pressable
                  onPress={() => router.push(`/student/${item.student.id}`)}
                >
                  <Avatar
                    name={item.student.fullName}
                    size={moderateScale(40)}
                  />
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/student/${item.student.id}`)}
                  style={styles.copy}
                >
                  <Text style={styles.name}>{item.student.fullName}</Text>
                  <Text style={styles.id}>ID: {item.student.studentNo}</Text>
                </Pressable>
                <AttendanceStatusPicker
                  student={item.student}
                  status={item.attendance?.status}
                  reason={item.attendance?.reason}
                  saving={saving}
                  onSelect={(status, reason) =>
                    void update(item.student.id, status, reason)
                  }
                />
              </View>
            )}
          />
        </>
      )}
      {id && (
        <AddStudentModal
          visible={addingStudent}
          classroomId={id}
          enrolledStudentIds={
            data?.classDetail.roster.map(({ student }) => student.id) ?? []
          }
          close={() => setAddingStudent(false)}
          completed={async () => {
            setAddingStudent(false);
            await refetch();
          }}
        />
      )}
    </View>
  );
};
export default ClassDetailScreen;
const formatDateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const attendanceStyles = StyleSheet.create({
  scopeTabs: {
    flexDirection: "row",
    marginHorizontal: spacing(2),
    marginTop: spacing(1),
    padding: spacing(0.375),
    borderRadius: borderRadius.large,
    backgroundColor: colors.neutralAlt,
  },
  scopeTab: {
    flex: 1,
    height: moderateScale(38),
    borderRadius: borderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeTabActive: {
    backgroundColor: colors.surface,
  },
  scopeText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  scopeTextActive: {
    color: colors.primary,
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
});
const pickerStyles = StyleSheet.create({
  modeTabs: {
    flexDirection: "row",
    padding: spacing(0.375),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.background,
    marginBottom: spacing(1.25),
  },
  modeTab: {
    flex: 1,
    height: moderateScale(38),
    borderRadius: borderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
  },
  modeText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  modeTextActive: {
    color: colors.primary,
  },
  directorySearch: {
    height: moderateScale(43),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(1.5),
    borderRadius: borderRadius.medium,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    marginTop: spacing(0.375),
  },
  directorySearchInput: {
    flex: 1,
    color: colors.text,
    marginLeft: spacing(1),
  },
  selectionToolbar: {
    minHeight: moderateScale(35),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(0.375),
  },
  selectionCount: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.semiBold,
    fontFamily: typography.fontFamily.semiBold,
  },
  selectAll: {
    color: colors.primary,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    paddingVertical: spacing(1),
    fontFamily: typography.fontFamily.bold,
  },
  studentChoices: {
    maxHeight: moderateScale(330),
    marginTop: spacing(1.125),
  },
  studentChoice: {
    minHeight: moderateScale(57),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.125),
    borderBottomWidth: moderateScale(1),
    borderBottomColor: colors.border,
    paddingHorizontal: spacing(0.625),
  },
  studentChoiceSelected: {
    backgroundColor: colors.primarySoft,
  },
  choiceCopy: {
    flex: 1,
  },
  choiceName: {
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  choiceId: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    marginTop: spacing(0.25),
    fontFamily: typography.fontFamily.regular,
  },
  noAvailable: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: typography.lineHeight.medium,
    paddingVertical: spacing(3.75),
    paddingHorizontal: spacing(1.5),
    fontFamily: typography.fontFamily.regular,
  },
});
const AddStudentModal = ({
  visible,
  classroomId,
  enrolledStudentIds,
  close,
  completed,
}: {
  visible: boolean;
  classroomId: string;
  enrolledStudentIds: string[];
  close: () => void;
  completed: () => Promise<void>;
}) => {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [directorySearch, setDirectorySearch] = useState("");
  const [values, setValues] = useState({
    studentNo: "",
    lrn: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    sex: "" as "" | "MALE" | "FEMALE",
    email: "",
  });
  const directory = useQuery<{
    students: Student[];
  }>(STUDENTS_QUERY, {
    variables: {
      search: null,
    },
    skip: !visible,
  });
  const [add, addState] = useMutation(ADD_STUDENT_TO_CLASS_MUTATION);
  const [enroll, enrollState] = useMutation(IMPORT_TEACHER_STUDENTS_MUTATION);
  const enrolled = new Set(enrolledStudentIds);
  const available = (directory.data?.students ?? []).filter(
    (student) =>
      !enrolled.has(student.id) &&
      (student.fullName.toLowerCase().includes(directorySearch.toLowerCase()) ||
        student.studentNo
          .toLowerCase()
          .includes(directorySearch.toLowerCase())),
  );
  const availableIds = available.map((student) => student.id);
  const allAvailableSelected =
    availableIds.length > 0 &&
    availableIds.every((id) => selectedIds.includes(id));
  const selectedStudents = (directory.data?.students ?? []).filter((student) =>
    selectedIds.includes(student.id),
  );
  const toggleStudent = (studentId: string) =>
    setSelectedIds(
      selectedIds.includes(studentId)
        ? selectedIds.filter((id) => id !== studentId)
        : [...selectedIds, studentId],
    );
  const toggleAll = () =>
    setSelectedIds(
      allAvailableSelected
        ? selectedIds.filter((id) => !availableIds.includes(id))
        : [...new Set([...selectedIds, ...availableIds])],
    );
  const finish = async () => {
    setSelectedIds([]);
    setDirectorySearch("");
    setValues({
      studentNo: "",
      lrn: "",
      firstName: "",
      lastName: "",
      birthDate: "",
      sex: "",
      email: "",
    });
    await completed();
  };
  const enrollSelected = async () => {
    try {
      await enroll({
        variables: {
          inputs: selectedStudents.map((student) => ({
            studentNo: student.studentNo,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            classroomIds: [classroomId],
          })),
        },
      });
      await finish();
    } catch (error) {
      Alert.alert(
        "Students not added",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };
  const saveNew = async () => {
    try {
      await add({
        variables: {
          input: {
            classroomId,
            ...values,
            lrn: values.lrn || undefined,
            birthDate: values.birthDate || undefined,
            sex: values.sex || undefined,
            email: values.email || undefined,
          },
        },
      });
      await finish();
    } catch (error) {
      Alert.alert(
        "Student not added",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };
  const newStudentDisabled =
    addState.loading ||
    !values.studentNo.trim() ||
    !values.firstName.trim() ||
    !values.lastName.trim();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            {
              maxHeight: "90%",
            },
          ]}
        >
          <View style={styles.modalHead}>
            <View>
              <Text style={styles.modalTitle}>Add students</Text>
              <Text style={styles.modalHelp}>
                Select existing students or create a new student.
              </Text>
            </View>
            <Pressable onPress={close}>
              <Ionicons
                name="close"
                size={moderateScale(25)}
                color={colors.text}
              />
            </Pressable>
          </View>
          <View style={pickerStyles.modeTabs}>
            <Pressable
              onPress={() => setMode("existing")}
              style={[
                pickerStyles.modeTab,
                mode === "existing" && pickerStyles.modeTabActive,
              ]}
            >
              <Text
                style={[
                  pickerStyles.modeText,
                  mode === "existing" && pickerStyles.modeTextActive,
                ]}
              >
                Existing students
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("new")}
              style={[
                pickerStyles.modeTab,
                mode === "new" && pickerStyles.modeTabActive,
              ]}
            >
              <Text
                style={[
                  pickerStyles.modeText,
                  mode === "new" && pickerStyles.modeTextActive,
                ]}
              >
                Create new
              </Text>
            </Pressable>
          </View>
          {mode === "existing" ? (
            <>
              <View style={pickerStyles.directorySearch}>
                <Ionicons
                  name="search"
                  size={moderateScale(17)}
                  color={colors.muted}
                />
                <TextInput
                  value={directorySearch}
                  onChangeText={setDirectorySearch}
                  placeholder="Search student directory"
                  placeholderTextColor={colors.placeholder}
                  style={pickerStyles.directorySearchInput}
                />
              </View>
              <View style={pickerStyles.selectionToolbar}>
                <Text style={pickerStyles.selectionCount}>
                  {selectedIds.length} selected
                </Text>
                <Pressable disabled={!available.length} onPress={toggleAll}>
                  <Text
                    style={[
                      pickerStyles.selectAll,
                      !available.length && {
                        opacity: 0.4,
                      },
                    ]}
                  >
                    {allAvailableSelected
                      ? "Clear visible"
                      : directorySearch
                        ? "Select all results"
                        : "Select all"}
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                style={pickerStyles.studentChoices}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {directory.loading ? (
                  <LoadingState />
                ) : available.length ? (
                  available.map((student) => (
                    <Pressable
                      key={student.id}
                      onPress={() => toggleStudent(student.id)}
                      style={[
                        pickerStyles.studentChoice,
                        selectedIds.includes(student.id) &&
                          pickerStyles.studentChoiceSelected,
                      ]}
                    >
                      <Ionicons
                        name={
                          selectedIds.includes(student.id)
                            ? "checkbox"
                            : "square-outline"
                        }
                        size={moderateScale(21)}
                        color={
                          selectedIds.includes(student.id)
                            ? colors.primary
                            : colors.muted
                        }
                      />
                      <Avatar
                        name={student.fullName}
                        size={moderateScale(35)}
                      />
                      <View style={pickerStyles.choiceCopy}>
                        <Text style={pickerStyles.choiceName}>
                          {student.fullName}
                        </Text>
                        <Text style={pickerStyles.choiceId}>
                          ID: {student.studentNo}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <Text style={pickerStyles.noAvailable}>
                    {directorySearch
                      ? "No matching students are available."
                      : "Every student in your directory is already in this class."}
                  </Text>
                )}
              </ScrollView>
              <Pressable
                disabled={enrollState.loading || !selectedIds.length}
                onPress={enrollSelected}
                style={[
                  styles.modalSave,
                  (enrollState.loading || !selectedIds.length) && {
                    opacity: 0.5,
                  },
                ]}
              >
                <Text style={styles.gradeButtonText}>
                  {enrollState.loading
                    ? "Adding…"
                    : `Add selected (${selectedIds.length})`}
                </Text>
              </Pressable>
            </>
          ) : (
            <ScrollView
              style={styles.newStudentForm}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                value={values.studentNo}
                onChangeText={(studentNo) =>
                  setValues({
                    ...values,
                    studentNo,
                  })
                }
                placeholder="Student number"
                placeholderTextColor={colors.placeholder}
                style={styles.modalInput}
              />
              <TextInput
                value={values.lrn}
                onChangeText={(lrn) =>
                  setValues({
                    ...values,
                    lrn,
                  })
                }
                placeholder="LRN"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={12}
                style={styles.modalInput}
              />
              <TextInput
                value={values.firstName}
                onChangeText={(firstName) =>
                  setValues({
                    ...values,
                    firstName,
                  })
                }
                placeholder="First name"
                placeholderTextColor={colors.placeholder}
                style={styles.modalInput}
              />
              <TextInput
                value={values.lastName}
                onChangeText={(lastName) =>
                  setValues({
                    ...values,
                    lastName,
                  })
                }
                placeholder="Last name"
                placeholderTextColor={colors.placeholder}
                style={styles.modalInput}
              />
              <TextInput
                value={values.birthDate}
                onChangeText={(birthDate) =>
                  setValues({
                    ...values,
                    birthDate,
                  })
                }
                placeholder="Birth date (YYYY-MM-DD)"
                placeholderTextColor={colors.placeholder}
                style={styles.modalInput}
              />
              <View style={styles.genderRow}>
                <Text style={styles.genderLabel}>Gender</Text>
                {(["MALE", "FEMALE"] as const).map((sex) => (
                  <Pressable
                    key={sex}
                    onPress={() => setValues({ ...values, sex })}
                    style={[
                      styles.genderChoice,
                      values.sex === sex && styles.genderChoiceActive,
                    ]}
                  >
                    <Ionicons
                      name={
                        values.sex === sex
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={moderateScale(18)}
                      color={
                        values.sex === sex ? colors.primary : colors.iconMuted
                      }
                    />
                    <Text
                      style={[
                        styles.genderChoiceText,
                        values.sex === sex && styles.genderChoiceTextActive,
                      ]}
                    >
                      {sex === "MALE" ? "Male" : "Female"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={values.email}
                onChangeText={(email) =>
                  setValues({
                    ...values,
                    email,
                  })
                }
                placeholder="Email (optional)"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.modalInput}
              />
              <Pressable
                disabled={newStudentDisabled}
                onPress={saveNew}
                style={[
                  styles.modalSave,
                  newStudentDisabled && {
                    opacity: 0.5,
                  },
                ]}
              >
                <Text style={styles.gradeButtonText}>
                  {addState.loading ? "Adding…" : "Create and add student"}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summary: {
    margin: spacing(2),
    padding: spacing(1.875),
    borderRadius: borderRadius.large,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
  },
  summaryValue: {
    color: colors.text,
    fontSize: typography.fontSize.large,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    marginTop: spacing(0.25),
    fontFamily: typography.fontFamily.regular,
  },
  summaryDivider: {
    width: moderateScale(1),
    height: moderateScale(38),
    backgroundColor: colors.border,
    marginHorizontal: spacing(2.25),
  },
  gradeButton: {
    marginLeft: "auto",
    backgroundColor: colors.primary,
    height: moderateScale(38),
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.625),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.625),
  },
  gradeButtonText: {
    color: colors.surface,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.bold,
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
  input: {
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
  emptyList: {
    flexGrow: 1,
  },
  emptyRoster: {
    minHeight: moderateScale(235),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(3),
  },
  emptyRosterIcon: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: borderRadius.large,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  emptyRosterTitle: {
    color: colors.text,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing(1.625),
    fontFamily: typography.fontFamily.bold,
  },
  emptyRosterText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.small,
    textAlign: "center",
    marginTop: spacing(0.75),
    fontFamily: typography.fontFamily.regular,
  },
  emptyRosterButton: {
    height: moderateScale(40),
    marginTop: spacing(1.875),
    paddingHorizontal: spacing(1.75),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.75),
  },
  emptyRosterButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
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
  statusTrigger: {
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
  statusTriggerText: {
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing(1.5),
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.fontSize.large,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  modalHelp: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.5),
    fontFamily: typography.fontFamily.regular,
  },
  modalInput: {
    height: moderateScale(47),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.625),
    color: colors.text,
    marginTop: spacing(1.25),
  },
  newStudentForm: {
    flexShrink: 1,
  },
  genderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    marginTop: spacing(1.25),
  },
  genderLabel: {
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing(0.5),
    fontFamily: typography.fontFamily.bold,
  },
  genderChoice: {
    flex: 1,
    height: moderateScale(40),
    borderRadius: borderRadius.medium,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing(0.75),
    alignItems: "center",
    justifyContent: "center",
  },
  genderChoiceActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  genderChoiceText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  genderChoiceTextActive: {
    color: colors.primary,
  },
  modalSave: {
    height: moderateScale(49),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing(2.25),
  },
  disabledSave: {
    opacity: 0.5,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1.25),
    marginTop: spacing(0.75),
  },
  statusChoice: {
    width: "47%",
    minHeight: moderateScale(65),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.large,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.625),
  },
  statusChoiceText: {
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
});
