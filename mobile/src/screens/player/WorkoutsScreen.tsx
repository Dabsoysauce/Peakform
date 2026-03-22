import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchWorkouts } from '../../store/slices/workoutsSlice';
import WorkoutCard from '../../components/WorkoutCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing } from '../../theme';

export default function WorkoutsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, loading } = useSelector((state: RootState) => state.workouts);

  useEffect(() => { dispatch(fetchWorkouts()); }, []);

  if (loading && list.length === 0) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>My Workouts</Text>
      <FlatList
        data={list}
        keyExtractor={(item, i) => String(item.id ?? i)}
        renderItem={({ item }) => <WorkoutCard workout={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => dispatch(fetchWorkouts())} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>No workouts assigned yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, padding: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
