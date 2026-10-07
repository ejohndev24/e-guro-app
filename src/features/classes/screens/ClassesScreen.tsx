import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, ErrorState, LoadingState } from '@/shared/components/ui';
import { CLASSES_QUERY } from '../graphql/queries/getClasses';
import { colors } from '@/core/theme';
import { Classroom, EducationLevel, StudentGroup } from '@/core/types';
import { CREATE_CLASS_MUTATION } from '../graphql/mutations/createClass';

const ClassesScreen = () => {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refetch } = useQuery<{ classes: Classroom[] }>(CLASSES_QUERY);
  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <View style={styles.titleBar}><View><Text style={styles.eyebrow}>TEACHING</Text><Text style={styles.title}>My Classes</Text></View></View>
    {loading && !data ? <LoadingState /> : error && !data ? <ErrorState message={error.message} retry={refetch} /> :
      <FlatList data={data?.classes} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list} onRefresh={refetch} refreshing={loading}
        ListEmptyComponent={<EmptyState title="No classes yet" detail="Open Sections, select a section, then add its first subject class." />}
        renderItem={({ item }) => <ClassCard item={item} />} />}
  </View>;
}

const ClassCard = ({ item }: { item: Classroom }) => {
  return <Pressable onPress={() => router.push(`/class/${item.id}`)}>
    <Card style={styles.card}>
      <View style={styles.cardTop}><View style={styles.book}><Ionicons name="book" size={21} color={colors.purple} /></View><View style={styles.copy}><View style={styles.subjectRow}><Text numberOfLines={1} style={styles.subject}>{item.subject}</Text></View><View style={styles.sectionRow}><Text numberOfLines={1} style={styles.grade}>{item.gradeLevel === 0 ? 'Kindergarten' : `Grade/Year ${item.gradeLevel}`} · {item.section}</Text>{item.isAdvisory && <View style={styles.advisoryBadge}><Ionicons name="school-outline" size={10} color={colors.muted} /><Text style={styles.advisoryBadgeText}>Advisory</Text></View>}</View></View><Ionicons name="chevron-forward" size={20} color="#AAB3C1" /></View>
      <View style={styles.divider} />
      <View style={styles.info}><Info icon="calendar-outline" text={item.scheduleDay} /><Info icon="time-outline" text={`${formatTime(item.startTime)}–${formatTime(item.endTime)}`} /><Info icon="location-outline" text={item.room} /><Info icon="people-outline" text={`${item.studentCount} students`} /></View>
      <View style={styles.buttons}><Pressable onPress={() => router.push(`/class/${item.id}`)} style={styles.secondary}><Ionicons name="checkbox-outline" size={17} color={colors.primary} /><Text style={styles.secondaryText}>Attendance</Text></Pressable><Pressable onPress={() => router.push(`/grades/${item.id}`)} style={styles.primary}><Ionicons name="create-outline" size={17} color="#fff" /><Text style={styles.primaryText}>Grades</Text></Pressable></View>
    </Card>
  </Pressable>;
}

