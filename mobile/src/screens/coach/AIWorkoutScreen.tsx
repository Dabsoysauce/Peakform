import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchTeam, fetchAthletes } from '../../store/slices/teamsSlice';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

export default function AIWorkoutScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const members = useSelector((state: RootState) => state.teams.members);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [form, setForm] = useState({ goals: '', weaknesses: '', fitness_level: 'intermediate', focus_areas: '', duration_days: '5' });
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { dispatch(fetchTeam()); dispatch(fetchAthletes()); }, []);

  async function handleGenerate() {
    if (!selectedPlayer) { Alert.alert('Error', 'Select a player first'); return; }
    setGenerating(true);
    setPlan(null);
    try {
      const res = await api.post('/ai/generate-workout', {
        userId: selectedPlayer.user_id,
        ...form,
        duration_days: parseInt(form.duration_days) || 5,
      });
      setPlan(res.data.plan);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to generate workout');
    }
    setGenerating(false);
  }

  async function handleAssignWorkout(workout: any) {
    if (!selectedPlayer) return;
    setAssigning(true);
    try {
      await api.post(`/workouts/assign/${selectedPlayer.user_id}`, {
        session_name: workout.session_name,
        notes: workout.notes,
        exercises: workout.exercises.map((ex: any) => ({
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          weight_lbs: ex.weight_lbs,
          notes: ex.notes,
        })),
      });
      Alert.alert('Assigned', `${workout.session_name} assigned to player`);
    } catch {
      Alert.alert('Error', 'Failed to assign workout');
    }
    setAssigning(false);
  }

  const levels = ['beginner', 'intermediate', 'advanced'];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI Workout Generator</Text>

      <Text style={styles.label}>Select Player</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {members.map((m: any) => (
          <TouchableOpacity key={m.user_id} style={[styles.playerChip, selectedPlayer?.user_id === m.user_id && styles.playerChipActive]} onPress={() => setSelectedPlayer(m)}>
            <Text style={[styles.playerChipText, selectedPlayer?.user_id === m.user_id && styles.playerChipTextActive]}>
              {m.first_name ? `${m.first_name} ${m.last_name?.[0] || ''}` : m.email?.split('@')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Goals</Text>
      <TextInput style={styles.input} value={form.goals} onChangeText={v => setForm(f => ({...f, goals: v}))} placeholder="e.g. Increase vertical, improve speed" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Weaknesses</Text>
      <TextInput style={styles.input} value={form.weaknesses} onChangeText={v => setForm(f => ({...f, weaknesses: v}))} placeholder="e.g. Lateral quickness, upper body strength" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Fitness Level</Text>
      <View style={styles.levelsRow}>
        {levels.map(l => (
          <TouchableOpacity key={l} style={[styles.levelBtn, form.fitness_level === l && styles.levelBtnActive]} onPress={() => setForm(f => ({...f, fitness_level: l}))}>
            <Text style={[styles.levelText, form.fitness_level === l && styles.levelTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Focus Areas</Text>
      <TextInput style={styles.input} value={form.focus_areas} onChangeText={v => setForm(f => ({...f, focus_areas: v}))} placeholder="e.g. Explosiveness, conditioning" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Days</Text>
      <TextInput style={[styles.input, { width: 80 }]} value={form.duration_days} onChangeText={v => setForm(f => ({...f, duration_days: v}))} keyboardType="numeric" placeholderTextColor={colors.textMuted} />

      <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={generating}>
        {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateBtnText}>Generate Workout Plan</Text>}
      </TouchableOpacity>

      {plan && (
        <View style={styles.planContainer}>
          <Text style={styles.planName}>{plan.plan_name}</Text>
          <Text style={styles.planDesc}>{plan.description}</Text>
          {plan.workouts?.map((w: any, i: number) => (
            <View key={i} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>Day {w.day}: {w.session_name}</Text>
                <TouchableOpacity style={styles.assignBtn} onPress={() => handleAssignWorkout(w)} disabled={assigning}>
                  <Text style={styles.assignBtnText}>Assign</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.dayMeta}>{w.duration_minutes} min · {w.focus}</Text>
              {w.notes ? <Text style={styles.dayNotes}>{w.notes}</Text> : null}
              {w.exercises?.map((ex: any, j: number) => (
                <View key={j} style={styles.exerciseRow}>
                  <Text style={styles.exName}>{ex.exercise_name}</Text>
                  <Text style={styles.exDetail}>{ex.sets}x{ex.reps}{ex.weight_lbs ? ` @ ${ex.weight_lbs}lbs` : ''}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4, marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text, fontSize: 15 },
  playerChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.card },
  playerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  playerChipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  playerChipTextActive: { color: '#fff' },
  levelsRow: { flexDirection: 'row', gap: 8 },
  levelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  levelBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelText: { fontSize: 13, color: colors.textMuted, textTransform: 'capitalize' },
  levelTextActive: { color: '#fff' },
  generateBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: spacing.xl },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  planContainer: { marginTop: spacing.xl },
  planName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  planDesc: { fontSize: 14, color: colors.textSub, marginBottom: spacing.lg, lineHeight: 20 },
  dayCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dayTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  assignBtn: { backgroundColor: 'rgba(37,99,235,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  assignBtnText: { color: colors.primaryLight, fontSize: 12, fontWeight: '600' },
  dayMeta: { fontSize: 12, color: colors.primaryLight, marginBottom: 4 },
  dayNotes: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  exName: { fontSize: 14, color: colors.text },
  exDetail: { fontSize: 14, color: colors.textMuted },
});
