import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Media {
  id: number;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string | null;
  media_type: string;
  tags: string[];
  created_at: string;
  user_id: number;
  user_name?: string;
}

interface MediaAnalysis {
  id: number;
  media_id: number;
  analysis: string;
  focus: string;
  player_focus: any;
  chat_history: any[];
  created_at: string;
}

interface MediaState {
  list: Media[];
  trainerMedia: Media[];
  analyses: MediaAnalysis[];
  loading: boolean;
  error: string | null;
}

const initialState: MediaState = { list: [], trainerMedia: [], analyses: [], loading: false, error: null };

export const fetchMedia = createAsyncThunk('media/fetch', async () => {
  const res = await api.get('/media');
  return res.data;
});

export const fetchTrainerMedia = createAsyncThunk('media/fetchTrainer', async () => {
  const res = await api.get('/trainer-media');
  return res.data;
});

export const fetchAnalyses = createAsyncThunk('media/fetchAnalyses', async ({ mediaId, isTrainer }: { mediaId: number; isTrainer: boolean }) => {
  const prefix = isTrainer ? '/trainer-media' : '/media';
  const res = await api.get(`${prefix}/${mediaId}/analyses`);
  return res.data;
});

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    clearAnalyses: (state) => { state.analyses = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMedia.pending, (state) => { state.loading = true; })
      .addCase(fetchMedia.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchMedia.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed'; })
      .addCase(fetchTrainerMedia.pending, (state) => { state.loading = true; })
      .addCase(fetchTrainerMedia.fulfilled, (state, action) => { state.loading = false; state.trainerMedia = action.payload; })
      .addCase(fetchTrainerMedia.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed'; })
      .addCase(fetchAnalyses.fulfilled, (state, action) => { state.analyses = action.payload; });
  },
});

export const { clearAnalyses } = mediaSlice.actions;
export default mediaSlice.reducer;