export const CreateClassModal = ({ visible, group, close, completed }: { visible: boolean; group?: StudentGroup; close: () => void; completed: () => Promise<void> }) => {
  const now = new Date();
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const [values, setValues] = useState({ subject: '', gradeLevel: group ? String(group.gradeLevel) : '', section: group?.section ?? '', room: '', startTime: '08:00', endTime: '09:00', schoolYear: group?.schoolYear ?? `${start}-${start + 1}`, term: group?.term ?? 'Full Year', educationLevel: group?.educationLevel ?? 'ELEMENTARY' as EducationLevel, isAdvisory: group?.isAdvisory ?? false });
  const [scheduleDays, setScheduleDays] = useState(['Monday']);
  const [picker, setPicker] = useState<'startTime' | 'endTime' | 'schoolYear' | 'term' | 'educationLevel'>();
  const [create, state] = useMutation(CREATE_CLASS_MUTATION);
  const save = async () => {
    try {
      await create({ variables: { input: { ...values, groupId: group?.id, scheduleDay: scheduleDays.join(','), gradeLevel: Number(values.gradeLevel) } } });
      await completed();
    } catch (error) { Alert.alert('Class not created', error instanceof Error ? error.message : 'Try again.'); }
  }
  const field = (key: 'subject' | 'gradeLevel' | 'section' | 'room', placeholder: string, keyboardType?: 'numeric') => <TextInput value={values[key]} onChangeText={(value) => setValues({ ...values, [key]: value })} placeholder={placeholder} placeholderTextColor="#98A2B3" keyboardType={keyboardType} style={styles.modalInput} />;
  const toggleDay = (day: string) => setScheduleDays(scheduleDays.includes(day) ? scheduleDays.filter((value) => value !== day) : [...scheduleDays, day]);
  const disabled = state.loading || !values.subject.trim() || !values.gradeLevel || !values.section.trim() || !values.room.trim() || !scheduleDays.length;
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={close}><View style={styles.backdrop}><View style={styles.modalCard}><View style={styles.modalHead}><View><Text style={styles.modalTitle}>Add class</Text><Text style={styles.modalHelp}>{group ? `${group.displayName} · ${group.studentCount} students will be assigned automatically.` : 'You can add students after creating it.'}</Text></View><Pressable onPress={close}><Ionicons name="close" size={25} color={colors.text} /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <Text style={styles.label}>Subject</Text>{field('subject', 'Mathematics')}
    {!group && <><View style={styles.two}><View style={styles.half}><Text style={styles.label}>Grade/year</Text>{field('gradeLevel', '6', 'numeric')}</View><View style={styles.half}><Text style={styles.label}>Section</Text>{field('section', 'Rizal')}</View></View><PickerField label="Education level" value={educationLevelLabel(values.educationLevel)} onPress={() => setPicker('educationLevel')} /></>}
    <Text style={styles.label}>Room or location</Text>{field('room', 'Room 204')}
    <Text style={styles.label}>Schedule days</Text><View style={styles.dayGrid}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => <Pressable key={day} onPress={() => toggleDay(day)} style={[styles.dayChip, scheduleDays.includes(day) && styles.dayChipSelected]}><Text style={[styles.dayText, scheduleDays.includes(day) && styles.dayTextSelected]}>{day.slice(0, 3)}</Text></Pressable>)}</View>
    <View style={styles.two}><PickerField label="Starts" value={formatTime(values.startTime)} onPress={() => setPicker('startTime')} /><PickerField label="Ends" value={formatTime(values.endTime)} onPress={() => setPicker('endTime')} /></View>
    {!group && <><View style={styles.two}><PickerField label="School year" value={values.schoolYear} onPress={() => setPicker('schoolYear')} /><PickerField label="Term" value={values.term} onPress={() => setPicker('term')} /></View>{['KINDERGARTEN', 'ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH'].includes(values.educationLevel) && <Pressable onPress={() => setValues({ ...values, isAdvisory: !values.isAdvisory })} style={classFormStyles.advisoryToggle}><Ionicons name={values.isAdvisory ? 'checkbox' : 'square-outline'} size={21} color={values.isAdvisory ? colors.primary : colors.muted} /><View style={{ flex: 1 }}><Text style={classFormStyles.advisoryTitle}>I am the section adviser</Text><Text style={classFormStyles.advisoryHelp}>Enables daily attendance and section reports.</Text></View></Pressable>}</>}
    <Pressable disabled={disabled} onPress={save} style={[styles.save, disabled && { opacity: .5 }]}><Text style={styles.primaryText}>{state.loading ? 'Creating…' : 'Create class'}</Text></Pressable>
  </ScrollView><OptionPicker visible={Boolean(picker)} title={picker === 'startTime' ? 'Select start time' : picker === 'endTime' ? 'Select end time' : picker === 'schoolYear' ? 'Select school year' : picker === 'educationLevel' ? 'Select education level' : 'Select term'} selected={picker ? values[picker] : undefined} options={picker === 'startTime' || picker === 'endTime' ? timeOptions : picker === 'schoolYear' ? Array.from({ length: 7 }, (_, index) => `${start - 2 + index}-${start - 1 + index}`) : picker === 'educationLevel' ? ['KINDERGARTEN', 'ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE', 'CUSTOM'] : ['Full Year', '1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter', '1st Semester', '2nd Semester', '1st Trimester', '2nd Trimester', '3rd Trimester', 'Summer']} format={picker === 'startTime' || picker === 'endTime' ? formatTime : picker === 'educationLevel' ? educationLevelLabel : undefined} close={() => setPicker(undefined)} select={(value) => { if (picker === 'educationLevel') setValues({ ...values, educationLevel: value as EducationLevel, isAdvisory: ['COLLEGE', 'CUSTOM'].includes(value) ? false : values.isAdvisory }); else if (picker) setValues({ ...values, [picker]: value }); setPicker(undefined); }} /></View></View></Modal>;
}

