import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from '../theme';

import HomeScreen from '../screens/coach/HomeScreen';
import PlayersScreen from '../screens/coach/PlayersScreen';
import TeamScreen from '../screens/coach/TeamScreen';
import MessagesScreen from '../screens/coach/MessagesScreen';

const Tab = createBottomTabNavigator();

const icons: Record<string, string> = {
  Home: '⊞',
  Players: '🏃',
  Team: '👥',
  Messages: '💬',
};

export default function CoachTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#1a1a2e', borderBottomColor: '#2a2a40' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => (
          <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '700', marginRight: 16, letterSpacing: 0.5 }}>
            COACH
          </Text>
        ),
        tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#2a2a40' },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{icons[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Players" component={PlayersScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
    </Tab.Navigator>
  );
}
