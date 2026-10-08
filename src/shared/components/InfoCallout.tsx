/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";

const { spacing, typography, colors, borderRadius } = theme;

export const InfoCallout = ({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) => (
  <View style={styles.container}>
    <View style={styles.iconTile}>
      <Ionicons
        name={icon}
        size={moderateScale(20)}
        color={colors.primary}
      />
    </View>
    <View style={styles.copy}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing(2),
    marginTop: spacing(1.25),
    padding: spacing(1.25),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primarySoft,
  },
  iconTile: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: borderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    marginLeft: spacing(1.25),
  },
  title: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  description: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing(0.25),
    fontFamily: typography.fontFamily.regular,
  },
});
