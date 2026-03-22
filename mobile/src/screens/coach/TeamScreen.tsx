import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchTeam } from '../../store/slices/teamsSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, radius } from '../../theme';

export default function CoachTeamScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { team, members, loading } = useSelector((state: RootState) => state.teams);

  useEffect(() => { dispatch(fetchTeam()); }, []);

  if (loading && !team) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Team</Text>

      {team ? (
        <View style={styles.teamCard}>
          <Text style={styles.teamName}>{team.name}</Text>
          {team.sport && <Text style={styles.teamSub}>{team.sport}</Text>}
          <Text style={styles.teamCount}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </View>
      ) : (
        <Text style={styles.empty}>No team found. Create one on the web app.</Text>
      )}

      {members.length > 0 && (
        <FlatList
          data={members}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View style={[styles.avatar, item.role === 'trainer' && styles.avatarCoach]}>
                <Text style={styles.avatarText}>{(item.name || item.email || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.memberName}>{item.name || item.email?.split('@')[0]}</Text>
                <Text style={styles.memberEmail}>{item.email}</Text>
              </View>
              <View style={[styles.badge, item.role === 'trainer' && styles.badgeCoach]}>
                <Text style={styles.badgeText}>{item.role === 'trainer' ? 'Coach' : 'Player'}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => dispatch(fetchTeam())} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, padding: spacing.lg, paddingBottom: spacing.sm },
  teamCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(37,99,235,0.1)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.3)',
    padding: spacing.md,
  },
  teamName: { fontSize: 20, fontWeight: '800', color: colors.primaryLight },
  teamSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  teamCount: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  list: { paddingHorizontal: spacing.lg },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarCoach: { backgroundColor: '#7c3aed' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '700', color: colors.text },
  memberEmail: { fontSize: 12, color: colors.textMuted },
  badge: { backgroundColor: 'rgba(37,99,235,0.15)', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeCoach: { backgroundColor: 'rgba(124,58,237,0.15)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.primaryLight },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
