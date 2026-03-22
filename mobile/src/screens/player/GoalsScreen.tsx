import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchGoals, createGoal, toggleGoal } from '../../store/slices/goalsSlice';
import GoalCard from '../../components/GoalCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, radius } from '../../theme';

export default function GoalsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, loading } = useSelector((state: RootState) => state.goals);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { dispatch(fetchGoals()); }, []);

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('', 'Please enter a goal title'); return; }
    setCreating(true);
    try {
      await dispatch(createGoal({ title, description })).unwrap();
      setTitle(''); setDescription(''); setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  }

  if (loading && list.length === 0) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>My Goals</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item, i) => String(item.id ?? i)}
        renderItem={({ item }) => (
          <GoalCard goal={item} onToggle={(id, completed) => dispatch(toggleGoal({ id, completed }))} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => dispatch(fetchGoals())} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>No goals set yet. Add your first!</Text>}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <TextInput
              style={styles.input}
              placeholder="Goal title"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
                <Text style={styles.saveText}>{creating ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: spacing.sm },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.textMuted, fontWeight: '600' },
  saveBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
