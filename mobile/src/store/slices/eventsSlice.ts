import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Event {
  id: number;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
  created_at: string;
}

interface EventsState {
  list: Event[];
  loading: boolean;
}

const initialState: EventsState = { list: [], loading: false };

export const fetchEvents = createAsyncThunk('events/fetch', async () => {
  const res = await api.get('/events');
  return res.data;
});

export const fetchPlayerEvents = createAsyncThunk('events/fetchPlayer', async (trainerId: number) => {
  const res = await api.get(`/events/trainer/${trainerId}`);
  return res.data;
});

export const createEvent = createAsyncThunk('events/create', async (data: Partial<Event>) => {
  const res = await api.post('/events', data);
  return res.data;
});

export const deleteEvent = createAsyncThunk('events/delete', async (id: number) => {
  await api.delete(`/events/${id}`);
  return id;
});

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => { state.loading = true; })
      .addCase(fetchEvents.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchEvents.rejected, (state) => { state.loading = false; })
      .addCase(fetchPlayerEvents.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(createEvent.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(deleteEvent.fulfilled, (state, action) => { state.list = state.list.filter(e => e.id !== action.payload); });
  },
});

export default eventsSlice.reducer;
