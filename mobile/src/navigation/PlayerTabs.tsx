import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { colors } from '../theme';

import HomeScreen from '../screens/player/HomeScreen';
import WorkoutsScreen from '../screens/player/WorkoutsScreen';
import FilmRoomScreen from '../screens/player/FilmRoomScreen';
import TeamScreen from '../screens/player/TeamScreen';
import MessagesScreen from '../screens/player/MessagesScreen';
import ProfileScreen from '../screens/player/ProfileScreen';
import NotificationsScreen from '../screens/player/NotificationsScreen';
import ScheduleScreen from '../screens/player/ScheduleScreen';
import DirectMessagesScreen from '../screens/player/DirectMessagesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function PlayerTabsInner() {
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
      <Tab.Screen name="Workouts" component={WorkoutsScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏋️</Text> }} />
      <Tab.Screen name="Film" component={FilmRoomScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎬</Text> }} />
      <Tab.Screen name="Team" component={TeamScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👥</Text> }} />
      <Tab.Screen name="Chat" component={MessagesScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💬</Text> }} />
    </Tab.Navigator>
  );
}

export default function PlayerTabs() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }}>
      <Stack.Screen name="PlayerMain" component={PlayerTabsInner} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="DirectMessages" component={DirectMessagesScreen} options={{ title: 'Direct Messages' }} />
    </Stack.Navigator>
  );
}
