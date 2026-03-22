import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { AppDispatch } from '../../store';
import { colors, spacing, radius } from '../../theme';
import api from '../../services/api';

export default function RegisterScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'athlete' | 'trainer'>('athlete');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) { Alert.alert('Missing fields', 'Please fill all fields.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      const { token, role: returnedRole } = res.data;
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('role', returnedRole);
      await SecureStore.setItemAsync('email', email);
      dispatch(setCredentials({ token, role: returnedRole, email }));
    } catch (err: any) {
      Alert.alert('Registration failed', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Text style={styles.logoBlue}>PEAK</Text>
          <Text style={styles.logoWhite}>FORM</Text>
        </View>
        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.sub}>Join Peakform today</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>I am a…</Text>
          <View style={styles.roleRow}>
            {(['athlete', 'trainer'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                  {r === 'athlete' ? 'Player' : 'Coach'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Creating…' : 'Create Account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  logo: { flexDirection: 'row', marginBottom: spacing.xl },
  logoBlue: { fontSize: 36, fontWeight: '900', color: colors.primary },
  logoWhite: { fontSize: 36, fontWeight: '900', color: colors.text },
  heading: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSub, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  roleBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  roleBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(37,99,235,0.15)' },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  roleBtnTextActive: { color: colors.primaryLight },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.textMuted, fontSize: 14 },
  linkBold: { color: colors.primaryLight, fontWeight: '700' },
});
