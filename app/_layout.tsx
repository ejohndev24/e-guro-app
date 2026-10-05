import { ApolloProvider, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from '@/core/apollo/client';
import { colors } from '@/core/theme';
import { AuthProvider, useAuth } from '@/core/auth/AuthProvider';
import { MOBILE_ME_QUERY } from '@/features/auth/graphql/queries';

const RootLayout = () => {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider><SafeAreaProvider><Navigation /></SafeAreaProvider></AuthProvider>
    </ApolloProvider>
  );
}

const Navigation = () => {
  const { token, loading, signOut } = useAuth();
  const segments = useSegments();
  const session = useQuery<{ me: { id: string; role: string } }>(MOBILE_ME_QUERY, { skip: !token, fetchPolicy: 'network-only' });
  const checkingSession = Boolean(token && session.loading);
  const invalidRole = Boolean(token && session.data && session.data.me.role !== 'TEACHER');
  const invalidSession = Boolean(token && session.error?.graphQLErrors.length);
  useEffect(() => {
    if (token && !session.loading && (invalidRole || invalidSession)) void signOut();
  }, [token, session.loading, invalidRole, invalidSession, signOut]);
  useEffect(() => {
    if (loading || checkingSession || invalidRole || invalidSession) return;
    const onLogin = segments[0] === 'login';
    if (!token && !onLogin) router.replace('/login');
    if (token && onLogin) router.replace('/');
  }, [token, loading, checkingSession, invalidRole, invalidSession, segments]);
  return <><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="class/[id]" />
          <Stack.Screen name="grades/[id]" />
          <Stack.Screen name="student/[id]" />
        </Stack></>;
}

export default RootLayout;
