import { useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StudentGroup } from '@/core/types';
import { colors } from '@/core/theme';
import { AppMessageModal, showAppBanner } from '@/shared/components/feedback';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { SET_GROUP_ADVISER_MUTATION } from '../graphql/mutations/setGroupAdviser';

type Props = { group: StudentGroup; refresh: () => Promise<unknown> };

export const GroupAdviserControl = ({ group, refresh }: Props) => {
  const [confirming, setConfirming] = useState(false);
  const [isAdvisory, setIsAdvisory] = useState(group.isAdvisory);
  const [setGroupAdviser, state] = useMutation(SET_GROUP_ADVISER_MUTATION);
  useEffect(() => setIsAdvisory(group.isAdvisory), [group.isAdvisory]);
  if (isAdvisory) return <View style={styles.assigned}><Ionicons name="checkmark-circle" size={17} color={colors.primary} /><Text style={styles.assignedText}>You are the adviser of this section</Text></View>;
  const save = async () => {
    try {
      const result = await setGroupAdviser({ variables: { input: { groupId: group.id, isAdvisory: true } }, errorPolicy: 'none' });
      if (!result.data?.setGroupAdviser.isAdvisory) throw new Error('The server did not confirm adviser status.');
      setConfirming(false);
      setIsAdvisory(true);
      void refresh();
      showAppBanner('Adviser status updated', `${group.displayName} is now your advisory section.`, 'success');
    } catch (error) {
      showAppBanner('Could not update adviser status', getErrorMessage(error), 'danger');
    }
  };
  return <>
    <Pressable disabled={state.loading} onPress={() => setConfirming(true)} style={[styles.button, state.loading && styles.disabled]}><Ionicons name="person-add-outline" size={17} color={colors.primary} /><Text style={styles.text}>Become adviser</Text></Pressable>
    <AppMessageModal visible={confirming} title="Become adviser?" message="Daily attendance and section reports will be enabled for this section." confirmLabel="Become adviser" busy={state.loading} onCancel={() => setConfirming(false)} onConfirm={() => void save()} />
  </>;
};

const styles = StyleSheet.create({
  button: { minHeight: 40, marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BBD2F8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  text: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  assigned: { minHeight: 40, marginTop: 12, borderRadius: 10, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  assignedText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  disabled: { opacity: .55 },
});
