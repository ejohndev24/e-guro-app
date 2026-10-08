/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws  and international treaties, and it
 * or any part thereof, may not be copied,  reproduced, utilized, distributed
 * or an adaptation thereof be made,  without the prior authority and consent
 * of PharmaServ Express.  Any unauthorized use of this program will be dealt
 * with and  prosecuted to the maximum extent possible under  the law and may
 * result in civil and criminal liabilities.
 */
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { theme } from "@/core/theme";

const { colors, spacing, typography } = theme;

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  classes: "book",
  students: "people",
  reports: "bar-chart",
};

const TabLayout = () => {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: moderateScale(74),
          paddingTop: spacing(0.875),
          paddingBottom: spacing(1.5),
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: typography.fontSize.small,
          fontFamily: typography.fontFamily.semiBold,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={icons[route.name] ?? "ellipse"}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="classes" options={{ title: "Classes" }} />
      <Tabs.Screen name="students" options={{ title: "Sections" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
    </Tabs>
  );
};

export default TabLayout;
