import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import servicesReducer from './servicesSlice';
import appointmentsReducer from './appointmentsSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    services: servicesReducer,
    appointments: appointmentsReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;