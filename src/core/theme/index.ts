/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
import { moderateScale } from "react-native-size-matters";

/**
 * E-Guro's single light theme. Keep visual decisions here so screens share
 * the same spacing, typography, colours, and elevation.
 */
export const THEME_MODES = { LIGHT: "light" } as const;

export const palette = {
  primary: "#1768E5",
  primaryDark: "#0E4FB7",
  primarySoft: "#EAF2FF",
  background: "#F5F7FB",
  surface: "#FFFFFF",
  text: "#13213C",
  muted: "#748199",
  border: "#E7EBF2",
  success: "#18A768",
  successSoft: "#E6F8EF",
  danger: "#EB5757",
  dangerSoft: "#FDEBEC",
  warning: "#F2A516",
  warningSoft: "#FFF5DC",
  purple: "#7C4DDE",
  purpleSoft: "#F0EAFE",
  placeholder: "#98A2B3",
  primaryBorder: "#BBD2F8",
  neutralSoft: "#F2F4F7",
  neutral: "#EEF1F6",
  neutralStrong: "#E9EDF4",
  neutralAlt: "#E9EEF6",
  scrim: "#0B193099",
  scrimSoft: "#0B193073",
  iconMuted: "#AAB5C4",
  iconMutedSoft: "#ABB5C3",
  iconMutedStrong: "#AAB3C1",
  iconMutedLight: "#B2BBC8",
  brandText: "#DCE9FF",
  brandTextSoft: "#D9E8FF",
  brandTextMuted: "#C9DDFB",
  avatarBlue: "#DDEAFF",
  avatarGreen: "#DFF7E9",
  avatarRed: "#FDE7E7",
  avatarPurple: "#F3E6FF",
} as const;

// Compatibility name used throughout the UI while `palette` remains the
// canonical design-token definition.
export const colors = palette;

export const spacing = (value: number) => moderateScale(value * 8);

export const borderRadius = {
  small: moderateScale(4),
  medium: moderateScale(8),
  large: moderateScale(16),
  full: 9999,
} as const;

const fontSize = {
  extraSmall: moderateScale(10),
  small: moderateScale(12),
  medium: moderateScale(14),
  base: moderateScale(16),
  semiLarge: moderateScale(18),
  large: moderateScale(20),
  extraLarge: moderateScale(24),
  veryLarge: moderateScale(27),
} as const;

const lineHeight = {
  extraSmall: Math.round(fontSize.extraSmall * 1.4),
  small: Math.round(fontSize.small * 1.4),
  medium: Math.round(fontSize.medium * 1.4),
  base: Math.round(fontSize.base * 1.4),
  semiLarge: Math.round(fontSize.semiLarge * 1.4),
  large: Math.round(fontSize.large * 1.25),
  extraLarge: Math.round(fontSize.extraLarge * 1.25),
  veryLarge: Math.round(fontSize.veryLarge * 1.25),
} as const;

export const typography = {
  fontFamily: {
    regular: "Outfit-Regular",
    medium: "Outfit-Medium",
    semiBold: "Outfit-SemiBold",
    bold: "Outfit-Bold",
  },
  fontSize,
  lineHeight,
  fontWeight: {
    regular: "400",
    medium: "500",
    semiBold: "600",
    bold: "700",
  },
} as const;

export const elevation = {
  card: {
    shadowColor: "#243B64",
    shadowOffset: { width: 0, height: moderateScale(5) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(14),
    elevation: 3,
  },
} as const;

export const shadow = elevation.card;

export const theme = {
  mode: THEME_MODES.LIGHT,
  colors: palette,
  spacing,
  borderRadius,
  typography,
  elevation,
} as const;
