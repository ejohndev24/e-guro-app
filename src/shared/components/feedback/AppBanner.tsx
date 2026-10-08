/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws and international treaties, and it
 * or any part thereof, may not be copied, reproduced, utilized, distributed
 * or an adaptation thereof be made, without the prior authority and consent
 * of PharmaServ Express. Any unauthorized use of this program will be dealt
 * with and prosecuted to the maximum extent possible under the law and may
 * result in civil and criminal liabilities.
 */
/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws  and international treaties, and it
 * or any part thereof, may not be copied,  reproduced, utilized, distributed
 * or an adaptation thereof be made,  without the prior authority and consent
 * of PharmaServ Express.  Any unauthorized use of this program will be dealt
 * with and  prosecuted to the maximum extent possible under  the law and may
 * result in civil and criminal liabilities.
 */
import FlashMessage, { showMessage } from "react-native-flash-message";
import { StyleSheet } from "react-native";
import { theme } from "@/core/theme";
import { moderateScale } from "react-native-size-matters";
const { spacing, typography, colors, borderRadius } = theme;
export const AppBanner = () => (
  <FlashMessage
    position="bottom"
    floating
    style={styles.banner}
    titleStyle={styles.title}
    textStyle={styles.message}
  />
);
export const showAppBanner = (
  title: string,
  message: string,
  type: "success" | "danger" | "info" = "info",
) =>
  showMessage({
    message: title,
    description: message,
    type,
    duration: 3500,
    icon: type,
  });
const styles = StyleSheet.create({
  banner: {
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },
  title: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.medium,
  },
  message: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.small,
  },
});
