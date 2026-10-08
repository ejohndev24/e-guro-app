/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
import { useMutation } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StudentGroup } from "@/core/types";
import { AppMessageModal, showAppBanner } from "@/shared/components/feedback";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { SET_GROUP_ADVISER_MUTATION } from "@/features/students/graphql/mutations/setGroupAdviser";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
const { spacing, typography, colors, borderRadius } = theme;
type Props = {
  group: StudentGroup;
  refresh: () => Promise<unknown>;
};
export const GroupAdviserControl = ({ group, refresh }: Props) => {
  const [confirming, setConfirming] = useState(false);
  const [isAdvisory, setIsAdvisory] = useState(group.isAdvisory);
  const [setGroupAdviser, state] = useMutation(SET_GROUP_ADVISER_MUTATION);
  useEffect(() => setIsAdvisory(group.isAdvisory), [group.isAdvisory]);
  if (isAdvisory)
    return (
      <View style={styles.assigned}>
        <Ionicons
          name="checkmark-circle"
          size={moderateScale(17)}
          color={colors.primary}
        />
        <Text style={styles.assignedText}>
          You are the adviser of this section
        </Text>
      </View>
    );
  const save = async () => {
    try {
      const result = await setGroupAdviser({
        variables: {
          input: {
            groupId: group.id,
            isAdvisory: true,
          },
        },
        errorPolicy: "none",
      });
      if (!result.data?.setGroupAdviser.isAdvisory)
        throw new Error("The server did not confirm adviser status.");
      setConfirming(false);
      setIsAdvisory(true);
      void refresh();
      showAppBanner(
        "Adviser status updated",
        `${group.displayName} is now your advisory section.`,
        "success",
      );
    } catch (error) {
      showAppBanner(
        "Could not update adviser status",
        getErrorMessage(error),
        "danger",
      );
    }
  };
  return (
    <>
      <Pressable
        disabled={state.loading}
        onPress={() => setConfirming(true)}
        style={[styles.button, state.loading && styles.disabled]}
      >
        <Ionicons
          name="person-add-outline"
          size={moderateScale(17)}
          color={colors.primary}
        />
        <Text style={styles.text}>Become adviser</Text>
      </Pressable>
      <AppMessageModal
        visible={confirming}
        title="Become adviser?"
        message="Daily attendance and section reports will be enabled for this section."
        confirmLabel="Become adviser"
        busy={state.loading}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void save()}
      />
    </>
  );
};
const styles = StyleSheet.create({
  button: {
    minHeight: moderateScale(40),
    marginTop: spacing(1.5),
    borderRadius: borderRadius.medium,
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.75),
  },
  text: {
    color: colors.primary,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  assigned: {
    minHeight: moderateScale(40),
    marginTop: spacing(1.5),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.75),
    paddingHorizontal: spacing(1.5),
  },
  assignedText: {
    color: colors.primary,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  disabled: {
    opacity: 0.55,
  },
});
