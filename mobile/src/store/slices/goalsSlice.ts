import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchGoals = createAsyncThunk('goals/fetch', async () => {
  const res = await api.get('/goals');
  return res.data;
});

export const createGoal = createAsyncThunk('goals/create', async (data: { title: string; description?: string; target_date?: string }) => {
  const res = await api.post('/goals', data);
  return res.data;
});

export const toggleGoal = createAsyncThunk('goals/toggle', async ({ id, completed }: { id: number; completed: boolean }) => {
  const res = await api.patch(`/goals/${id}`, { completed });
  return res.data;
});

const goalsSlice = createSlice({
  name: 'goals',
  initialState: { list: [] as any[], loading: false, error: null as string | null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchGoals.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchGoals.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Error'; })
      .addCase(createGoal.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(toggleGoal.fulfilled, (state, action) => {
        const idx = state.list.findIndex((g) => g.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      });
  },
});

export default goalsSlice.reducer;
