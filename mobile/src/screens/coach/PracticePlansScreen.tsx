import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchPracticePlans, createPracticePlan, deletePracticePlan, fetchPracticePlan } from '../../store/slices/practicePlansSlice';
import { colors, spacing, radius } from '../../theme';

export default function PracticePlansScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, current, loading } = useSelector((state: RootState) => state.practicePlans);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', notes: '' });

  useEffect(() => { dispatch(fetchPracticePlans()); }, []);

  async function handleCreate() {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    await dispatch(createPracticePlan(form));
    setShowCreate(false);
    setForm({ title: '', date: '', notes: '' });
  }

  function handleDelete(id: number) {
    Alert.alert('Delete Plan', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deletePracticePlan(id)) },
    ]);
  }

  function viewDetail(id: number) {
    dispatch(fetchPracticePlan(id));
    setShowDetail(true);
  }

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => viewDetail(item.id)}>
      <View style={styles.iconBox}><Text style={{ fontSize: 22 }}>📝</Text></View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDate}>{item.date ? new Date(item.date).toLocaleDateString() : 'No date'}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Practice Plans</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: spacing.sm }}>📝</Text>
          <Text style={styles.emptyText}>No practice plans yet</Text>
        </View>
      ) : (
        <FlatList data={list} keyExtractor={i => i.id.toString()} renderItem={renderItem} contentContainerStyle={{ padding: spacing.md }} />
      )}

      {/* Create modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Practice Plan</Text>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={v => setForm(f => ({...f, title: v}))} placeholder="e.g. Tuesday Practice" placeholderTextColor={colors.textMuted} />
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.date} onChangeText={v => setForm(f => ({...f, date: v}))} placeholder="2026-04-10" placeholderTextColor={colors.textMuted} />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { minHeight: 60 }]} value={form.notes} onChangeText={v => setForm(f => ({...f, notes: v}))} multiline placeholder="Plan notes..." placeholderTextColor={colors.textMuted} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate}><Text style={styles.createBtnText}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={styles.modalTitle}>{current?.title || 'Plan'}</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Text style={{ fontSize: 20, color: colors.textMuted }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              {current?.notes ? <Text style={{ color: colors.textSub, marginBottom: spacing.md }}>{current.notes}</Text> : null}
              {current?.blocks && current.blocks.length > 0 ? (
                current.blocks.map((block: any, i: number) => (
                  <View key={block.id || i} style={styles.blockCard}>
                    <View style={styles.blockHeader}>
                      <Text style={styles.blockTime}>{block.duration_minutes} min</Text>
                      <Text style={styles.blockType}>{block.type}</Text>
                    </View>
                    <Text style={styles.blockTitle}>{block.title}</Text>
                    {block.notes ? <Text style={styles.blockNotes}>{block.notes}</Text> : null}
                  </View>
                ))
              ) : (
                <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 20 }}>No blocks added yet. Edit on web app.</Text>
              )}
            </ScrollView>
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
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(37,99,235,0.1)', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4, marginTop: spacing.sm, textTransform: 'uppercase' },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text, fontSize: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: spacing.lg, alignItems: 'center' },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.sm },
  createBtnText: { color: '#fff', fontWeight: '700' },
  blockCard: { backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.primary },
  blockHeader: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  blockTime: { fontSize: 12, fontWeight: '700', color: colors.primaryLight },
  blockType: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  blockTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  blockNotes: { fontSize: 13, color: colors.textSub, marginTop: 4 },
});
