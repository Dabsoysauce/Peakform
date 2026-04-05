import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Play {
  id: number;
  name: string;
  canvas_json: any;
  created_at: string;
}

interface PlaysState {
  list: Play[];
  loading: boolean;
}

const initialState: PlaysState = { list: [], loading: false };

export const fetchPlays = createAsyncThunk('plays/fetch', async () => {
  const res = await api.get('/plays');
  return res.data;
});

export const deletePlay = createAsyncThunk('plays/delete', async (id: number) => {
  await api.delete(`/plays/${id}`);
  return id;
});

const playsSlice = createSlice({
  name: 'plays',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlays.pending, (state) => { state.loading = true; })
      .addCase(fetchPlays.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchPlays.rejected, (state) => { state.loading = false; })
      .addCase(deletePlay.fulfilled, (state, action) => { state.list = state.list.filter(p => p.id !== action.payload); });
  },
});

export default playsSlice.reducer;
