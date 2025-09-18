import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Appointment {
  id: string;
  serviceId: string;
  customerId: string;
  ownerId: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  totalPrice: number;
}

interface AppointmentsState {
  appointments: Appointment[];
  selectedDate: string;
  selectedTime: string | null;
  availableSlots: string[];
  loading: boolean;
}

const initialState: AppointmentsState = {
  appointments: [],
  selectedDate: new Date().toISOString().split('T')[0],
  selectedTime: null,
  availableSlots: [],
  loading: false,
};

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    setAppointments: (state, action: PayloadAction<Appointment[]>) => {
      state.appointments = action.payload;
    },
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
      state.selectedTime = null;
    },
    setSelectedTime: (state, action: PayloadAction<string | null>) => {
      state.selectedTime = action.payload;
    },
    setAvailableSlots: (state, action: PayloadAction<string[]>) => {
      state.availableSlots = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setAppointments,
  setSelectedDate,
  setSelectedTime,
  setAvailableSlots,
  setLoading
} = appointmentsSlice.actions;
export default appointmentsSlice.reducer;