import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchAthletes } from '../../store/slices/teamsSlice';
import { fetchGoals } from '../../store/slices/goalsSlice';
import { fetchTeam } from '../../store/slices/teamsSlice';
import StatCard from '../../components/StatCard';
import { colors, spacing } from '../../theme';

export default function CoachHomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const email = useSelector((state: RootState) => state.auth.email) ?? '';
  const athletes = useSelector((state: RootState) => state.teams.athletes);
  const goals = useSelector((state: RootState) => state.goals.list);
  const team = useSelector((state: RootState) => state.teams.team);
  const members = useSelector((state: RootState) => state.teams.members);

  const name = email.split('@')[0];
  const activeGoals = goals.filter((g) => !g.completed && g.status !== 'completed').length;

  useEffect(() => {
    dispatch(fetchAthletes());
    dispatch(fetchGoals());
    dispatch(fetchTeam());
  }, []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Coach <Text style={styles.name}>{name}</Text></Text>
      <Text style={styles.sub}>Here's your team overview</Text>

      <View style={styles.statsRow}>
        <StatCard label="Players" value={members.length || athletes.length} />
        <StatCard label="Active Goals" value={activeGoals} />
        <StatCard label="Team" value={team ? 1 : 0} />
      </View>

      {team && (
        <View style={styles.teamCard}>
          <Text style={styles.teamLabel}>Current Team</Text>
          <Text style={styles.teamName}>{team.name}</Text>
          {team.sport && <Text style={styles.teamSport}>{team.sport}</Text>}
        </View>
      )}

      <Text style={styles.sectionTitle}>Quick Stats</Text>
      <View style={styles.quickRow}>
        <View style={styles.quickItem}>
          <Text style={styles.quickNum}>{members.length}</Text>
          <Text style={styles.quickLabel}>Team Members</Text>
        </View>
        <View style={styles.quickItem}>
          <Text style={styles.quickNum}>{goals.length}</Text>
          <Text style={styles.quickLabel}>Total Goals</Text>
        </View>
        <View style={styles.quickItem}>
          <Text style={[styles.quickNum, { color: colors.success }]}>
            {goals.filter((g) => g.completed).length}
          </Text>
          <Text style={styles.quickLabel}>Completed</Text>
        </View>
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
  teamCard: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.3)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  teamLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  teamName: { fontSize: 18, fontWeight: '800', color: colors.primaryLight },
  teamSport: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickNum: { fontSize: 26, fontWeight: '800', color: colors.text },
  quickLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
});
