import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../store';
import { fetchWorkouts } from '../../store/slices/workoutsSlice';
import { fetchTeam } from '../../store/slices/teamsSlice';
import StatCard from '../../components/StatCard';
import { colors, spacing } from '../../theme';

export default function PlayerHomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const email = useSelector((state: RootState) => state.auth.email) ?? '';
  const workouts = useSelector((state: RootState) => state.workouts.list);
  const members = useSelector((state: RootState) => state.teams.members);

  const name = email.split('@')[0];

  useEffect(() => {
    dispatch(fetchWorkouts());
    dispatch(fetchTeam());
  }, []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hey, <Text style={styles.name}>{name}</Text> 👋</Text>
      <Text style={styles.sub}>Here's your overview</Text>

      <View style={styles.statsRow}>
        <StatCard label="Workouts" value={workouts.length} />
        <StatCard label="Teammates" value={members.length} />
      </View>

      <Text style={styles.sectionTitle}>Recent Workouts</Text>
      {workouts.slice(0, 3).map((w, i) => (
        <View key={w.id ?? i} style={styles.recentItem}>
          <Text style={styles.recentName}>{w.name || w.title || 'Workout'}</Text>
          <Text style={styles.recentSub}>{w.exercises?.length ?? 0} exercises</Text>
        </View>
      ))}
      {workouts.length === 0 && <Text style={styles.empty}>No workouts yet</Text>}

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.actionIcon}>👤</Text>
          <Text style={styles.actionLabel}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.actionIcon}>🔔</Text>
          <Text style={styles.actionLabel}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Schedule')}>
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionLabel}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('DirectMessages')}>
          <Text style={styles.actionIcon}>✉️</Text>
          <Text style={styles.actionLabel}>DMs</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 4 },
  name: { color: colors.primaryLight, textTransform: 'capitalize' },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  recentItem: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
  },
  recentName: { fontSize: 14, fontWeight: '700', color: colors.text },
  recentSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm },
  actionCard: { width: '47%', backgroundColor: colors.card, borderRadius: 10, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 13, color: colors.text, fontWeight: '600' },
});
