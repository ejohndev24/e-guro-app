import { useMutation, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportSchool } from '@/core/types';
import { colors } from '@/core/theme';
import { MOBILE_ME_QUERY } from '@/features/auth/graphql/queries';
import { ErrorState, LoadingState, ScreenHeader } from '@/shared/components/ui';
import { MY_SCHOOL_PROFILE_QUERY, UPDATE_MY_SCHOOL_PROFILE_MUTATION } from './graphql';

const fields: Array<{ key: Exclude<keyof ReportSchool, 'name'>; label: string; placeholder: string }> = [
  { key: 'schoolIdNumber', label: 'School ID', placeholder: 'Six-digit school ID' }, { key: 'region', label: 'Region', placeholder: 'Region' },
  { key: 'division', label: 'Division', placeholder: 'Schools Division' }, { key: 'district', label: 'District', placeholder: 'District' },
  { key: 'address', label: 'School address', placeholder: 'Complete school address' }, { key: 'schoolHeadName', label: 'School head', placeholder: 'Full name' },
];

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const profile = useQuery<{ mySchoolProfile: ReportSchool }>(MY_SCHOOL_PROFILE_QUERY);
  const account = useQuery<{ me: { isIndependent: boolean } }>(MOBILE_ME_QUERY);
  const [values, setValues] = useState<Record<string, string>>({});
  const [save, state] = useMutation(UPDATE_MY_SCHOOL_PROFILE_MUTATION);
  useEffect(() => { if (profile.data) setValues(Object.fromEntries(fields.map(({ key }) => [key, profile.data!.mySchoolProfile[key] ?? '']))); }, [profile.data]);
  if (profile.loading && !profile.data) return <View style={[styles.screen, { paddingTop: insets.top }]}><LoadingState /></View>;
  if (profile.error && !profile.data) return <View style={[styles.screen, { paddingTop: insets.top }]}><ErrorState message={profile.error.message} retry={profile.refetch} /></View>;
  const editable = Boolean(account.data?.me.isIndependent);
  const submit = async () => { try { await save({ variables: { input: values } }); Alert.alert('Saved', 'School report details were updated.'); } catch (error) { Alert.alert('Not saved', error instanceof Error ? error.message : 'Try again.'); } };
  return <View style={[styles.screen, { paddingTop: insets.top }]}><ScreenHeader title="School details" subtitle="Used in SF2, SF9 and SF5 CSV exports" onBack={router.back} /><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}><View style={styles.notice}><Text style={styles.noticeTitle}>{profile.data?.mySchoolProfile.name}</Text><Text style={styles.noticeText}>{editable ? 'Complete every field before finalizing school reports.' : 'Your school administrator maintains these details in E-Guro Portal.'}</Text></View>{fields.map(({ key, label, placeholder }) => <View key={key}><Text style={styles.label}>{label}</Text><TextInput editable={editable} value={values[key] ?? ''} onChangeText={(value) => setValues({ ...values, [key]: value })} placeholder={placeholder} placeholderTextColor="#98A2B3" style={[styles.input, !editable && styles.readonly]} /></View>)}{editable && <Pressable disabled={state.loading} onPress={submit} style={styles.save}><Text style={styles.saveText}>{state.loading ? 'Saving…' : 'Save school details'}</Text></Pressable>}</ScrollView></View>;
};

export default SettingsScreen;
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 40 }, notice: { padding: 14, borderRadius: 13, backgroundColor: colors.primarySoft, marginBottom: 8 }, noticeTitle: { color: colors.text, fontWeight: '800', fontSize: 14 }, noticeText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 }, label: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 13, marginBottom: 6 }, input: { height: 47, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.surface }, readonly: { backgroundColor: '#EEF1F6' }, save: { height: 49, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, saveText: { color: '#fff', fontWeight: '800' } });
