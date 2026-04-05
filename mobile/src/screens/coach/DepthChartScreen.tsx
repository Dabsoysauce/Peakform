import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchDepthChart, updateDepthChart } from '../../store/slices/depthChartSlice';
import { fetchTeam, fetchAthletes } from '../../store/slices/teamsSlice';
import { colors, spacing, radius } from '../../theme';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

export default function DepthChartScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { entries, loading } = useSelector((state: RootState) => state.depthChart);
  const team = useSelector((state: RootState) => state.teams.team);
  const members = useSelector((state: RootState) => state.teams.members);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchTeam());
    dispatch(fetchAthletes());
  }, []);

  useEffect(() => {
    if (team?.id) dispatch(fetchDepthChart(team.id));
  }, [team]);

  function getPlayersForPosition(pos: string) {
    return entries
      .filter((e: any) => e.position === pos)
      .sort((a: any, b: any) => a.order_index - b.order_index);
  }

  function getUnassigned() {
    const assignedIds = new Set(entries.map((e: any) => e.user_id));
    return members.filter((m: any) => !assignedIds.has(m.user_id));
  }

  async function assignPlayer(userId: number, position: string) {
    if (!team?.id) return;
    const newEntries = [...entries.map((e: any) => ({ user_id: e.user_id, position: e.position, order_index: e.order_index })), { user_id: userId, position, order_index: getPlayersForPosition(position).length }];
    await dispatch(updateDepthChart({ teamId: team.id, entries: newEntries }));
    setAssigning(null);
    dispatch(fetchDepthChart(team.id));
  }

  if (loading && entries.length === 0) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  const unassigned = getUnassigned();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Depth Chart</Text>
      {!team ? (
        <Text style={styles.emptyText}>Create a team first</Text>
      ) : (
        <>
          {POSITIONS.map(pos => {
            const players = getPlayersForPosition(pos);
            return (
              <View key={pos} style={styles.positionCard}>
                <View style={styles.posHeader}>
                  <Text style={styles.posTitle}>{pos}</Text>
                  <TouchableOpacity onPress={() => setAssigning(assigning === pos ? null : pos)}>
                    <Text style={styles.addText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
                {players.length === 0 ? (
                  <Text style={styles.noPlayer}>No player assigned</Text>
                ) : (
                  players.map((p: any, i: number) => (
                    <View key={p.id} style={styles.playerRow}>
                      <Text style={styles.orderNum}>{i + 1}</Text>
                      <Text style={styles.playerName}>{p.first_name ? `${p.first_name} ${p.last_name || ''}` : p.email || `Player ${p.user_id}`}</Text>
                    </View>
                  ))
                )}
                {assigning === pos && unassigned.length > 0 && (
                  <View style={styles.assignList}>
                    {unassigned.map((m: any) => (
                      <TouchableOpacity key={m.user_id} style={styles.assignItem} onPress={() => assignPlayer(m.user_id, pos)}>
                        <Text style={styles.assignName}>{m.first_name ? `${m.first_name} ${m.last_name || ''}` : m.email}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 100 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: 40 },
  positionCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  posHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  posTitle: { fontSize: 18, fontWeight: '800', color: colors.primaryLight },
  addText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  noPlayer: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  orderNum: { fontSize: 14, fontWeight: '800', color: colors.textMuted, width: 20, textAlign: 'center' },
  playerName: { fontSize: 15, color: colors.text, fontWeight: '600' },
  assignList: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  assignItem: { paddingVertical: 8, paddingHorizontal: spacing.sm },
  assignName: { fontSize: 14, color: colors.primaryLight },
});
