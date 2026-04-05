import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Notification {
  id: number;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

interface NotificationsState {
  list: Notification[];
  unreadCount: number;
  loading: boolean;
}

const initialState: NotificationsState = { list: [], unreadCount: 0, loading: false };

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  const res = await api.get('/notifications');
  return res.data;
});

export const fetchUnreadCount = createAsyncThunk('notifications/unreadCount', async () => {
  const res = await api.get('/notifications/unread-count');
  return res.data.count;
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async () => {
  await api.put('/notifications/read-all');
  return true;
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false; })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => { state.unreadCount = action.payload; })
      .addCase(markAllRead.fulfilled, (state) => { state.unreadCount = 0; state.list = state.list.map(n => ({ ...n, is_read: true })); });
  },
});

export default notificationsSlice.reducer;
