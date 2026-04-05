import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchPlays, deletePlay } from '../../store/slices/playsSlice';
import { colors, spacing, radius } from '../../theme';

export default function PlaybookScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, loading } = useSelector((state: RootState) => state.plays);

  useEffect(() => { dispatch(fetchPlays()); }, []);

  function handleDelete(id: number, name: string) {
    Alert.alert('Delete Play', `Delete "${name}"?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deletePlay(id)) },
    ]);
  }

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.playIcon}>
        <Text style={{ fontSize: 24 }}>📋</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name || 'Unnamed Play'}</Text>
        <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Playbook</Text>
      <Text style={styles.subtitle}>Create and edit plays on the web app</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: spacing.sm }}>📋</Text>
          <Text style={styles.emptyText}>No plays yet</Text>
          <Text style={styles.emptySubtext}>Create plays using the web app's playbook editor</Text>
        </View>
      ) : (
        <FlatList data={list} keyExtractor={i => i.id.toString()} renderItem={renderItem} contentContainerStyle={{ padding: spacing.md }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  subtitle: { fontSize: 12, color: colors.textMuted, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  playIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(37,99,235,0.1)', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.sm },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
});
