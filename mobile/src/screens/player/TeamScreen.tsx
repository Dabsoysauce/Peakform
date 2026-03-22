import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchTeam } from '../../store/slices/teamsSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, radius } from '../../theme';

export default function PlayerTeamScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { team, members, loading } = useSelector((state: RootState) => state.teams);

  useEffect(() => { dispatch(fetchTeam()); }, []);

  if (loading && !team) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>My Team</Text>

      {team && (
        <View style={styles.teamCard}>
          <Text style={styles.teamName}>{team.name}</Text>
          {team.sport && <Text style={styles.teamSub}>{team.sport}</Text>}
        </View>
      )}

      {!team && !loading && (
        <Text style={styles.empty}>You're not on a team yet.</Text>
      )}

      {members.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          <FlatList
            data={members}
            keyExtractor={(item, i) => String(item.id ?? i)}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.name || item.email || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.memberName}>{item.name || item.email?.split('@')[0]}</Text>
                  <Text style={styles.memberRole}>{item.role === 'trainer' ? 'Coach' : 'Player'}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => dispatch(fetchTeam())} tintColor={colors.primary} />}
          />
        </>
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
  teamName: { fontSize: 18, fontWeight: '800', color: colors.primaryLight },
  teamSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  memberName: { fontSize: 14, fontWeight: '600', color: colors.text },
  memberRole: { fontSize: 12, color: colors.textMuted },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
