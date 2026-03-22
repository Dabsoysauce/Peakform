import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchMessages = createAsyncThunk('messages/fetch', async (roomId: string) => {
  const res = await api.get(`/messages/${roomId}`);
  return { roomId, messages: res.data };
});

const messagesSlice = createSlice({
  name: 'messages',
  initialState: {
    rooms: {} as Record<string, any[]>,
    loading: false,
  },
  reducers: {
    addMessage(state, action: PayloadAction<{ roomId: string; message: any }>) {
      const { roomId, message } = action.payload;
      if (!state.rooms[roomId]) state.rooms[roomId] = [];
      state.rooms[roomId].push(message);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => { state.loading = true; })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms[action.payload.roomId] = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state) => { state.loading = false; });
  },
});

export const { addMessage } = messagesSlice.actions;
export default messagesSlice.reducer;
