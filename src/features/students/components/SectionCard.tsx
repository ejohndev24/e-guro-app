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
import { router as expoRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";
import { StudentGroup } from "@/core/types";
import { Avatar } from "@/shared/components/ui";

const { spacing, typography, colors, borderRadius } = theme;
const router = expoRouter as { push: (href: string) => void };

export const SectionCard = ({
  group,
  expanded,
  onToggle,
}: {
  group: StudentGroup;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const openSection = () => router.push(`/group/${group.id}`);

  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.header}>
        <SectionBadge group={group} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {group.displayName}
          </Text>
          <View style={styles.infoRow}>
            <Text numberOfLines={1} style={styles.meta}>
              {group.studentCount} student
              {group.studentCount === 1 ? "" : "s"}, {group.classes.length}{" "}
              subject{group.classes.length === 1 ? "" : "s"}
            </Text>
            {group.isAdvisory && (
              <View style={styles.advisoryBadge}>
                <Ionicons
                  name="school-outline"
                  size={moderateScale(10)}
                  color={colors.muted}
                />
                <Text style={styles.advisoryText}>Advisory</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable onPress={openSection} style={styles.profileButton}>
          <Text style={styles.profileButtonText}>View section</Text>
        </Pressable>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={moderateScale(17)}
          color={colors.text}
        />
      </Pressable>

      <CollapsibleRoster expanded={expanded}>
        <View style={styles.students}>
          {group.students.length ? (
            group.students.map((student, index) => (
              <Pressable
                key={student.id}
                onPress={() => router.push(`/student/${student.id}`)}
                style={[
                  styles.studentRow,
                  index > 0 && styles.studentDivider,
                ]}
              >
                <Avatar name={student.fullName} size={moderateScale(39)} />
                <View style={styles.studentCopy}>
                  <Text style={styles.studentName}>{student.fullName}</Text>
                  <Text style={styles.studentId}>ID: {student.studentNo}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={moderateScale(18)}
                  color={colors.iconMutedSoft}
                />
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyRoster}>
              <Ionicons
                name="people-outline"
                size={moderateScale(21)}
                color={colors.muted}
              />
              <View style={styles.emptyRosterCopy}>
                <Text style={styles.emptyRosterTitle}>No students yet</Text>
                <Text style={styles.emptyRosterText}>
                  Add or import students to this section.
                </Text>
              </View>
            </View>
          )}
        </View>
      </CollapsibleRoster>
    </View>
  );
};

const SectionBadge = ({ group }: { group: StudentGroup }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>
      {group.gradeLevel === 0
        ? "K"
        : `${group.gradeLevel}${group.section.slice(0, 1).toUpperCase()}`}
    </Text>
  </View>
);

const CollapsibleRoster = ({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) => {
  const [measured, setMeasured] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const contentHeight = useRef(0);
  const animateTo = useCallback(
    (height: number) => {
      animatedHeight.stopAnimation();
      Animated.timing(animatedHeight, {
        toValue: height,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [animatedHeight],
  );

  useEffect(() => {
    if (expanded && contentHeight.current <= 0) return;
    animateTo(expanded ? contentHeight.current : 0);
  }, [animateTo, expanded]);
  useEffect(() => () => animatedHeight.stopAnimation(), [animatedHeight]);

  const measure = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      if (
        !Number.isFinite(height) ||
        height <= 0 ||
        Math.abs(contentHeight.current - height) < 0.5
      )
        return;
      contentHeight.current = height;
      setMeasured(true);
      if (expanded) animatedHeight.setValue(height);
    },
    [animatedHeight, expanded],
  );

  return (
    <Animated.View
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
      pointerEvents={expanded ? "auto" : "none"}
      style={[
        styles.collapsibleClip,
        (measured || !expanded) && { height: animatedHeight },
      ]}
    >
      <View
        onLayout={measure}
        style={[
          styles.collapsibleMeasure,
          (measured || !expanded) && styles.collapsibleMeasureClipped,
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.large,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    paddingVertical: spacing(1),
  },
  header: {
    minHeight: moderateScale(66),
    paddingHorizontal: spacing(1.75),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.125),
  },
  badge: {
    width: moderateScale(46),
    height: moderateScale(46),
    borderRadius: borderRadius.large,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.purpleSoft,
  },
  badgeText: {
    color: colors.purple,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.bold,
  },
  copy: {
    flex: 1,
    minWidth: moderateScale(0),
  },
  name: {
    color: colors.text,
    fontSize: typography.fontSize.medium,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  infoRow: {
    alignItems: "flex-start",
    gap: spacing(0.5),
    marginTop: spacing(0.375),
  },
  meta: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.regular,
  },
  advisoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.375),
    paddingHorizontal: spacing(0.75),
    height: moderateScale(20),
    borderRadius: borderRadius.medium,
    backgroundColor: colors.neutralSoft,
  },
  advisoryText: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  profileButton: {
    height: moderateScale(30),
    paddingHorizontal: spacing(1.125),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: moderateScale(1),
    borderColor: colors.primaryBorder,
    borderRadius: borderRadius.medium,
  },
  profileButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  students: {
    paddingHorizontal: spacing(1.75),
  },
  studentRow: {
    minHeight: moderateScale(69),
    flexDirection: "row",
    alignItems: "center",
  },
  studentDivider: {
    borderTopWidth: moderateScale(1),
    borderTopColor: colors.border,
  },
  studentCopy: {
    flex: 1,
    marginLeft: spacing(1.5),
  },
  studentName: {
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.bold,
  },
  studentId: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    marginTop: spacing(0.5),
    fontFamily: typography.fontFamily.regular,
  },
  emptyRoster: {
    marginVertical: spacing(2),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1),
  },
  emptyRosterCopy: {
    alignItems: "flex-start",
  },
  emptyRosterTitle: {
    color: colors.text,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  emptyRosterText: {
    color: colors.muted,
    fontSize: typography.fontSize.extraSmall,
    marginTop: spacing(0.25),
    fontFamily: typography.fontFamily.regular,
  },
  collapsibleClip: {
    width: "100%",
    overflow: "hidden",
  },
  collapsibleMeasure: {
    width: "100%",
  },
  collapsibleMeasureClipped: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
