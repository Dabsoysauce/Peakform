import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchNotifications, markAllRead } from '../../store/slices/notificationsSlice';
import { colors, spacing, radius } from '../../theme';

export default function NotificationsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, loading } = useSelector((state: RootState) => state.notifications);

  useEffect(() => { dispatch(fetchNotifications()); }, []);

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {list.some(n => !n.is_read) && (
          <TouchableOpacity onPress={() => dispatch(markAllRead())}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading && list.length === 0 ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>No notifications</Text></View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={i => i.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, !item.is_read && styles.unread]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.is_read ? 'transparent' : colors.primary, marginTop: 6, marginRight: spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardText}>{item.content}</Text>
                <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: spacing.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  markAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.primary, backgroundColor: 'rgba(37,99,235,0.08)' },
  cardText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  cardTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15 },
});
