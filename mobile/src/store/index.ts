import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workoutsReducer from './slices/workoutsSlice';
import teamsReducer from './slices/teamsSlice';
import messagesReducer from './slices/messagesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workouts: workoutsReducer,
    teams: teamsReducer,
    messages: messagesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
