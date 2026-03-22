import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchTeam = createAsyncThunk('teams/fetch', async () => {
  const res = await api.get('/teams/my-team');
  return res.data;
});

export const fetchAthletes = createAsyncThunk('teams/athletes', async () => {
  const res = await api.get('/athletes');
  return res.data;
});

const teamsSlice = createSlice({
  name: 'teams',
  initialState: {
    team: null as any,
    members: [] as any[],
    athletes: [] as any[],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeam.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.team = action.payload.team ?? action.payload;
        state.members = action.payload.members ?? [];
      })
      .addCase(fetchTeam.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Error'; })
      .addCase(fetchAthletes.fulfilled, (state, action) => { state.athletes = action.payload; });
  },
});

export default teamsSlice.reducer;
