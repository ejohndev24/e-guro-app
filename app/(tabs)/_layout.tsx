import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/core/theme';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  classes: 'book',
  students: 'people',
  reports: 'bar-chart',
};

const TabLayout = () => {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: '#98A2B3',
      tabBarStyle: { height: 74, paddingTop: 7, paddingBottom: 12, borderTopColor: colors.border, backgroundColor: colors.surface },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />,
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="classes" options={{ title: 'Classes' }} />
      <Tabs.Screen name="students" options={{ title: 'Sections' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
    </Tabs>
  );
}

export default TabLayout;
