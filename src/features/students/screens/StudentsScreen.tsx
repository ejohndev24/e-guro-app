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
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { router as expoRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
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
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/shared/components/ui";
import { showAppBanner } from "@/shared/components/feedback";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { saveAutoSizedWorkbook } from "@/shared/utils/spreadsheetExport";
import { STUDENT_GROUPS_QUERY } from "@/features/students/graphql/queries/getStudents";
import {
  IMPORT_TEACHER_STUDENTS_MUTATION,
  SAVE_TEACHER_STUDENT_MUTATION,
} from "@/features/students/graphql/mutations/manageStudents";
import { CREATE_STUDENT_GROUP_MUTATION } from "@/features/students/graphql/mutations/createGroup";
import { Classroom, EducationLevel, Student, StudentGroup } from "@/core/types";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
import { SectionCard } from "@/features/students/components/SectionCard";
const { spacing, typography, colors, borderRadius } = theme;
const router = expoRouter as {
  push: (href: string) => void;
};
const StudentsScreen = () => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"group">();
  const [expandedId, setExpandedId] = useState<string>();
  const { data, loading, error, refetch } = useQuery<{
    studentGroups: StudentGroup[];
  }>(STUDENT_GROUPS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const groups = data?.studentGroups ?? [];
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return groups.flatMap((group) =>
      group.students
        .filter(
          (student) =>
            student.fullName.toLowerCase().includes(term) ||
            student.studentNo.toLowerCase().includes(term),
        )
        .map((student) => ({
          student,
          group,
        })),
    );
  }, [groups, search]);
  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.heading}>
        <View>
          <Text style={styles.eyebrow}>TEACHING</Text>
          <Text style={styles.title}>My Sections</Text>
        </View>
        <Pressable
          accessibilityLabel="Add section"
          onPress={() => setModal("group")}
          style={styles.primaryAction}
        >
          <Ionicons
            name="add"
            size={moderateScale(22)}
            color={colors.surface}
          />
        </Pressable>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={moderateScale(19)} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or student ID"
          placeholderTextColor={colors.placeholder}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>
      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState message={error.message} retry={refetch} />
      ) : search.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.group.id}:${item.student.id}`}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.searchResults}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              Search results ({results.length})
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No matching students"
              detail="Try a different name or student number."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/student/${item.student.id}`)}
              style={styles.searchResult}
            >
              <Avatar name={item.student.fullName} />
              <View style={styles.copy}>
                <Text style={styles.name}>{item.student.fullName}</Text>
                <Text style={styles.id}>
                  {item.group.displayName}, ID: {item.student.studentNo}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={moderateScale(18)}
                color={colors.iconMutedSoft}
              />
            </Pressable>
          )}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupList}
          refreshControl={undefined}
        >
          {groups.length ? (
            groups.map((group) => (
              <SectionCard
                key={group.id}
                group={group}
                expanded={expandedId === group.id}
                onToggle={() =>
                  setExpandedId(expandedId === group.id ? undefined : group.id)
                }
              />
            ))
          ) : (
            <EmptyState
              title="No sections yet"
              detail="Create a section, then add its subject classes and students."
            />
          )}
        </ScrollView>
      )}
      <CreateGroupModal
        visible={modal === "group"}
        close={() => setModal(undefined)}
        completed={async () => {
          setModal(undefined);
          await refetch();
        }}
      />
    </View>
  );
};
export default StudentsScreen;
const gradeYearOptions = (educationLevel: EducationLevel) => {
  if (educationLevel === "KINDERGARTEN") return [0];
  if (educationLevel === "ELEMENTARY") return [1, 2, 3, 4, 5, 6];
  if (educationLevel === "JUNIOR_HIGH") return [7, 8, 9, 10];
  if (educationLevel === "SENIOR_HIGH") return [11, 12];
  return [1, 2, 3, 4, 5, 6];
};
const gradeYearLabel = (educationLevel: EducationLevel, gradeLevel: number) => {
  if (educationLevel === "KINDERGARTEN") return "Kindergarten";
  return educationLevel === "COLLEGE"
    ? `Year ${gradeLevel}`
    : `Grade ${gradeLevel}`;
};
const CreateGroupModal = ({
  visible,
  close,
  completed,
}: {
  visible: boolean;
  close: () => void;
  completed: () => Promise<void>;
}) => {
  const now = new Date();
  const schoolYearStart =
    now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const [values, setValues] = useState({
    gradeLevel: "",
    section: "",
    schoolYear: `${schoolYearStart}-${schoolYearStart + 1}`,
    term: "Full Year",
    educationLevel: "ELEMENTARY" as EducationLevel,
    isAdvisory: false,
  });
  const [gradePickerOpen, setGradePickerOpen] = useState(false);
  const [createGroup, state] = useMutation(CREATE_STUDENT_GROUP_MUTATION);
  const basicEducation = [
    "KINDERGARTEN",
    "ELEMENTARY",
    "JUNIOR_HIGH",
    "SENIOR_HIGH",
  ].includes(values.educationLevel);
  const availableGrades = gradeYearOptions(values.educationLevel);
  const save = async () => {
    try {
      await createGroup({
        variables: {
          input: {
            ...values,
            gradeLevel: Number(values.gradeLevel),
          },
        },
      });
      await completed();
    } catch (error) {
      Alert.alert(
        "Section not created",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };
  return (
    <>
      <Sheet
        visible={visible}
        title="Add section"
        subtitle="Create the roster once, then add its subject classes."
        close={close}
      >
        <Text style={styles.label}>Education level</Text>
        <View style={styles.chipWrap}>
          {(
            [
              "KINDERGARTEN",
              "ELEMENTARY",
              "JUNIOR_HIGH",
              "SENIOR_HIGH",
              "COLLEGE",
            ] as EducationLevel[]
          ).map((level) => (
            <Pressable
              key={level}
              onPress={() =>
                setValues({
                  ...values,
                  educationLevel: level,
                  gradeLevel:
                    level === "KINDERGARTEN"
                      ? "0"
                      : gradeYearOptions(level).includes(
                            Number(values.gradeLevel),
                          )
                        ? values.gradeLevel
                        : "",
                  isAdvisory: ["COLLEGE", "CUSTOM"].includes(level)
                    ? false
                    : values.isAdvisory,
                  term: level === "COLLEGE" ? "1st Semester" : "Full Year",
                })
              }
              style={[
                styles.formChip,
                values.educationLevel === level && styles.formChipActive,
              ]}
            >
              <Text
                style={[
                  styles.formChipText,
                  values.educationLevel === level && styles.formChipTextActive,
                ]}
              >
                {level.replaceAll("_", " ")}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.formRow}>
          <View
            style={{
              flex: 1,
            }}
          >
            <Text style={styles.label}>Grade/year</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setGradePickerOpen(true)}
              style={styles.selectInput}
            >
              <Text
                style={[
                  styles.selectInputText,
                  !values.gradeLevel && styles.selectPlaceholder,
                ]}
              >
                {values.gradeLevel
                  ? gradeYearLabel(
                      values.educationLevel,
                      Number(values.gradeLevel),
                    )
                  : "Select"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={moderateScale(17)}
                color={colors.muted}
              />
            </Pressable>
          </View>
          <View
            style={{
              flex: 1,
            }}
          >
            <Text style={styles.label}>Section</Text>
            <TextInput
              value={values.section}
              onChangeText={(section) =>
                setValues({
                  ...values,
                  section,
                })
              }
              placeholder="e.g. Rizal or BSIT 2A"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>
        </View>
        <Text style={styles.label}>School year</Text>
        <View style={styles.chipWrap}>
          {Array.from(
            {
              length: 3,
            },
            (_, index) =>
              `${schoolYearStart - 1 + index}-${schoolYearStart + index}`,
          ).map((schoolYear) => (
            <Pressable
              key={schoolYear}
              onPress={() =>
                setValues({
                  ...values,
                  schoolYear,
                })
              }
              style={[
                styles.formChip,
                values.schoolYear === schoolYear && styles.formChipActive,
              ]}
            >
              <Text
                style={[
                  styles.formChipText,
                  values.schoolYear === schoolYear && styles.formChipTextActive,
                ]}
              >
                {schoolYear}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Term</Text>
        <View style={styles.chipWrap}>
          {(values.educationLevel === "COLLEGE"
            ? ["1st Semester", "2nd Semester", "Summer"]
            : ["Full Year", "1st Semester", "2nd Semester"]
          ).map((term) => (
            <Pressable
              key={term}
              onPress={() =>
                setValues({
                  ...values,
                  term,
                })
              }
              style={[
                styles.formChip,
                values.term === term && styles.formChipActive,
              ]}
            >
              <Text
                style={[
                  styles.formChipText,
                  values.term === term && styles.formChipTextActive,
                ]}
              >
                {term}
              </Text>
            </Pressable>
          ))}
        </View>
        {basicEducation && (
          <Pressable
            onPress={() =>
              setValues({
                ...values,
                isAdvisory: !values.isAdvisory,
              })
            }
            style={styles.adviserChoice}
          >
            <Ionicons
              name={values.isAdvisory ? "checkbox" : "square-outline"}
              size={moderateScale(21)}
              color={values.isAdvisory ? colors.primary : colors.muted}
            />
            <View
              style={{
                flex: 1,
              }}
            >
              <Text style={styles.choiceTitle}>
                I am the adviser of this section
              </Text>
              <Text style={styles.choiceMeta}>
                Enables daily attendance and section reports.
              </Text>
            </View>
          </Pressable>
        )}
        <Pressable
          disabled={
            state.loading || !values.gradeLevel || !values.section.trim()
          }
          onPress={save}
          style={[
            styles.save,
            (state.loading || !values.gradeLevel || !values.section.trim()) &&
              styles.disabled,
          ]}
        >
          <Text style={styles.saveText}>
            {state.loading ? "Creating…" : "Create section"}
          </Text>
        </Pressable>
      </Sheet>
      <Sheet
        visible={gradePickerOpen}
        title="Select grade/year"
        subtitle={`Choose the ${values.educationLevel === "COLLEGE" ? "college year" : "grade level"} for this section.`}
        close={() => setGradePickerOpen(false)}
      >
        <View style={styles.gradePicker}>
          {availableGrades.map((gradeLevel) => (
            <Pressable
              key={gradeLevel}
              onPress={() => {
                setValues({
                  ...values,
                  gradeLevel: String(gradeLevel),
                });
                setGradePickerOpen(false);
              }}
              style={[
                styles.gradeOption,
                values.gradeLevel === String(gradeLevel) &&
                  styles.gradeOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.gradeOptionText,
                  values.gradeLevel === String(gradeLevel) &&
                    styles.gradeOptionTextActive,
                ]}
              >
                {gradeYearLabel(values.educationLevel, gradeLevel)}
              </Text>
              <Ionicons
                name={
                  values.gradeLevel === String(gradeLevel)
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={moderateScale(21)}
                color={
                  values.gradeLevel === String(gradeLevel)
                    ? colors.primary
                    : colors.iconMuted
                }
              />
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
};
export const StudentModal = ({
  visible,
  classes,
  student,
  groupId,
  initialClassroomIds = [],
  close,
  completed,
}: {
  visible: boolean;
  classes: Classroom[];
  student?: Student;
  groupId?: string;
  initialClassroomIds?: string[];
  close: () => void;
  completed: () => Promise<void>;
}) => {
  const [values, setValues] = useState({
    studentNo: "",
    firstName: "",
    lastName: "",
    email: "",
    lrn: "",
    birthDate: "",
    sex: "" as "" | "MALE" | "FEMALE",
  });
  const [classroomIds, setClassroomIds] = useState<string[]>([]);
  const [save, state] = useMutation(SAVE_TEACHER_STUDENT_MUTATION);
  useEffect(() => {
    if (visible) {
      setClassroomIds(initialClassroomIds);
      setValues(
        student
          ? {
              studentNo: student.studentNo,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email ?? "",
              lrn: student.lrn ?? "",
              birthDate: student.birthDate?.slice(0, 10) ?? "",
              sex: student.sex ?? "",
            }
          : {
              studentNo: "",
              firstName: "",
              lastName: "",
              email: "",
              lrn: "",
              birthDate: "",
              sex: "",
            },
      );
    }
  }, [visible, student?.id]);
  const toggle = (id: string) =>
    setClassroomIds(
      classroomIds.includes(id)
        ? classroomIds.filter((value) => value !== id)
        : [...classroomIds, id],
    );
  const submit = async () => {
    try {
      await save({
        variables: {
          input: {
            studentNo: values.studentNo,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email || undefined,
            lrn: values.lrn || undefined,
            birthDate: values.birthDate || undefined,
            sex: values.sex || undefined,
            classroomIds,
            groupIds: groupId ? [groupId] : [],
          },
        },
      });
      setValues({
        studentNo: "",
        firstName: "",
        lastName: "",
        email: "",
        lrn: "",
        birthDate: "",
        sex: "",
      });
      setClassroomIds([]);
      await completed();
    } catch (error) {
      Alert.alert(
        "Student not saved",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };
  const disabled =
    state.loading ||
    !values.studentNo.trim() ||
    !values.firstName.trim() ||
    !values.lastName.trim();
  return (
    <Sheet
      visible={visible}
      title={student ? "Edit student" : "Add student"}
      subtitle={
        groupId
          ? "This student will be assigned to every class in the section."
          : "Complete student details now to prepare SF9 and SF5 reports."
      }
      close={close}
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
        style={styles.input}
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
        style={styles.input}
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
        style={styles.input}
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
        style={styles.input}
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
        style={styles.input}
      />
      <View style={studentFormStyles.sexRow}>
        <Text style={studentFormStyles.sexLabel}>Gender</Text>
        {(["MALE", "FEMALE"] as const).map((sex) => (
          <Pressable
            key={sex}
            onPress={() =>
              setValues({
                ...values,
                sex,
              })
            }
            style={[
              studentFormStyles.sexChoice,
              values.sex === sex && studentFormStyles.sexChoiceActive,
            ]}
          >
            <Ionicons
              name={
                values.sex === sex ? "radio-button-on" : "radio-button-off"
              }
              size={moderateScale(18)}
              color={values.sex === sex ? colors.primary : colors.iconMuted}
            />
            <Text
              style={[
                studentFormStyles.sexText,
                values.sex === sex && studentFormStyles.sexTextActive,
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
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      {!groupId && (
        <>
          <Text style={styles.label}>Assign to classes</Text>
          <ClassChoices
            classes={classes}
            selected={classroomIds}
            toggle={toggle}
          />
        </>
      )}
      <Pressable
        disabled={disabled}
        onPress={submit}
        style={[styles.save, disabled && styles.disabled]}
      >
        <Text style={styles.saveText}>
          {state.loading ? "Saving…" : "Save student"}
        </Text>
      </Pressable>
    </Sheet>
  );
};
export const ImportModal = ({
  visible,
  classes,
  groupId,
  initialClassroomIds = [],
  close,
  completed,
}: {
  visible: boolean;
  classes: Classroom[];
  groupId?: string;
  initialClassroomIds?: string[];
  close: () => void;
  completed: (count: number) => Promise<void>;
}) => {
  const [classroomIds, setClassroomIds] = useState<string[]>([]);
  const [importStudents, state] = useMutation(IMPORT_TEACHER_STUDENTS_MUTATION);
  const [downloadingSample, setDownloadingSample] = useState(false);
  useEffect(() => {
    if (visible) setClassroomIds(initialClassroomIds);
  }, [visible]);
  const toggle = (id: string) =>
    setClassroomIds(
      classroomIds.includes(id)
        ? classroomIds.filter((value) => value !== id)
        : [...classroomIds, id],
    );
  const downloadSample = async () => {
    if (Platform.OS !== "android") {
      showAppBanner(
        "Android download only",
        "Direct folder saving is currently available on Android.",
        "danger",
      );
      return;
    }
    setDownloadingSample(true);
    try {
      const permission =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return;
      const fileName = await saveAutoSizedWorkbook(
        permission.directoryUri,
        "e-guro-students-import-template.xlsx",
        "studentNo,firstName,lastName,email\n2026-001,Juan,Dela Cruz,juan@example.com\n2026-002,Angela,Garcia,\n",
        "Students",
      );
      showAppBanner(
        "Sample downloaded",
        `${fileName} was saved to the selected folder.`,
        "success",
      );
    } catch (error) {
      showAppBanner("Sample not downloaded", getErrorMessage(error), "danger");
    } finally {
      setDownloadingSample(false);
    }
  };
  const chooseFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/comma-separated-values",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const file = picked.assets[0]!;
      const isWorkbook =
        /\.xlsx$/i.test(file.name) || file.mimeType?.includes("spreadsheetml");
      const source = await FileSystem.readAsStringAsync(
        file.uri,
        isWorkbook
          ? {
              encoding: FileSystem.EncodingType.Base64,
            }
          : undefined,
      );
      let rows;
      if (isWorkbook) {
        const workbook = XLSX.read(source, {
          type: "base64",
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]!];
        if (!sheet) throw new Error("The selected file has no worksheet.");
        rows = parseStudentsRows(
          XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            defval: "",
          }),
        );
      } else rows = parseStudentsCsv(source);
      const result = await importStudents({
        variables: {
          inputs: rows.map((row) => ({
            ...row,
            classroomIds,
            groupIds: groupId ? [groupId] : [],
          })),
        },
      });
      await completed(result.data?.importTeacherStudents.count ?? rows.length);
    } catch (error) {
      showAppBanner("Students not imported", getErrorMessage(error), "danger");
    }
  };
  return (
    <Sheet
      visible={visible}
      title="Import students"
      subtitle={
        groupId
          ? "Every imported student will join this section and all of its classes."
          : "Choose the classes once, then import all rows from a CSV or Excel file."
      }
      close={close}
    >
      <View style={styles.csvHint}>
        <Text style={styles.csvTitle}>Required header</Text>
        <Text style={styles.csvCode}>studentNo,firstName,lastName,email</Text>
        <Text style={styles.csvNote}>
          Email may be blank. Student numbers must be unique in the file.
        </Text>
      </View>
      {!groupId && (
        <>
          <Text style={styles.label}>Assign every imported student to</Text>
          <ClassChoices
            classes={classes}
            selected={classroomIds}
            toggle={toggle}
          />
        </>
      )}
      <Pressable
        disabled={state.loading || downloadingSample}
        onPress={() => void downloadSample()}
        style={[
          styles.sampleButton,
          {
            justifyContent: "center",
          },
        ]}
      >
        <Ionicons
          name="download-outline"
          size={moderateScale(18)}
          color={colors.primary}
        />
        <Text style={styles.sampleButtonText}>
          {downloadingSample ? "Preparing sample…" : "Download Excel sample"}
        </Text>
      </Pressable>
      <Pressable
        disabled={state.loading || downloadingSample}
        onPress={chooseFile}
        style={[
          styles.save,
          styles.fileImportButton,
          {
            justifyContent: "center",
          },
          (state.loading || downloadingSample) && styles.disabled,
        ]}
      >
        <Ionicons
          name="document-attach-outline"
          size={moderateScale(18)}
          color={colors.surface}
        />
        <Text style={styles.importFileText}>
          {state.loading ? "Importing…" : "Choose CSV or Excel file"}
        </Text>
      </Pressable>
    </Sheet>
  );
};
const ClassChoices = ({
  classes,
  selected,
  toggle,
}: {
  classes: Classroom[];
  selected: string[];
  toggle: (id: string) => void;
}) => {
  if (!classes.length)
    return (
      <Text style={styles.emptyClasses}>
        No classes yet. Students can still be added and assigned later.
      </Text>
    );
  return (
    <View style={styles.choices}>
      {classes.map((room) => (
        <Pressable
          key={room.id}
          onPress={() => toggle(room.id)}
          style={[
            styles.choice,
            selected.includes(room.id) && styles.choiceSelected,
          ]}
        >
          <Ionicons
            name={selected.includes(room.id) ? "checkbox" : "square-outline"}
            size={moderateScale(20)}
            color={selected.includes(room.id) ? colors.primary : colors.muted}
          />
          <View
            style={{
              flex: 1,
            }}
          >
            <Text style={styles.choiceTitle}>{room.subject}</Text>
            <Text style={styles.choiceMeta}>
              {room.gradeLevel === 0
                ? "Kindergarten"
                : `Grade/Year ${room.gradeLevel}`}{" "}
              , {room.section}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
};
const Sheet = ({
  visible,
  title,
  subtitle,
  close,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  close: () => void;
  children: React.ReactNode;
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <View
              style={{
                flex: 1,
              }}
            >
              <Text style={styles.sheetTitle}>{title}</Text>
              <Text style={styles.sheetSubtitle}>{subtitle}</Text>
            </View>
            <Pressable onPress={close}>
              <Ionicons
                name="close"
                size={moderateScale(25)}
                color={colors.text}
              />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
const parseStudentsRows = (table: unknown[][]) => {
  if (table.length < 2)
    throw new Error("The selected file has no student rows.");
  const headers = table[0]!.map((value) => String(value).trim().toLowerCase());
  const indexes = {
    studentNo: headers.indexOf("studentno"),
    firstName: headers.indexOf("firstname"),
    lastName: headers.indexOf("lastname"),
    email: headers.indexOf("email"),
  };
  if (indexes.studentNo < 0 || indexes.firstName < 0 || indexes.lastName < 0)
    throw new Error("Use the header: studentNo,firstName,lastName,email");
  return table
    .slice(1)
    .filter((row) => row.some((value) => String(value).trim()))
    .map((row, index) => {
      const studentNo = String(row[indexes.studentNo] ?? "").trim();
      const firstName = String(row[indexes.firstName] ?? "").trim();
      const lastName = String(row[indexes.lastName] ?? "").trim();
      if (!studentNo || !firstName || !lastName)
        throw new Error(`Row ${index + 2} is missing a required value.`);
      const email =
        indexes.email >= 0
          ? String(row[indexes.email] ?? "").trim() || undefined
          : undefined;
      return {
        studentNo,
        firstName,
        lastName,
        email,
      };
    });
};
const parseStudentsCsv = (contents: string) => {
  const lines = contents
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  return parseStudentsRows(lines.map(parseCsvLine));
};
const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else value += character;
  }
  values.push(value);
  return values;
};
const studentFormStyles = StyleSheet.create({
  sexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    marginTop: spacing(1.25),
  },
  sexLabel: {
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing(0.5),
    fontFamily: typography.fontFamily.bold,
  },
  sexChoice: {
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
  sexChoiceActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  sexText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  sexTextActive: {
    color: colors.primary,
  },
});
const styles = StyleSheet.create({
  importFileText: {
    color: colors.surface,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heading: {
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2),
    paddingBottom: spacing(1.75),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headingActions: {
    flexDirection: "row",
    gap: spacing(1),
  },
  secondaryAction: {
    height: moderateScale(42),
    paddingHorizontal: spacing(1.375),
    gap: spacing(0.75),
    flexDirection: "row",
    borderRadius: borderRadius.large,
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  secondaryActionText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.bold,
  },
  primaryAction: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: borderRadius.large,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.fontSize.extraSmall,
    letterSpacing: 1.5,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  title: {
    fontSize: typography.fontSize.veryLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing(0.25),
    fontFamily: typography.fontFamily.bold,
  },
  search: {
    marginHorizontal: spacing(2),
    marginBottom: spacing(1.625),
    height: moderateScale(46),
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing(1.75),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing(1.125),
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.regular,
  },
  list: {
    marginHorizontal: spacing(2),
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing(1.75),
    paddingBottom: spacing(2.5),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    overflow: "hidden",
  },
  copy: {
    flex: 1,
    marginLeft: spacing(1.5),
  },
  name: {
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.bold,
  },
  id: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.5),
    fontFamily: typography.fontFamily.regular,
  },
  iconAction: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: borderRadius.large,
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  groupList: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(3.75),
    gap: spacing(1.25),
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(0.875),
  },
  formChip: {
    minHeight: moderateScale(36),
    paddingHorizontal: spacing(1.25),
    borderRadius: borderRadius.medium,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  formChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  formChipText: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  formChipTextActive: {
    color: colors.primary,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing(1.125),
  },
  adviserChoice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(1.125),
    padding: spacing(1.5),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.primarySoft,
    marginTop: spacing(2),
  },
  searchResults: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(3.75),
    gap: spacing(1.125),
  },
  resultCount: {
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.medium,
    marginBottom: spacing(0.375),
    fontFamily: typography.fontFamily.bold,
  },
  searchResult: {
    minHeight: moderateScale(70),
    paddingHorizontal: spacing(1.5),
    flexDirection: "row",
    alignItems: "center",
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.large,
    backgroundColor: colors.surface,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing(1.25),
  },
  sheetTitle: {
    color: colors.text,
    fontSize: typography.fontSize.large,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  sheetSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.medium,
    marginTop: spacing(0.5),
    paddingRight: spacing(1.5),
    fontFamily: typography.fontFamily.regular,
  },
  input: {
    height: moderateScale(47),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.625),
    color: colors.text,
    marginTop: spacing(1.25),
  },
  selectInput: {
    height: moderateScale(47),
    marginTop: spacing(1.25),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.625),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectInputText: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.regular,
  },
  selectPlaceholder: {
    color: colors.placeholder,
  },
  gradePicker: {
    gap: spacing(1),
    paddingTop: spacing(0.5),
  },
  gradeOption: {
    minHeight: moderateScale(52),
    paddingHorizontal: spacing(1.75),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gradeOptionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  gradeOptionText: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  gradeOptionTextActive: {
    color: colors.primary,
  },
  label: {
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing(2.25),
    marginBottom: spacing(1),
    fontFamily: typography.fontFamily.bold,
  },
  choices: {
    gap: spacing(0.875),
  },
  choice: {
    minHeight: moderateScale(56),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    padding: spacing(1.25),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.125),
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceTitle: {
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.bold,
  },
  choiceMeta: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    marginTop: spacing(0.375),
    fontFamily: typography.fontFamily.regular,
  },
  emptyClasses: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.medium,
    padding: spacing(1.5),
    backgroundColor: colors.background,
    borderRadius: borderRadius.medium,
    fontFamily: typography.fontFamily.regular,
  },
  save: {
    height: moderateScale(49),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing(0.875),
    marginTop: spacing(2.5),
  },
  fileImportButton: {
    justifyContent: "flex-start",
    paddingHorizontal: spacing(1.875),
  },
  saveText: {
    color: colors.surface,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  disabled: {
    opacity: 0.5,
  },
  csvHint: {
    padding: spacing(1.625),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.primarySoft,
    marginTop: spacing(0.75),
  },
  csvTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  csvCode: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.75),
    fontFamily: typography.fontFamily.regular,
  },
  csvNote: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing(0.625),
    fontFamily: typography.fontFamily.regular,
  },
  sampleButton: {
    height: moderateScale(45),
    marginTop: spacing(1.75),
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.875),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing(0.875),
  },
  sampleButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
});
