import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, ErrorState, LoadingState } from '@/shared/components/ui';
import { CLASSES_QUERY } from '../graphql/queries/getClasses';
import { colors } from '@/core/theme';
import { Classroom } from '@/core/types';
import { MOBILE_ME_QUERY } from '@/features/auth/graphql/queries';
import { CREATE_CLASS_MUTATION } from '../graphql/mutations/createClass';

const ClassesScreen = () => {
  const insets = useSafeAreaInsets();
  const [creating, setCreating] = useState(false);
  const { data, loading, error, refetch } = useQuery<{ classes: Classroom[] }>(CLASSES_QUERY);
  const { data: account } = useQuery<{ me: { isIndependent: boolean } }>(MOBILE_ME_QUERY);
  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <View style={styles.titleBar}><View><Text style={styles.eyebrow}>TEACHING</Text><Text style={styles.title}>My Classes</Text></View>{account?.me.isIndependent && <Pressable onPress={() => setCreating(true)} style={styles.scan}><Ionicons name="add" size={23} color="#fff" /></Pressable>}</View>
    {loading && !data ? <LoadingState /> : error && !data ? <ErrorState message={error.message} retry={refetch} /> :
      <FlatList data={data?.classes} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} onRefresh={refetch} refreshing={loading}
        ListEmptyComponent={<EmptyState title="No classes assigned" detail="Your school administrator can create a class in E-Guro Portal and assign it to you." />}
        renderItem={({ item }) => <ClassCard item={item} />} />}
    <CreateClassModal visible={creating} close={() => setCreating(false)} completed={async () => { setCreating(false); await refetch(); }} />
  </View>;
}

const ClassCard = ({ item }: { item: Classroom }) => {
  return <Pressable onPress={() => router.push(`/class/${item.id}`)}>
    <Card style={styles.card}>
      <View style={styles.cardTop}><View style={styles.book}><Ionicons name="book" size={24} color={colors.primary} /></View><View style={styles.copy}><Text style={styles.subject}>{item.subject}</Text><Text style={styles.grade}>{item.gradeLevel === 0 ? 'Kindergarten' : `Grade/Year ${item.gradeLevel}`} · {item.section}</Text></View><Ionicons name="chevron-forward" size={20} color="#AAB3C1" /></View>
      <View style={styles.divider} />
      <View style={styles.info}><Info icon="calendar-outline" text={item.scheduleDay} /><Info icon="time-outline" text={`${formatTime(item.startTime)}–${formatTime(item.endTime)}`} /><Info icon="location-outline" text={item.room} /><Info icon="people-outline" text={`${item.studentCount} students`} /></View>
      <View style={styles.buttons}><Pressable onPress={() => router.push(`/class/${item.id}`)} style={styles.secondary}><Ionicons name="checkbox-outline" size={17} color={colors.primary} /><Text style={styles.secondaryText}>Attendance</Text></Pressable><Pressable onPress={() => router.push(`/grades/${item.id}`)} style={styles.primary}><Ionicons name="create-outline" size={17} color="#fff" /><Text style={styles.primaryText}>Grades</Text></Pressable></View>
    </Card>
  </Pressable>;
}

const CreateClassModal = ({ visible, close, completed }: { visible: boolean; close: () => void; completed: () => Promise<void> }) => {
  const now = new Date();
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const [values, setValues] = useState({ subject: '', gradeLevel: '', section: '', room: '', startTime: '08:00', endTime: '09:00', schoolYear: `${start}-${start + 1}`, term: 'Full Year' });
  const [scheduleDays, setScheduleDays] = useState(['Monday']);
  const [picker, setPicker] = useState<'startTime' | 'endTime' | 'schoolYear' | 'term'>();
  const [create, state] = useMutation(CREATE_CLASS_MUTATION);
  const save = async () => {
    try {
      await create({ variables: { input: { ...values, scheduleDay: scheduleDays.join(','), gradeLevel: Number(values.gradeLevel) } } });
      await completed();
    } catch (error) { Alert.alert('Class not created', error instanceof Error ? error.message : 'Try again.'); }
  }
  const field = (key: 'subject' | 'gradeLevel' | 'section' | 'room', placeholder: string, keyboardType?: 'numeric') => <TextInput value={values[key]} onChangeText={(value) => setValues({ ...values, [key]: value })} placeholder={placeholder} placeholderTextColor="#98A2B3" keyboardType={keyboardType} style={styles.modalInput} />;
  const toggleDay = (day: string) => setScheduleDays(scheduleDays.includes(day) ? scheduleDays.filter((value) => value !== day) : [...scheduleDays, day]);
  const disabled = state.loading || !values.subject.trim() || !values.gradeLevel || !values.section.trim() || !values.room.trim() || !scheduleDays.length;
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={close}><View style={styles.backdrop}><View style={styles.modalCard}><View style={styles.modalHead}><View><Text style={styles.modalTitle}>Create class</Text><Text style={styles.modalHelp}>You can add students after creating it.</Text></View><Pressable onPress={close}><Ionicons name="close" size={25} color={colors.text} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">
    <Text style={styles.label}>Subject</Text>{field('subject', 'Mathematics')}
    <View style={styles.two}><View style={styles.half}><Text style={styles.label}>Grade/year</Text>{field('gradeLevel', '6', 'numeric')}</View><View style={styles.half}><Text style={styles.label}>Section</Text>{field('section', 'Rizal')}</View></View>
    <Text style={styles.label}>Room or location</Text>{field('room', 'Room 204')}
    <Text style={styles.label}>Schedule days</Text><View style={styles.dayGrid}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => <Pressable key={day} onPress={() => toggleDay(day)} style={[styles.dayChip, scheduleDays.includes(day) && styles.dayChipSelected]}><Text style={[styles.dayText, scheduleDays.includes(day) && styles.dayTextSelected]}>{day.slice(0, 3)}</Text></Pressable>)}</View>
    <View style={styles.two}><PickerField label="Starts" value={formatTime(values.startTime)} onPress={() => setPicker('startTime')} /><PickerField label="Ends" value={formatTime(values.endTime)} onPress={() => setPicker('endTime')} /></View>
    <View style={styles.two}><PickerField label="School year" value={values.schoolYear} onPress={() => setPicker('schoolYear')} /><PickerField label="Term" value={values.term} onPress={() => setPicker('term')} /></View>
    <Pressable disabled={disabled} onPress={save} style={[styles.save, disabled && { opacity: .5 }]}><Text style={styles.primaryText}>{state.loading ? 'Creating…' : 'Create class'}</Text></Pressable>
  </ScrollView><OptionPicker visible={Boolean(picker)} title={picker === 'startTime' ? 'Select start time' : picker === 'endTime' ? 'Select end time' : picker === 'schoolYear' ? 'Select school year' : 'Select term'} options={picker === 'startTime' || picker === 'endTime' ? timeOptions : picker === 'schoolYear' ? Array.from({ length: 7 }, (_, index) => `${start - 2 + index}-${start - 1 + index}`) : ['Full Year', '1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter', '1st Semester', '2nd Semester', '1st Trimester', '2nd Trimester', '3rd Trimester', 'Summer']} format={picker === 'startTime' || picker === 'endTime' ? formatTime : undefined} close={() => setPicker(undefined)} select={(value) => { if (picker) setValues({ ...values, [picker]: value }); setPicker(undefined); }} /></View></View></Modal>;
}

