import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface PlanBlock {
  id: number;
  title: string;
  duration_minutes: number;
  type: string;
  notes: string;
  order_index: number;
}

interface PracticePlan {
  id: number;
  title: string;
  date: string;
  notes: string;
  created_at: string;
  blocks?: PlanBlock[];
}

interface PracticePlansState {
  list: PracticePlan[];
  current: PracticePlan | null;
  loading: boolean;
}

const initialState: PracticePlansState = { list: [], current: null, loading: false };

export const fetchPracticePlans = createAsyncThunk('practicePlans/fetch', async () => {
  const res = await api.get('/practice-plans');
  return res.data;
});

export const fetchPracticePlan = createAsyncThunk('practicePlans/fetchOne', async (id: number) => {
  const res = await api.get(`/practice-plans/${id}`);
  return res.data;
});

export const createPracticePlan = createAsyncThunk('practicePlans/create', async (data: { title: string; date: string; notes?: string }) => {
  const res = await api.post('/practice-plans', data);
  return res.data;
});

export const deletePracticePlan = createAsyncThunk('practicePlans/delete', async (id: number) => {
  await api.delete(`/practice-plans/${id}`);
  return id;
});

const practicePlansSlice = createSlice({
  name: 'practicePlans',
  initialState,
  reducers: { clearCurrent: (state) => { state.current = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPracticePlans.pending, (state) => { state.loading = true; })
      .addCase(fetchPracticePlans.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchPracticePlans.rejected, (state) => { state.loading = false; })
      .addCase(fetchPracticePlan.fulfilled, (state, action) => { state.current = action.payload; })
      .addCase(createPracticePlan.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(deletePracticePlan.fulfilled, (state, action) => { state.list = state.list.filter(p => p.id !== action.payload); });
  },
});

export const { clearCurrent } = practicePlansSlice.actions;
export default practicePlansSlice.reducer;
