import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from '../theme';

import HomeScreen from '../screens/player/HomeScreen';
import WorkoutsScreen from '../screens/player/WorkoutsScreen';
import TeamScreen from '../screens/player/TeamScreen';
import MessagesScreen from '../screens/player/MessagesScreen';

const Tab = createBottomTabNavigator();

const icons: Record<string, string> = {
  Home: '⊞',
  Workouts: '🏋️',
  Team: '👥',
  Messages: '💬',
};

export default function PlayerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#1a1a2e', borderBottomColor: '#2a2a40' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#2a2a40' },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{icons[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Workouts" component={WorkoutsScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
    </Tab.Navigator>
  );
}
