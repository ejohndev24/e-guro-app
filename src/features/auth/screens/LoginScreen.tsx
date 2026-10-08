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
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { moderateScale } from "react-native-size-matters";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/core/auth/AuthProvider";
import {
  CHANGE_PASSWORD_MUTATION,
  LOGIN_MUTATION,
  REGISTER_TEACHER_MUTATION,
} from "@/features/auth/graphql/mutations/authMutations";
import { theme } from "@/core/theme";
const { spacing, typography, colors, borderRadius } = theme;
const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pendingToken, setPendingToken] = useState<string>();
  const [login, loginState] = useMutation(LOGIN_MUTATION);
  const [register, registerState] = useMutation(REGISTER_TEACHER_MUTATION);
  const [change, changeState] = useMutation(CHANGE_PASSWORD_MUTATION);
  const submitLogin = async () => {
    try {
      const result = await login({
        variables: {
          email,
          password,
        },
      });
      const payload = result.data?.login;
      if (!payload) return;
      if (payload.user.role !== "TEACHER") {
        Alert.alert(
          "Use the admin portal",
          "School administrators use the E-Guro Portal. The mobile app is for teachers.",
        );
        return;
      }
      if (payload.user.mustChangePassword) {
        await SecureStore.setItemAsync(
          "teacher-hub-token",
          payload.accessToken,
        );
        setPendingToken(payload.accessToken);
      } else await signIn(payload.accessToken);
    } catch {}
  };
  const submitRegister = async () => {
    if (name.trim().length < 2)
      return Alert.alert("Enter your name", "Please enter your full name.");
    if (password.length < 10)
      return Alert.alert(
        "Use a stronger password",
        "Your password must contain at least 10 characters.",
      );
    if (password !== confirmPassword)
      return Alert.alert(
        "Passwords do not match",
        "Enter the same password in both fields.",
      );
    try {
      const result = await register({
        variables: {
          input: {
            name,
            email,
            password,
          },
        },
      });
      const token = result.data?.registerTeacher.accessToken;
      if (token) await signIn(token);
    } catch {}
  };
  const submitChange = async () => {
    if (!pendingToken) return;
    try {
      await change({
        variables: {
          currentPassword: password,
          newPassword,
        },
      });
      await signIn(pendingToken);
    } catch {}
  };
  const changing = Boolean(pendingToken);
  const busy = registering ? registerState.loading : loginState.loading;
  const error = (registering ? registerState.error : loginState.error)?.message;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing(2.25),
            paddingBottom: insets.bottom + spacing(2.25),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Image
              source={require("@assets/images/e-guro-icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appTitle}>E-Guro</Text>
          <Text style={styles.tagline}>
            {changing
              ? "Secure your new account"
              : "Your classroom, organized."}
          </Text>
        </View>
        <View style={styles.card}>
          {!changing && (
            <View style={styles.switcher}>
              <Pressable
                onPress={() => setRegistering(false)}
                style={[styles.switch, !registering && styles.switchActive]}
              >
                <Text
                  style={[
                    styles.switchText,
                    !registering && styles.switchTextActive,
                  ]}
                >
                  Sign in
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRegistering(true)}
                style={[styles.switch, registering && styles.switchActive]}
              >
                <Text
                  style={[
                    styles.switchText,
                    registering && styles.switchTextActive,
                  ]}
                >
                  Create account
                </Text>
              </Pressable>
            </View>
          )}
          <Text style={styles.eyebrow}>
            {changing
              ? "FIRST SIGN-IN"
              : registering
                ? "INDEPENDENT TEACHER"
                : "TEACHER SIGN-IN"}
          </Text>
          <Text style={styles.title}>
            {changing
              ? "Choose a new password"
              : registering
                ? "Start teaching"
                : "Welcome back"}
          </Text>
          <Text style={styles.help}>
            {changing
              ? "Replace the temporary password sent to your email."
              : registering
                ? "Create classes and manage students without waiting for a school invitation."
                : "Use your teacher email and password to continue."}
          </Text>
          {!changing ? (
            <>
              {registering && (
                <Field
                  icon="person-outline"
                  placeholder="Full name"
                  value={name}
                  setValue={setName}
                />
              )}
              <Field
                icon="mail-outline"
                placeholder="Email address"
                value={email}
                setValue={setEmail}
              />
              <Field
                icon="lock-closed-outline"
                placeholder="Password (10+ characters)"
                value={password}
                setValue={setPassword}
                secure
              />
              {registering && (
                <Field
                  icon="checkmark-circle-outline"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  setValue={setConfirmPassword}
                  secure
                />
              )}
              <ErrorText error={error} />
              <Pressable
                disabled={busy}
                onPress={registering ? submitRegister : submitLogin}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {registering
                    ? busy
                      ? "Creating account…"
                      : "Create account"
                    : busy
                      ? "Signing in…"
                      : "Sign in"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Field
                icon="shield-checkmark-outline"
                placeholder="New password (10+ characters)"
                value={newPassword}
                setValue={setNewPassword}
                secure
              />
              <ErrorText error={changeState.error?.message} />
              <Pressable
                disabled={changeState.loading || newPassword.length < 10}
                onPress={submitChange}
                style={[
                  styles.button,
                  newPassword.length < 10 && {
                    opacity: 0.5,
                  },
                ]}
              >
                <Text style={styles.buttonText}>
                  {changeState.loading
                    ? "Updating…"
                    : "Set password and continue"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
        <Text style={styles.footer}>
          {registering
            ? "No school code or administrator required."
            : "School teachers can use credentials sent by their administrator."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
const Field = ({
  icon,
  placeholder,
  value,
  setValue,
  secure,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  setValue: (v: string) => void;
  secure?: boolean;
}) => {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={moderateScale(19)} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secure}
        style={styles.input}
      />
    </View>
  );
};
const ErrorText = ({ error }: { error?: string }) =>
  error ? <Text style={styles.error}>{error}</Text> : null;
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing(2.5),
  },
  appTitle: {
    color: colors.surface,
    fontSize: typography.fontSize.extraLarge,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing(2.5),
  },
  logo: {
    width: moderateScale(100),
    height: moderateScale(100),
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  brand: {
    fontFamily: typography.fontFamily.bold,
    color: colors.surface,
    fontSize: typography.fontSize.extraLarge,
    lineHeight: typography.lineHeight.extraLarge,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing(1.25),
  },
  tagline: {
    fontFamily: typography.fontFamily.regular,
    color: colors.brandTextSoft,
    fontSize: typography.fontSize.medium,
    lineHeight: typography.lineHeight.medium,
    marginTop: spacing(0.5),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    padding: spacing(2.75),
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: borderRadius.medium,
    padding: spacing(0.375),
    marginBottom: spacing(2.25),
  },
  switch: {
    flex: 1,
    height: moderateScale(36),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.medium,
  },
  switchActive: {
    backgroundColor: colors.surface,
  },
  switchText: {
    color: colors.muted,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  switchTextActive: {
    color: colors.primary,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.fontSize.extraSmall,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.5,
    fontFamily: typography.fontFamily.bold,
  },
  title: {
    color: colors.text,
    fontSize: typography.fontSize.extraLarge,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  help: {
    color: colors.muted,
    lineHeight: typography.lineHeight.medium,
    fontSize: typography.fontSize.small,
    marginBottom: spacing(0.5),
    fontFamily: typography.fontFamily.regular,
  },
  field: {
    height: moderateScale(48),
    marginTop: spacing(1.25),
    borderRadius: borderRadius.large,
    borderWidth: moderateScale(1),
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(1.625),
  },
  input: {
    flex: 1,
    color: colors.text,
    marginLeft: spacing(1.125),
  },
  button: {
    height: moderateScale(50),
    borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing(2.125),
  },
  buttonText: {
    color: colors.surface,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSize.small,
    marginTop: spacing(1.25),
    fontFamily: typography.fontFamily.regular,
  },
  footer: {
    color: colors.brandTextMuted,
    fontSize: typography.fontSize.small,
    textAlign: "center",
    marginTop: spacing(2),
    fontFamily: typography.fontFamily.regular,
  },
});
export default LoginScreen;
