import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchAthleteProfile, updateAthleteProfile } from '../../store/slices/profileSlice';
import { colors, spacing, radius } from '../../theme';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector((state: RootState) => state.profile.athlete);
  const loading = useSelector((state: RootState) => state.profile.loading);
  const [form, setForm] = useState({
    first_name: '', last_name: '', age: '', height_feet: '', height_inches: '',
    weight_lbs: '', bio: '', primary_goal: '', school_name: '', gpa: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchAthleteProfile()); }, []);

  useEffect(() => {
    if (profile) {
      const totalInches = profile.height_inches || 0;
      setForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        age: profile.age?.toString() || '',
        height_feet: totalInches ? Math.floor(totalInches / 12).toString() : '',
        height_inches: totalInches ? (totalInches % 12).toString() : '',
        weight_lbs: profile.weight_lbs?.toString() || '',
        bio: profile.bio || '',
        primary_goal: profile.primary_goal || '',
        school_name: profile.school_name || '',
        gpa: profile.gpa || '',
      });
    }
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    const heightInches = (parseInt(form.height_feet) || 0) * 12 + (parseInt(form.height_inches) || 0);
    await dispatch(updateAthleteProfile({
      first_name: form.first_name,
      last_name: form.last_name,
      age: parseInt(form.age) || null,
      height_inches: heightInches || null,
      weight_lbs: parseInt(form.weight_lbs) || null,
      bio: form.bio,
      primary_goal: form.primary_goal,
      school_name: form.school_name,
      gpa: form.gpa,
    }));
    setSaving(false);
    Alert.alert('Saved', 'Profile updated successfully');
  }

  if (loading && !profile) return (
    <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {profile?.profile_photo_url && (
        <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
      )}
      {!profile?.profile_photo_url && (
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

      <View style={styles.row}>
        <View style={styles.thirdField}>
          <Text style={styles.label}>Age</Text>
          <TextInput style={styles.input} value={form.age} onChangeText={v => setForm(f => ({...f, age: v}))} keyboardType="numeric" placeholderTextColor={colors.textMuted} placeholder="Age" />
        </View>
        <View style={styles.thirdField}>
          <Text style={styles.label}>Height (ft)</Text>
          <TextInput style={styles.input} value={form.height_feet} onChangeText={v => setForm(f => ({...f, height_feet: v}))} keyboardType="numeric" placeholderTextColor={colors.textMuted} placeholder="Ft" />
        </View>
        <View style={styles.thirdField}>
          <Text style={styles.label}>Height (in)</Text>
          <TextInput style={styles.input} value={form.height_inches} onChangeText={v => setForm(f => ({...f, height_inches: v}))} keyboardType="numeric" placeholderTextColor={colors.textMuted} placeholder="In" />
        </View>
      </View>

      <Text style={styles.label}>Weight (lbs)</Text>
      <TextInput style={styles.input} value={form.weight_lbs} onChangeText={v => setForm(f => ({...f, weight_lbs: v}))} keyboardType="numeric" placeholderTextColor={colors.textMuted} placeholder="Weight" />

      <Text style={styles.label}>GPA</Text>
      <TextInput style={styles.input} value={form.gpa} onChangeText={v => setForm(f => ({...f, gpa: v}))} placeholderTextColor={colors.textMuted} placeholder="e.g. 3.5" />

      <Text style={styles.sectionTitle}>About</Text>
      <Text style={styles.label}>Primary Goal</Text>
      <TextInput style={styles.input} value={form.primary_goal} onChangeText={v => setForm(f => ({...f, primary_goal: v}))} placeholderTextColor={colors.textMuted} placeholder="e.g. Play college basketball" />

      <Text style={styles.label}>School</Text>
      <TextInput style={styles.input} value={form.school_name} onChangeText={v => setForm(f => ({...f, school_name: v}))} placeholderTextColor={colors.textMuted} placeholder="School name" />

      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, styles.textArea]} value={form.bio} onChangeText={v => setForm(f => ({...f, bio: v}))} multiline numberOfLines={4} placeholderTextColor={colors.textMuted} placeholder="Tell us about yourself..." />

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
  thirdField: { flex: 1 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
