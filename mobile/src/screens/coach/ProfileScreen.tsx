import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchTrainerProfile, updateTrainerProfile } from '../../store/slices/profileSlice';
import { colors, spacing, radius } from '../../theme';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector((state: RootState) => state.profile.trainer);
  const loading = useSelector((state: RootState) => state.profile.loading);
  const [form, setForm] = useState({ first_name: '', last_name: '', specialty: '', certifications: '', bio: '', school_name: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchTrainerProfile()); }, []);
  useEffect(() => {
    if (profile) setForm({
      first_name: profile.first_name || '', last_name: profile.last_name || '',
      specialty: profile.specialty || '', certifications: profile.certifications || '',
      bio: profile.bio || '', school_name: profile.school_name || '',
    });
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    await dispatch(updateTrainerProfile(form));
    setSaving(false);
    Alert.alert('Saved', 'Profile updated successfully');
  }

  if (loading && !profile) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {profile?.profile_photo_url ? (
        <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{(form.first_name?.[0] || '?').toUpperCase()}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Personal Info</Text>
      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>First Name</Text>
          <TextInput style={styles.input} value={form.first_name} onChangeText={v => setForm(f => ({...f, first_name: v}))} placeholderTextColor={colors.textMuted} placeholder="First name" />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput style={styles.input} value={form.last_name} onChangeText={v => setForm(f => ({...f, last_name: v}))} placeholderTextColor={colors.textMuted} placeholder="Last name" />
        </View>
      </View>

      <Text style={styles.label}>Specialty</Text>
      <TextInput style={styles.input} value={form.specialty} onChangeText={v => setForm(f => ({...f, specialty: v}))} placeholderTextColor={colors.textMuted} placeholder="e.g. Basketball Skills Development" />

      <Text style={styles.label}>Certifications</Text>
      <TextInput style={[styles.input, styles.textArea]} value={form.certifications} onChangeText={v => setForm(f => ({...f, certifications: v}))} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} placeholder="List your certifications..." />

      <Text style={styles.label}>School</Text>
      <TextInput style={styles.input} value={form.school_name} onChangeText={v => setForm(f => ({...f, school_name: v}))} placeholderTextColor={colors.textMuted} placeholder="School name" />

      <Text style={styles.sectionTitle}>About</Text>
      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, styles.textArea]} value={form.bio} onChangeText={v => setForm(f => ({...f, bio: v}))} multiline numberOfLines={4} placeholderTextColor={colors.textMuted} placeholder="Tell players about your coaching style..." />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 100 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: spacing.lg },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, alignSelf: 'center', marginBottom: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4, marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.text, fontSize: 15 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
