/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
import { StyleSheet, Text, View } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
import { Student } from "@/core/types";
import { Avatar } from "@/shared/components/ui";

const { spacing, typography, colors } = theme;

export const StudentProfileHeader = ({
  student,
  classLabel,
}: {
  student: Student;
  classLabel: string;
}) => (
  <View style={styles.container}>
    <Avatar name={student.fullName} size={moderateScale(58)} />
    <View style={styles.copy}>
      <Text style={styles.name}>{student.fullName}</Text>
      <Text style={styles.id}>ID: {student.studentNo}</Text>
      <Text style={styles.className}>{classLabel}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    minHeight: moderateScale(88),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(2.25),
    paddingVertical: spacing(1.25),
    gap: spacing(1.625),
  },
  copy: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  name: {
    color: colors.text,
    fontSize: typography.fontSize.semiLarge,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  id: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.375),
    fontFamily: typography.fontFamily.regular,
  },
  className: {
    color: colors.primary,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.semiBold,
    marginTop: spacing(0.375),
    fontFamily: typography.fontFamily.semiBold,
  },
});
