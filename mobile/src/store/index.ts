import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workoutsReducer from './slices/workoutsSlice';
import teamsReducer from './slices/teamsSlice';
import messagesReducer from './slices/messagesSlice';
import profileReducer from './slices/profileSlice';
import notificationsReducer from './slices/notificationsSlice';
import mediaReducer from './slices/mediaSlice';
import eventsReducer from './slices/eventsSlice';
import dmReducer from './slices/dmSlice';
import playsReducer from './slices/playsSlice';
import practicePlansReducer from './slices/practicePlansSlice';
import depthChartReducer from './slices/depthChartSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workouts: workoutsReducer,
    teams: teamsReducer,
    messages: messagesReducer,
    profile: profileReducer,
    notifications: notificationsReducer,
    media: mediaReducer,
    events: eventsReducer,
    dm: dmReducer,
    plays: playsReducer,
    practicePlans: practicePlansReducer,
    depthChart: depthChartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
