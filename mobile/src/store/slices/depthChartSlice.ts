import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface DepthChartEntry {
  id: number;
  user_id: number;
  position: string;
  order_index: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface DepthChartState {
  entries: DepthChartEntry[];
  loading: boolean;
}

const initialState: DepthChartState = { entries: [], loading: false };

export const fetchDepthChart = createAsyncThunk('depthChart/fetch', async (teamId: number) => {
  const res = await api.get(`/depth-chart/team/${teamId}`);
  return res.data;
});

export const updateDepthChart = createAsyncThunk('depthChart/update', async ({ teamId, entries }: { teamId: number; entries: any[] }) => {
  const res = await api.put(`/depth-chart/team/${teamId}`, { entries });
  return res.data;
});

const depthChartSlice = createSlice({
  name: 'depthChart',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepthChart.pending, (state) => { state.loading = true; })
      .addCase(fetchDepthChart.fulfilled, (state, action) => { state.loading = false; state.entries = action.payload; })
      .addCase(fetchDepthChart.rejected, (state) => { state.loading = false; })
      .addCase(updateDepthChart.fulfilled, (state, action) => { state.entries = action.payload; });
  },
});

export default depthChartSlice.reducer;