const timeOptions = Array.from({ length: 38 }, (_, index) => {
  const minutes = (index + 10) * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

const PickerField = ({ label, value, onPress }: { label: string; value: string; onPress: () => void }) => {
  return <View style={styles.half}><Text style={styles.label}>{label}</Text><Pressable onPress={onPress} style={styles.pickerField}><Text style={styles.pickerValue}>{value}</Text><Ionicons name="chevron-down" size={17} color={colors.muted} /></Pressable></View>;
}

const OptionPicker = ({ visible, title, options, format, close, select }: { visible: boolean; title: string; options: string[]; format?: (value: string) => string; close: () => void; select: (value: string) => void }) => {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}><View style={styles.optionBackdrop}><View style={styles.optionCard}><View style={styles.modalHead}><Text style={styles.modalTitle}>{title}</Text><Pressable onPress={close}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View><ScrollView>{options.map((option) => <Pressable key={option} onPress={() => select(option)} style={styles.option}><Text style={styles.optionText}>{format ? format(option) : option}</Text></Pressable>)}</ScrollView></View></View></Modal>;
}

const Info = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => <View style={styles.infoItem}><Ionicons name={icon} size={15} color={colors.muted} /><Text style={styles.infoText}>{text}</Text></View>;
const formatTime = (time: string) => { const [h, m] = time.split(':'); const hour = Number(h); return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`; };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, titleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }, eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' }, title: { fontSize: 27, fontWeight: '800', color: colors.text, marginTop: 2 }, scan: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 16, paddingBottom: 30, gap: 12 }, card: { padding: 16 }, cardTop: { flexDirection: 'row', alignItems: 'center' }, book: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, marginLeft: 13 }, subject: { fontSize: 16, color: colors.text, fontWeight: '800' }, grade: { color: colors.muted, marginTop: 4, fontSize: 12 }, divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 }, info: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, infoItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, infoText: { fontSize: 11, color: colors.muted }, buttons: { flexDirection: 'row', gap: 10, marginTop: 15 }, secondary: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#BBD2F8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 12 }, primary: { flex: 1, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, primaryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: '#0B193099', justifyContent: 'flex-end' }, modalCard: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }, modalTitle: { color: colors.text, fontSize: 21, fontWeight: '800' }, modalHelp: { color: colors.muted, fontSize: 12, marginTop: 4 }, label: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 13, marginBottom: 6 }, modalInput: { height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, color: colors.text, backgroundColor: '#fff' }, two: { flexDirection: 'row', gap: 10 }, half: { flex: 1 }, save: { height: 49, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 21 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, dayChip: { minWidth: 42, height: 37, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, dayText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, dayTextSelected: { color: '#fff' }, pickerField: { height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pickerValue: { color: colors.text, fontSize: 12, fontWeight: '600' }, optionBackdrop: { flex: 1, backgroundColor: '#0B193099', alignItems: 'center', justifyContent: 'center', padding: 28 }, optionCard: { width: '100%', maxHeight: '72%', backgroundColor: colors.surface, borderRadius: 18, padding: 18 }, option: { minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border }, optionText: { color: colors.text, fontSize: 14, fontWeight: '600' },
});

export default ClassesScreen;
