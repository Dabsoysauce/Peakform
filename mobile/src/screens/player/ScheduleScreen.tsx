import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchPlayerEvents } from '../../store/slices/eventsSlice';
import { fetchTeam } from '../../store/slices/teamsSlice';
import { colors, spacing, radius } from '../../theme';

export default function ScheduleScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, loading } = useSelector((state: RootState) => state.events);
  const team = useSelector((state: RootState) => state.teams.team);

  useEffect(() => {
    dispatch(fetchTeam());
  }, []);

  useEffect(() => {
    if (team?.trainer_id) {
      dispatch(fetchPlayerEvents(team.trainer_id));
    }
  }, [team]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  const typeColors: Record<string, string> = {
    game: colors.danger,
    practice: colors.primary,
    meeting: colors.warning,
    other: colors.textMuted,
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={[styles.typeBadge, { backgroundColor: typeColors[item.event_type] || colors.primary }]}>
        <Text style={styles.typeText}>{item.event_type?.toUpperCase()}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDate}>{formatDate(item.start_time)} · {formatTime(item.start_time)} – {formatTime(item.end_time)}</Text>
      {item.location ? <Text style={styles.cardLocation}>📍 {item.location}</Text> : null}
      {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Schedule</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No upcoming events</Text>
          <Text style={styles.emptySubtext}>Your coach hasn't scheduled anything yet</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, padding: spacing.lg, paddingBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: spacing.xs },
  typeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardDate: { fontSize: 13, color: colors.primaryLight, marginBottom: 4 },
  cardLocation: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  cardNotes: { fontSize: 13, color: colors.textSub, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
});
