import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchTeam, fetchAthletes } from '../../store/slices/teamsSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, radius } from '../../theme';

export default function PlayersScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { members, athletes, loading } = useSelector((state: RootState) => state.teams);

  const players = members.length > 0
    ? members.filter((m: any) => m.role === 'athlete')
    : athletes;

  useEffect(() => {
    dispatch(fetchTeam());
    dispatch(fetchAthletes());
  }, []);

  if (loading && players.length === 0) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Players</Text>
      <FlatList
        data={players}
        keyExtractor={(item, i) => String(item.id ?? i)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.name || item.email || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name || item.email?.split('@')[0]}</Text>
              <Text style={styles.email}>{item.email}</Text>
              {item.position && <Text style={styles.pos}>{item.position}</Text>}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { dispatch(fetchTeam()); dispatch(fetchAthletes()); }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No players found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, padding: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted },
  pos: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
