import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { colors } from '../theme';

import HomeScreen from '../screens/coach/HomeScreen';
import PlayersScreen from '../screens/coach/PlayersScreen';
import TeamScreen from '../screens/coach/TeamScreen';
import MessagesScreen from '../screens/coach/MessagesScreen';
import FilmRoomScreen from '../screens/coach/FilmRoomScreen';
import ProfileScreen from '../screens/coach/ProfileScreen';
import ScheduleScreen from '../screens/coach/ScheduleScreen';
import NotificationsScreen from '../screens/coach/NotificationsScreen';
import DirectMessagesScreen from '../screens/coach/DirectMessagesScreen';
import PlaybookScreen from '../screens/coach/PlaybookScreen';
import PracticePlansScreen from '../screens/coach/PracticePlansScreen';
import DepthChartScreen from '../screens/coach/DepthChartScreen';
import AIWorkoutScreen from '../screens/coach/AIWorkoutScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CoachTabsInner() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⊞</Text> }} />
      <Tab.Screen name="Team" component={TeamScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👥</Text> }} />
      <Tab.Screen name="Film" component={FilmRoomScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎬</Text> }} />
      <Tab.Screen name="Players" component={PlayersScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏃</Text> }} />
      <Tab.Screen name="Chat" component={MessagesScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💬</Text> }} />
    </Tab.Navigator>
  );
}

export default function CoachTabs() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }}>
      <Stack.Screen name="CoachMain" component={CoachTabsInner} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="DirectMessages" component={DirectMessagesScreen} options={{ title: 'Direct Messages' }} />
      <Stack.Screen name="Playbook" component={PlaybookScreen} />
      <Stack.Screen name="PracticePlans" component={PracticePlansScreen} options={{ title: 'Practice Plans' }} />
      <Stack.Screen name="DepthChart" component={DepthChartScreen} options={{ title: 'Depth Chart' }} />
      <Stack.Screen name="AIWorkout" component={AIWorkoutScreen} options={{ title: 'AI Workout' }} />
    </Stack.Navigator>
  );
}
