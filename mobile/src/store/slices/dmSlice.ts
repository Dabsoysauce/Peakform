import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Contact {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
}

interface DM {
  id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  sender_name?: string;
  reactions?: any[];
}

interface Conversation {
  partner_id: number;
  partner_name: string;
  partner_photo: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface DMState {
  contacts: Contact[];
  conversations: Conversation[];
  messages: { [userId: number]: DM[] };
  loading: boolean;
}

const initialState: DMState = { contacts: [], conversations: [], messages: {}, loading: false };

export const fetchContacts = createAsyncThunk('dm/contacts', async (search: string = '') => {
  const res = await api.get(`/dm/contacts${search ? `?search=${search}` : ''}`);
  return res.data;
});

export const fetchConversations = createAsyncThunk('dm/conversations', async () => {
  const res = await api.get('/dm');
  return res.data;
});

export const fetchDMs = createAsyncThunk('dm/fetch', async (userId: number) => {
  const res = await api.get(`/dm/${userId}`);
  return { userId, messages: res.data };
});

export const sendDM = createAsyncThunk('dm/send', async ({ userId, content }: { userId: number; content: string }) => {
  const res = await api.post(`/dm/${userId}`, { content });
  return { userId, message: res.data };
});

const dmSlice = createSlice({
  name: 'dm',
  initialState,
  reducers: {
    addIncomingDM: (state, action: PayloadAction<{ userId: number; message: DM }>) => {
      const { userId, message } = action.payload;
      if (!state.messages[userId]) state.messages[userId] = [];
      state.messages[userId].push(message);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.fulfilled, (state, action) => { state.contacts = action.payload; })
      .addCase(fetchConversations.pending, (state) => { state.loading = true; })
      .addCase(fetchConversations.fulfilled, (state, action) => { state.loading = false; state.conversations = action.payload; })
      .addCase(fetchConversations.rejected, (state) => { state.loading = false; })
      .addCase(fetchDMs.fulfilled, (state, action) => { state.messages[action.payload.userId] = action.payload.messages; })
      .addCase(sendDM.fulfilled, (state, action) => {
        const { userId, message } = action.payload;
        if (!state.messages[userId]) state.messages[userId] = [];
        state.messages[userId].push(message);
      });
  },
});

export const { addIncomingDM } = dmSlice.actions;
export default dmSlice.reducer;
