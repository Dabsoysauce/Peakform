import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setCredentials } from '../store/slices/authSlice';
import { colors } from '../theme';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PlayerTabs from './PlayerTabs';
import CoachTabs from './CoachTabs';
import LoadingSpinner from '../components/LoadingSpinner';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const { token, role } = useSelector((state: RootState) => state.auth);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedRole = await SecureStore.getItemAsync('role');
      const storedEmail = await SecureStore.getItemAsync('email');
      if (storedToken && storedRole) {
        dispatch(setCredentials({ token: storedToken, role: storedRole, email: storedEmail ?? '' }));
      }
      setBootstrapped(true);
    }
    bootstrap();
  }, []);

  if (!bootstrapped) return <LoadingSpinner />;

  const isLoggedIn = !!token;
  const isPlayer = role === 'athlete';
  const isCoach = role === 'trainer';

  return (
    <NavigationContainer theme={{
      dark: true,
      colors: {
        primary: colors.primary,
        background: colors.bg,
        card: '#1a1a2e',
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
      fonts: {
        regular: { fontFamily: 'System', fontWeight: '400' },
        medium: { fontFamily: 'System', fontWeight: '500' },
        bold: { fontFamily: 'System', fontWeight: '700' },
        heavy: { fontFamily: 'System', fontWeight: '900' },
      },
    }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : isPlayer ? (
          <Stack.Screen name="PlayerApp" component={PlayerTabs} />
        ) : isCoach ? (
          <Stack.Screen name="CoachApp" component={CoachTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
