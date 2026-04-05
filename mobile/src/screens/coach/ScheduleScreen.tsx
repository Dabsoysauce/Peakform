import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchEvents, createEvent, deleteEvent } from '../../store/slices/eventsSlice';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

export default function ScheduleScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, loading } = useSelector((state: RootState) => state.events);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', event_type: 'practice', location: '', notes: '', date: '', start_time: '', end_time: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { dispatch(fetchEvents()); }, []);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.date || !form.start_time || !form.end_time) {
      Alert.alert('Error', 'Please fill in title, date, and times');
      return;
    }
    setCreating(true);
    const startISO = `${form.date}T${form.start_time}:00`;
    const endISO = `${form.date}T${form.end_time}:00`;
    await dispatch(createEvent({ title: form.title, event_type: form.event_type, start_time: startISO, end_time: endISO, location: form.location, notes: form.notes }));
    setCreating(false);
    setShowCreate(false);
    setForm({ title: '', event_type: 'practice', location: '', notes: '', date: '', start_time: '', end_time: '' });
  }

  function handleDelete(id: number) {
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteEvent(id)) },
    ]);
  }

  async function handleShare(id: number) {
    try {
      await api.post(`/events/${id}/share`);
      Alert.alert('Shared', 'Event shared with team');
    } catch { Alert.alert('Error', 'Failed to share'); }
  }

  const typeColors: Record<string, string> = { game: colors.danger, practice: colors.primary, meeting: colors.warning };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={[styles.typeBadge, { backgroundColor: typeColors[item.event_type] || colors.textMuted }]}>
        <Text style={styles.typeText}>{item.event_type?.toUpperCase()}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDate}>{formatDate(item.start_time)} · {formatTime(item.start_time)} – {formatTime(item.end_time)}</Text>
      {item.location ? <Text style={styles.cardLocation}>{item.location}</Text> : null}
      {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(item.id)}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const types = ['practice', 'game', 'meeting', 'other'];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>No events scheduled</Text></View>
      ) : (
        <FlatList data={list} keyExtractor={i => i.id.toString()} renderItem={renderItem} contentContainerStyle={{ padding: spacing.md }} />
      )}

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Event</Text>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={v => setForm(f => ({...f, title: v}))} placeholderTextColor={colors.textMuted} placeholder="Event title" />
            <Text style={styles.label}>Type</Text>
            <View style={styles.typesRow}>
              {types.map(t => (
                <TouchableOpacity key={t} style={[styles.typeOption, form.event_type === t && styles.typeOptionActive]} onPress={() => setForm(f => ({...f, event_type: t}))}>
                  <Text style={[styles.typeOptionText, form.event_type === t && styles.typeOptionTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.date} onChangeText={v => setForm(f => ({...f, date: v}))} placeholderTextColor={colors.textMuted} placeholder="2026-04-10" />
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Start (HH:MM)</Text>
                <TextInput style={styles.input} value={form.start_time} onChangeText={v => setForm(f => ({...f, start_time: v}))} placeholderTextColor={colors.textMuted} placeholder="16:00" />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>End (HH:MM)</Text>
                <TextInput style={styles.input} value={form.end_time} onChangeText={v => setForm(f => ({...f, end_time: v}))} placeholderTextColor={colors.textMuted} placeholder="18:00" />
              </View>
            </View>
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={form.location} onChangeText={v => setForm(f => ({...f, location: v}))} placeholderTextColor={colors.textMuted} placeholder="Gym, field, etc." />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { minHeight: 60 }]} value={form.notes} onChangeText={v => setForm(f => ({...f, notes: v}))} multiline placeholderTextColor={colors.textMuted} placeholder="Additional info..." />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
                <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: spacing.xs },
  typeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardDate: { fontSize: 13, color: colors.primaryLight, marginBottom: 4 },
  cardLocation: { fontSize: 13, color: colors.textMuted },
  cardNotes: { fontSize: 13, color: colors.textSub, marginTop: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  shareBtn: { backgroundColor: 'rgba(37,99,235,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  shareBtnText: { color: colors.primaryLight, fontSize: 12, fontWeight: '600' },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4, marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text, fontSize: 15 },
  typesRow: { flexDirection: 'row', gap: 8 },
  typeOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  typeOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeOptionText: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  typeOptionTextActive: { color: '#fff' },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: spacing.lg },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600' },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.sm },
  createBtnText: { color: '#fff', fontWeight: '700' },
});
