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
import { useState } from "react";
import {
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
import * as XLSX from "xlsx";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/ui";
import { ClassCard } from "@/features/classes/components/ClassCard";
import { formatClassTime } from "@/features/classes/utils/formatClassTime";
import { CLASSES_QUERY } from "@/features/classes/graphql/queries/getClasses";
import { Classroom, EducationLevel, StudentGroup } from "@/core/types";
import { CREATE_CLASS_MUTATION } from "@/features/classes/graphql/mutations/createClass";
import { STUDENT_GROUPS_QUERY } from "@/features/students/graphql/queries/getStudents";
import { showAppBanner } from "@/shared/components/feedback";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { saveAutoSizedWorkbook } from "@/shared/utils/spreadsheetExport";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
const { spacing, typography, colors, borderRadius } = theme;
const ClassesScreen = () => {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refetch } = useQuery<{
    classes: Classroom[];
  }>(CLASSES_QUERY);
  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.titleBar}>
        <View>
          <Text style={styles.eyebrow}>TEACHING</Text>
          <Text style={styles.title}>My Classes</Text>
        </View>
      </View>
      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState message={error.message} retry={refetch} />
      ) : (
        <FlatList
          data={data?.classes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={loading}
          ListEmptyComponent={
            <EmptyState
              title="No classes yet"
              detail="Open Sections, select a section, then add its first subject class."
            />
          }
          renderItem={({ item }) => <ClassCard item={item} />}
        />
      )}
    </View>
  );
};
export const CreateClassModal = ({
  visible,
  group,
  close,
  completed,
}: {
  visible: boolean;
  group?: StudentGroup;
  close: () => void;
  completed: () => Promise<void>;
}) => {
  const now = new Date();
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const [values, setValues] = useState({
    subject: "",
    gradeLevel: group ? String(group.gradeLevel) : "",
    section: group?.section ?? "",
    room: "",
    startTime: "08:00",
    endTime: "09:00",
    schoolYear: group?.schoolYear ?? `${start}-${start + 1}`,
    term: group?.term ?? "Full Year",
    educationLevel: group?.educationLevel ?? ("ELEMENTARY" as EducationLevel),
    isAdvisory: group?.isAdvisory ?? false,
  });
  const [scheduleDays, setScheduleDays] = useState(["Monday"]);
  const [picker, setPicker] = useState<
    "startTime" | "endTime" | "schoolYear" | "term" | "educationLevel"
  >();
  const [create, state] = useMutation(CREATE_CLASS_MUTATION);
  const save = async () => {
    try {
      const result = await create({
        variables: {
          input: {
            ...values,
            groupId: group?.id,
            scheduleDay: scheduleDays.join(","),
            gradeLevel: Number(values.gradeLevel),
          },
        },
        refetchQueries: [
          {
            query: STUDENT_GROUPS_QUERY,
          },
        ],
        awaitRefetchQueries: true,
        errorPolicy: "none",
      });
      if (!result.data?.createClass)
        throw new Error("The server did not confirm the class was created.");
      await completed();
      showAppBanner(
        "Class created",
        `${result.data.createClass.subject} was added to the section.`,
        "success",
      );
    } catch (error) {
      showAppBanner("Class not created", getErrorMessage(error), "danger");
    }
  };
  const field = (
    key: "subject" | "gradeLevel" | "section" | "room",
    placeholder: string,
    keyboardType?: "numeric",
  ) => (
    <TextInput
      value={values[key]}
      onChangeText={(value) =>
        setValues({
          ...values,
          [key]: value,
        })
      }
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      keyboardType={keyboardType}
      style={styles.modalInput}
    />
  );
  const toggleDay = (day: string) =>
    setScheduleDays(
      scheduleDays.includes(day)
        ? scheduleDays.filter((value) => value !== day)
        : [...scheduleDays, day],
    );
  const disabled =
    state.loading ||
    !values.subject.trim() ||
    !values.gradeLevel ||
    !values.section.trim() ||
    !values.room.trim() ||
    !scheduleDays.length;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <View>
              <Text style={styles.modalTitle}>Add class</Text>
              <Text style={styles.modalHelp}>
                {group
                  ? `${group.displayName}, ${group.studentCount} students will be assigned automatically.`
                  : "You can add students after creating it."}
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Subject</Text>
            {field("subject", "Mathematics")}
            {!group && (
              <>
                <View style={styles.two}>
                  <View style={styles.half}>
                    <Text style={styles.label}>Grade/year</Text>
                    {field("gradeLevel", "6", "numeric")}
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>Section</Text>
                    {field("section", "Rizal")}
                  </View>
                </View>
                <PickerField
                  label="Education level"
                  value={educationLevelLabel(values.educationLevel)}
                  onPress={() => setPicker("educationLevel")}
                />
              </>
            )}
            <Text style={styles.label}>Room or location</Text>
            {field("room", "Room 204")}
            <Text style={styles.label}>Schedule days</Text>
            <View style={styles.dayGrid}>
              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((day) => (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  style={[
                    styles.dayChip,
                    scheduleDays.includes(day) && styles.dayChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      scheduleDays.includes(day) && styles.dayTextSelected,
                    ]}
                  >
                    {day.slice(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.two}>
              <PickerField
                label="Starts"
                value={formatClassTime(values.startTime)}
                onPress={() => setPicker("startTime")}
              />
              <PickerField
                label="Ends"
                value={formatClassTime(values.endTime)}
                onPress={() => setPicker("endTime")}
              />
            </View>
            {!group && (
              <>
                <View style={styles.two}>
                  <PickerField
                    label="School year"
                    value={values.schoolYear}
                    onPress={() => setPicker("schoolYear")}
                  />
                  <PickerField
                    label="Term"
                    value={values.term}
                    onPress={() => setPicker("term")}
                  />
                </View>
                {[
                  "KINDERGARTEN",
                  "ELEMENTARY",
                  "JUNIOR_HIGH",
                  "SENIOR_HIGH",
                ].includes(values.educationLevel) && (
                  <Pressable
                    onPress={() =>
                      setValues({
                        ...values,
                        isAdvisory: !values.isAdvisory,
                      })
                    }
                    style={classFormStyles.advisoryToggle}
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
                      <Text style={classFormStyles.advisoryTitle}>
                        I am the section adviser
                      </Text>
                      <Text style={classFormStyles.advisoryHelp}>
                        Enables daily attendance and section reports.
                      </Text>
                    </View>
                  </Pressable>
                )}
              </>
            )}
            <Pressable
              disabled={disabled}
              onPress={save}
              style={[
                styles.save,
                disabled && {
                  opacity: 0.5,
                },
              ]}
            >
              <Text style={styles.primaryText}>
                {state.loading ? "Creating…" : "Create class"}
              </Text>
            </Pressable>
          </ScrollView>
          <OptionPicker
            visible={Boolean(picker)}
            title={
              picker === "startTime"
                ? "Select start time"
                : picker === "endTime"
                  ? "Select end time"
                  : picker === "schoolYear"
                    ? "Select school year"
                    : picker === "educationLevel"
                      ? "Select education level"
                      : "Select term"
            }
            selected={picker ? values[picker] : undefined}
            options={
              picker === "startTime" || picker === "endTime"
                ? timeOptions
                : picker === "schoolYear"
                  ? Array.from(
                      {
                        length: 7,
                      },
                      (_, index) => `${start - 2 + index}-${start - 1 + index}`,
                    )
                  : picker === "educationLevel"
                    ? [
                        "KINDERGARTEN",
                        "ELEMENTARY",
                        "JUNIOR_HIGH",
                        "SENIOR_HIGH",
                        "COLLEGE",
                        "CUSTOM",
                      ]
                    : [
                        "Full Year",
                        "1st Quarter",
                        "2nd Quarter",
                        "3rd Quarter",
                        "4th Quarter",
                        "1st Semester",
                        "2nd Semester",
                        "1st Trimester",
                        "2nd Trimester",
                        "3rd Trimester",
                        "Summer",
                      ]
            }
            format={
              picker === "startTime" || picker === "endTime"
                ? formatClassTime
                : picker === "educationLevel"
                  ? educationLevelLabel
                  : undefined
            }
            close={() => setPicker(undefined)}
            select={(value) => {
              if (picker === "educationLevel")
                setValues({
                  ...values,
                  educationLevel: value as EducationLevel,
                  isAdvisory: ["COLLEGE", "CUSTOM"].includes(value)
                    ? false
                    : values.isAdvisory,
                });
              else if (picker)
                setValues({
                  ...values,
                  [picker]: value,
                });
              setPicker(undefined);
            }}
          />
        </View>
      </View>
    </Modal>
  );
};
type ImportedClass = {
  subject: string;
  room: string;
  scheduleDay: string;
  startTime: string;
  endTime: string;
};
const classTemplate =
  'subject,room,scheduleDays,startTime,endTime\nMathematics,Room 204,"Monday,Wednesday,Friday",08:00,09:00\nEnglish,Room 204,"Tuesday,Thursday",09:00,10:00\n';
export const ImportClassesModal = ({
  visible,
  group,
  close,
  completed,
}: {
  visible: boolean;
  group: StudentGroup;
  close: () => void;
  completed: (count: number) => Promise<void>;
}) => {
  const [create, createState] = useMutation(CREATE_CLASS_MUTATION);
  const [downloading, setDownloading] = useState(false);
  const downloadTemplate = async () => {
    if (Platform.OS !== "android") {
      showAppBanner(
        "Android download only",
        "Direct folder saving is currently available on Android.",
        "danger",
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
        "e-guro-classes-import-template.xlsx",
        classTemplate,
        "Classes",
      );
      showAppBanner(
        "Template downloaded",
        `${fileName} was saved to the selected folder.`,
        "success",
      );
    } catch (error) {
      showAppBanner(
        "Template not downloaded",
        getErrorMessage(error),
        "danger",
      );
    } finally {
      setDownloading(false);
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
      const workbook = XLSX.read(source, {
        type: isWorkbook ? "base64" : "string",
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]!];
      if (!sheet) throw new Error("The selected file has no worksheet.");
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
      });
      const classes = parseImportedClasses(rows);
      if (classes.length > 100)
        throw new Error("Import up to 100 classes at a time.");
      for (const item of classes) {
        const result = await create({
          variables: {
            input: {
              ...item,
              groupId: group.id,
              gradeLevel: group.gradeLevel,
              section: group.section,
              schoolYear: group.schoolYear,
              term: group.term,
              educationLevel: group.educationLevel,
              isAdvisory: false,
            },
          },
          errorPolicy: "none",
        });
        if (!result.data?.createClass)
          throw new Error(`Could not create ${item.subject}.`);
      }
      await completed(classes.length);
      showAppBanner(
        "Classes imported",
        `${classes.length} class${classes.length === 1 ? "" : "es"} added to ${group.displayName}.`,
        "success",
      );
    } catch (error) {
      showAppBanner("Classes not imported", getErrorMessage(error), "danger");
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <View
              style={{
                flex: 1,
              }}
            >
              <Text style={styles.modalTitle}>Import classes</Text>
              <Text style={styles.modalHelp}>
                Every imported class will use this section's grade, school year,
                term, and roster.
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
          <View style={styles.templateBox}>
            <Text style={styles.templateTitle}>Required columns</Text>
            <Text style={styles.templateCode}>
              subject, room, scheduleDays, startTime, endTime
            </Text>
            <Text style={styles.templateHelp}>
              Use times in 24-hour format, e.g. 08:00 and 13:30. CSV and Excel
              files are supported.
            </Text>
          </View>
          <Pressable
            disabled={downloading || createState.loading}
            onPress={() => void downloadTemplate()}
            style={[
              styles.templateButton,
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
            <Text style={styles.templateButtonText}>
              {downloading ? "Preparing…" : "Download Excel sample"}
            </Text>
          </Pressable>
          <Pressable
            disabled={downloading || createState.loading}
            onPress={() => void chooseFile()}
            style={[
              styles.save,
              styles.importFileButton,
              {
                justifyContent: "center",
                flexDirection: "row",
                gap: spacing(0.75),
              },
              (downloading || createState.loading) && {
                opacity: 0.5,
              },
            ]}
          >
            <Ionicons
              name="document-attach-outline"
              size={moderateScale(18)}
              color={colors.surface}
            />
            <Text
              style={[
                styles.primaryText,
                {
                  fontSize: typography.fontSize.small,
                  fontFamily: typography.fontFamily.regular,
                },
              ]}
            >
              {createState.loading ? "Importing…" : "Choose CSV or Excel file"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
const parseImportedClasses = (rows: unknown[][]): ImportedClass[] => {
  if (rows.length < 2)
    throw new Error(
      "The file has no class rows. Download the sample file to use the correct format.",
    );
  const headers = rows[0]!.map((value) =>
    String(value).trim().toLowerCase().replace(/\s+/g, ""),
  );
  const indexOf = (...names: string[]) =>
    headers.findIndex((header) => names.includes(header));
  const subject = indexOf("subject");
  const room = indexOf("room", "location");
  const scheduleDay = indexOf("scheduledays", "scheduleday", "days");
  const startTime = indexOf("starttime", "start");
  const endTime = indexOf("endtime", "end");
  if (
    [subject, room, scheduleDay, startTime, endTime].some((index) => index < 0)
  )
    throw new Error(
      "Use the columns: subject, room, scheduleDays, startTime, endTime",
    );
  return rows
    .slice(1)
    .filter((row) => row.some((value) => String(value).trim()))
    .map((row, index) => {
      const item = {
        subject: String(row[subject] ?? "").trim(),
        room: String(row[room] ?? "").trim(),
        scheduleDay: String(row[scheduleDay] ?? "").trim(),
        startTime: String(row[startTime] ?? "").trim(),
        endTime: String(row[endTime] ?? "").trim(),
      };
      if (Object.values(item).some((value) => !value))
        throw new Error(`Row ${index + 2} is missing a required value.`);
      if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.startTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.endTime)
      )
        throw new Error(`Row ${index + 2} must use times like 08:00 or 13:30.`);
      if (item.startTime >= item.endTime)
        throw new Error(`Row ${index + 2} must end after it starts.`);
      return item;
    });
};
const classFormStyles = StyleSheet.create({
  advisoryToggle: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(1.25),
    marginTop: spacing(2),
    padding: spacing(1.5),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primarySoft,
  },
  advisoryTitle: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  advisoryHelp: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing(0.25),
    fontFamily: typography.fontFamily.regular,
  },
});
const timeOptions = Array.from(
  {
    length: 38,
  },
  (_, index) => {
    const minutes = (index + 10) * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  },
);
const PickerField = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) => {
  return (
    <View style={styles.half}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={onPress} style={styles.pickerField}>
        <Text style={styles.pickerValue}>{value}</Text>
        <Ionicons
          name="chevron-down"
          size={moderateScale(17)}
          color={colors.muted}
        />
      </Pressable>
    </View>
  );
};
const OptionPicker = ({
  visible,
  title,
  selected,
  options,
  format,
  close,
  select,
}: {
  visible: boolean;
  title: string;
  selected?: string;
  options: string[];
  format?: (value: string) => string;
  close: () => void;
  select: (value: string) => void;
}) => {
  const helper = title.includes("time")
    ? "Tap a time to use it for this class."
    : "Choose one option for this class.";
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.optionBackdrop}>
        <View style={styles.optionCard}>
          <View style={styles.modalHead}>
            <View
              style={{
                flex: 1,
              }}
            >
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.optionHelp}>{helper}</Text>
            </View>
            <Pressable onPress={close}>
              <Ionicons
                name="close"
                size={moderateScale(24)}
                color={colors.text}
              />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {options.map((option) => {
              const active = option === selected;
              return (
                <Pressable
                  key={option}
                  onPress={() => select(option)}
                  style={[styles.option, active && styles.optionActive]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {format ? format(option) : option}
                  </Text>
                  <Ionicons
                    name={active ? "checkmark-circle" : "ellipse-outline"}
                    size={moderateScale(21)}
                    color={active ? colors.primary : colors.iconMuted}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
const educationLevelLabel = (value: string) =>
  ({
    KINDERGARTEN: "Kindergarten",
    ELEMENTARY: "Elementary",
    JUNIOR_HIGH: "Junior high school",
    SENIOR_HIGH: "Senior high school",
    COLLEGE: "College",
    CUSTOM: "Custom",
  })[value] ?? value;
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2),
    paddingBottom: spacing(1.75),
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
  scan: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(3.75),
    gap: spacing(1.25),
  },
  primaryText: {
    color: colors.surface,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.bold,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrimSoft,
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    padding: spacing(2.5),
    paddingBottom: spacing(3.75),
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing(1),
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
  label: {
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing(1.625),
    marginBottom: spacing(0.75),
    fontFamily: typography.fontFamily.bold,
  },
  modalInput: {
    height: moderateScale(46),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.5),
    color: colors.text,
    backgroundColor: colors.surface,
  },
  two: {
    flexDirection: "row",
    gap: spacing(1.25),
  },
  half: {
    flex: 1,
  },
  save: {
    height: moderateScale(49),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing(2.625),
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(0.875),
  },
  dayChip: {
    minWidth: moderateScale(42),
    height: moderateScale(37),
    paddingHorizontal: spacing(1.125),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  dayTextSelected: {
    color: colors.surface,
  },
  pickerField: {
    height: moderateScale(46),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.5),
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerValue: {
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.semiBold,
    fontFamily: typography.fontFamily.semiBold,
  },
  templateBox: {
    marginTop: spacing(1),
    padding: spacing(1.625),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primarySoft,
  },
  templateTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  templateCode: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.75),
    fontFamily: typography.fontFamily.regular,
  },
  templateHelp: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing(0.75),
    fontFamily: typography.fontFamily.regular,
  },
  templateButton: {
    height: moderateScale(43),
    marginTop: spacing(1.5),
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.875),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing(0.75),
  },
  templateButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  importFileButton: {
    justifyContent: "flex-start",
    paddingHorizontal: spacing(1.875),
  },
  optionBackdrop: {
    flex: 1,
    backgroundColor: colors.scrimSoft,
    justifyContent: "flex-end",
  },
  optionCard: {
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  optionHelp: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.medium,
    marginTop: spacing(0.5),
    fontFamily: typography.fontFamily.regular,
  },
  option: {
    minHeight: moderateScale(52),
    paddingHorizontal: spacing(1.75),
    marginTop: spacing(1),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  optionTextActive: {
    color: colors.primary,
  },
});
export default ClassesScreen;
