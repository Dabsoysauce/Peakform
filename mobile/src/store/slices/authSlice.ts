import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
}

const initialState: AuthState = {
  token: null,
  role: null,
  email: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; role: string; email: string }>) {
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.email = action.payload.email;
    },
    logout(state) {
      state.token = null;
      state.role = null;
      state.email = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