const classFormStyles = StyleSheet.create({
  advisoryToggle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: colors.primarySoft },
  advisoryTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  advisoryHelp: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
});

const timeOptions = Array.from({ length: 38 }, (_, index) => {
  const minutes = (index + 10) * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

const PickerField = ({ label, value, onPress }: { label: string; value: string; onPress: () => void }) => {
  return <View style={styles.half}><Text style={styles.label}>{label}</Text><Pressable onPress={onPress} style={styles.pickerField}><Text style={styles.pickerValue}>{value}</Text><Ionicons name="chevron-down" size={17} color={colors.muted} /></Pressable></View>;
}

const OptionPicker = ({ visible, title, selected, options, format, close, select }: { visible: boolean; title: string; selected?: string; options: string[]; format?: (value: string) => string; close: () => void; select: (value: string) => void }) => {
  const helper = title.includes('time') ? 'Tap a time to use it for this class.' : 'Choose one option for this class.';
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><View style={styles.optionBackdrop}><View style={styles.optionCard}><View style={styles.modalHead}><View style={{ flex: 1 }}><Text style={styles.modalTitle}>{title}</Text><Text style={styles.optionHelp}>{helper}</Text></View><Pressable onPress={close}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>{options.map((option) => { const active = option === selected; return <Pressable key={option} onPress={() => select(option)} style={[styles.option, active && styles.optionActive]}><Text style={[styles.optionText, active && styles.optionTextActive]}>{format ? format(option) : option}</Text><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={active ? colors.primary : '#AAB5C4'} /></Pressable>; })}</ScrollView></View></View></Modal>;
}

const Info = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => <View style={styles.infoItem}><Ionicons name={icon} size={15} color={colors.muted} /><Text style={styles.infoText}>{text}</Text></View>;
const formatTime = (time: string) => { const [h, m] = time.split(':'); const hour = Number(h); return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`; };
const educationLevelLabel = (value: string) => ({ KINDERGARTEN: 'Kindergarten', ELEMENTARY: 'Elementary', JUNIOR_HIGH: 'Junior high school', SENIOR_HIGH: 'Senior high school', COLLEGE: 'College', CUSTOM: 'Custom' }[value] ?? value);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  titleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' },
  title: { fontSize: 27, fontWeight: '800', color: colors.text, marginTop: 2 },
  scan: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },
  card: { padding: 12 },
  cardTop: { minHeight: 46, flexDirection: 'row', alignItems: 'center' },
  book: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, marginLeft: 10 },
  subjectRow: { position: 'relative', minHeight: 20 },
  subject: { fontSize: 13, color: colors.text, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  advisoryBadge: { height: 20, paddingHorizontal: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F2F4F7' },
  advisoryBadgeText: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  grade: { flexShrink: 1, color: colors.muted, fontSize: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 11 },
  info: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 10, color: colors.muted },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  secondary: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#BBD2F8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 11 },
  primary: { flex: 1, height: 38, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  backdrop: { flex: 1, backgroundColor: '#0B193099', justifyContent: 'flex-end' }, modalCard: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }, modalTitle: { color: colors.text, fontSize: 21, fontWeight: '800' }, modalHelp: { color: colors.muted, fontSize: 12, marginTop: 4 }, label: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 13, marginBottom: 6 }, modalInput: { height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, color: colors.text, backgroundColor: '#fff' }, two: { flexDirection: 'row', gap: 10 }, half: { flex: 1 }, save: { height: 49, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 21 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, dayChip: { minWidth: 42, height: 37, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, dayText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, dayTextSelected: { color: '#fff' }, pickerField: { height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pickerValue: { color: colors.text, fontSize: 12, fontWeight: '600' }, optionBackdrop: { flex: 1, backgroundColor: '#0B193099', justifyContent: 'flex-end' }, optionCard: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }, optionHelp: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, option: { minHeight: 52, paddingHorizontal: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, optionActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, optionText: { color: colors.text, fontSize: 14, fontWeight: '700' }, optionTextActive: { color: colors.primary },
});

export default ClassesScreen;
