import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface AthleteProfile {
  first_name: string;
  last_name: string;
  age: number | null;
  height_inches: number | null;
  weight_lbs: number | null;
  bio: string;
  profile_photo_url: string | null;
  primary_goal: string;
  school_name: string;
  gpa: string;
}

interface TrainerProfile {
  first_name: string;
  last_name: string;
  specialty: string;
  certifications: string;
  bio: string;
  profile_photo_url: string | null;
  school_name: string;
}

interface ProfileState {
  athlete: AthleteProfile | null;
  trainer: TrainerProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = { athlete: null, trainer: null, loading: false, error: null };

export const fetchAthleteProfile = createAsyncThunk('profile/fetchAthlete', async () => {
  const res = await api.get('/athlete-profile');
  return res.data;
});

export const updateAthleteProfile = createAsyncThunk('profile/updateAthlete', async (data: Partial<AthleteProfile>) => {
  const res = await api.put('/athlete-profile', data);
  return res.data;
});

export const fetchTrainerProfile = createAsyncThunk('profile/fetchTrainer', async () => {
  const res = await api.get('/trainer-profile');
  return res.data;
});

export const updateTrainerProfile = createAsyncThunk('profile/updateTrainer', async (data: Partial<TrainerProfile>) => {
  const res = await api.put('/trainer-profile', data);
  return res.data;
});

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAthleteProfile.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAthleteProfile.fulfilled, (state, action) => { state.loading = false; state.athlete = action.payload; })
      .addCase(fetchAthleteProfile.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed'; })
      .addCase(updateAthleteProfile.fulfilled, (state, action) => { state.athlete = { ...state.athlete, ...action.payload } as AthleteProfile; })
      .addCase(fetchTrainerProfile.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTrainerProfile.fulfilled, (state, action) => { state.loading = false; state.trainer = action.payload; })
      .addCase(fetchTrainerProfile.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed'; })
      .addCase(updateTrainerProfile.fulfilled, (state, action) => { state.trainer = { ...state.trainer, ...action.payload } as TrainerProfile; });
  },
});

export default profileSlice.reducer;
