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
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReportSchool } from "@/core/types";
import { MOBILE_ME_QUERY } from "@/features/auth/graphql/queries";
import { ErrorState, LoadingState, ScreenHeader } from "@/shared/components/ui";
import {
  MY_SCHOOL_PROFILE_QUERY,
  UPDATE_MY_SCHOOL_PROFILE_MUTATION,
} from "@/features/settings/graphql";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
const { spacing, typography, colors, borderRadius } = theme;
const fields: Array<{
  key: Exclude<keyof ReportSchool, "name">;
  label: string;
  placeholder: string;
}> = [
  {
    key: "schoolIdNumber",
    label: "School ID",
    placeholder: "Six-digit school ID",
  },
  {
    key: "region",
    label: "Region",
    placeholder: "Region",
  },
  {
    key: "division",
    label: "Division",
    placeholder: "Schools Division",
  },
  {
    key: "district",
    label: "District",
    placeholder: "District",
  },
  {
    key: "address",
    label: "School address",
    placeholder: "Complete school address",
  },
  {
    key: "schoolHeadName",
    label: "School head",
    placeholder: "Full name",
  },
];
const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const profile = useQuery<{
    mySchoolProfile: ReportSchool;
  }>(MY_SCHOOL_PROFILE_QUERY);
  const account = useQuery<{
    me: {
      isIndependent: boolean;
    };
  }>(MOBILE_ME_QUERY);
  const [values, setValues] = useState<Record<string, string>>({});
  const [save, state] = useMutation(UPDATE_MY_SCHOOL_PROFILE_MUTATION);
  useEffect(() => {
    if (profile.data)
      setValues(
        Object.fromEntries(
          fields.map(({ key }) => [
            key,
            profile.data!.mySchoolProfile[key] ?? "",
          ]),
        ),
      );
  }, [profile.data]);
  if (profile.loading && !profile.data)
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <LoadingState />
      </View>
    );
  if (profile.error && !profile.data)
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ErrorState message={profile.error.message} retry={profile.refetch} />
      </View>
    );
  const editable = Boolean(account.data?.me.isIndependent);
  const submit = async () => {
    try {
      await save({
        variables: {
          input: values,
        },
      });
      Alert.alert("Saved", "School report details were updated.");
    } catch (error) {
      Alert.alert(
        "Not saved",
        error instanceof Error ? error.message : "Try again.",
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
        title="School details"
        subtitle="Used in SF2, SF9 and SF5 CSV exports"
        onBack={router.back}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>
            {profile.data?.mySchoolProfile.name}
          </Text>
          <Text style={styles.noticeText}>
            {editable
              ? "Complete every field before finalizing school reports."
              : "Your school administrator maintains these details in E-Guro Portal."}
          </Text>
        </View>
        {fields.map(({ key, label, placeholder }) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              editable={editable}
              value={values[key] ?? ""}
              onChangeText={(value) =>
                setValues({
                  ...values,
                  [key]: value,
                })
              }
              placeholder={placeholder}
              placeholderTextColor={colors.placeholder}
              style={[styles.input, !editable && styles.readonly]}
            />
          </View>
        ))}
        {editable && (
          <Pressable
            disabled={state.loading}
            onPress={submit}
            style={styles.save}
          >
            <Text style={styles.saveText}>
              {state.loading ? "Saving…" : "Save school details"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
};
export default SettingsScreen;
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing(2),
    paddingBottom: spacing(5),
  },
  notice: {
    padding: spacing(1.75),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing(1),
  },
  noticeTitle: {
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.bold,
  },
  noticeText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing(0.375),
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
  input: {
    height: moderateScale(47),
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(1.625),
    color: colors.text,
    backgroundColor: colors.surface,
  },
  readonly: {
    backgroundColor: colors.neutral,
  },
  save: {
    height: moderateScale(49),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing(2.75),
  },
  saveText: {
    color: colors.surface,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
});
