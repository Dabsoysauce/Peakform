import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchWorkouts = createAsyncThunk('workouts/fetch', async () => {
  const res = await api.get('/workouts');
  return res.data;
});

const workoutsSlice = createSlice({
  name: 'workouts',
  initialState: { list: [] as any[], loading: false, error: null as string | null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkouts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchWorkouts.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchWorkouts.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Error'; });
  },
});

export default workoutsSlice.reducer;
