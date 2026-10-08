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
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
import { Classroom } from "@/core/types";
import { Card } from "@/shared/components/ui";
import { formatClassTime } from "@/features/classes/utils/formatClassTime";

const { spacing, typography, colors, borderRadius } = theme;

export const ClassCard = ({ item }: { item: Classroom }) => (
  <Pressable onPress={() => router.push(`/class/${item.id}`)}>
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.book}>
          <Ionicons
            name="book"
            size={moderateScale(21)}
            color={colors.purple}
          />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.subject}>
            {item.subject}
          </Text>
          <View style={styles.sectionRow}>
            <Text numberOfLines={1} style={styles.grade}>
              {item.gradeLevel === 0
                ? "Kindergarten"
                : `Grade/Year ${item.gradeLevel}`}
              , {item.section}
            </Text>
            {item.isAdvisory && (
              <View style={styles.advisoryBadge}>
                <Ionicons
                  name="school-outline"
                  size={moderateScale(10)}
                  color={colors.muted}
                />
                <Text style={styles.advisoryBadgeText}>Advisory</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={moderateScale(20)}
          color={colors.iconMutedStrong}
        />
      </View>

      <View style={styles.divider} />
      <View style={styles.info}>
        <ClassInfo icon="calendar-outline" text={item.scheduleDay} />
        <ClassInfo
          icon="time-outline"
          text={`${formatClassTime(item.startTime)}–${formatClassTime(item.endTime)}`}
        />
        <ClassInfo icon="location-outline" text={item.room} />
        <ClassInfo
          icon="people-outline"
          text={`${item.studentCount} students`}
        />
      </View>

      <View style={styles.buttons}>
        <Pressable
          onPress={() => router.push(`/class/${item.id}`)}
          style={styles.secondary}
        >
          <Ionicons
            name="checkbox-outline"
            size={moderateScale(17)}
            color={colors.primary}
          />
          <Text style={styles.secondaryText}>Attendance</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/grades/${item.id}`)}
          style={styles.primary}
        >
          <Ionicons
            name="create-outline"
            size={moderateScale(17)}
            color={colors.surface}
          />
          <Text style={styles.primaryText}>Grades</Text>
        </Pressable>
      </View>
    </Card>
  </Pressable>
);

const ClassInfo = ({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) => (
  <View style={styles.infoItem}>
    <Ionicons name={icon} size={moderateScale(15)} color={colors.muted} />
    <Text style={styles.infoText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(2.5),
  },
  cardTop: {
    minHeight: moderateScale(46),
    flexDirection: "row",
    alignItems: "center",
  },
  book: {
    width: moderateScale(46),
    height: moderateScale(46),
    borderRadius: borderRadius.large,
    backgroundColor: colors.purpleSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: moderateScale(0),
    marginLeft: spacing(1.25),
  },
  subject: {
    fontSize: typography.fontSize.medium,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  sectionRow: {
    alignItems: "flex-start",
    gap: spacing(0.5),
    marginTop: spacing(0.375),
  },
  advisoryBadge: {
    height: moderateScale(20),
    paddingHorizontal: spacing(0.75),
    borderRadius: borderRadius.medium,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.375),
    backgroundColor: colors.neutralSoft,
  },
  advisoryBadgeText: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  grade: {
    flexShrink: 1,
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.regular,
  },
  divider: {
    height: moderateScale(1),
    backgroundColor: colors.border,
    marginVertical: spacing(1.375),
  },
  info: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1.25),
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.5),
  },
  infoText: {
    fontSize: typography.fontSize.small,
    color: colors.muted,
    fontFamily: typography.fontFamily.regular,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing(1),
    marginTop: spacing(1.5),
  },
  secondary: {
    flex: 1,
    height: moderateScale(38),
    borderRadius: borderRadius.medium,
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing(0.625),
  },
  secondaryText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.bold,
  },
  primary: {
    flex: 1,
    height: moderateScale(38),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing(0.625),
  },
  primaryText: {
    color: colors.surface,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.bold,
  },
});
