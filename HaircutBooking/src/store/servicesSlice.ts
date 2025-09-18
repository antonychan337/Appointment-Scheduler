import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Service {
  id: string;
  nameEn: string;
  nameZh: string;
  durationMinutes: number;
  activeTimeMinutes: number;
  price: number;
  isDefault: boolean;
}

interface ServicesState {
  services: Service[];
  selectedServices: string[];
  loading: boolean;
}

const initialState: ServicesState = {
  services: [],
  selectedServices: [],
  loading: false,
};

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    setServices: (state, action: PayloadAction<Service[]>) => {
      state.services = action.payload;
    },
    toggleServiceSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedServices.indexOf(action.payload);
      if (index > -1) {
        state.selectedServices.splice(index, 1);
      } else {
        state.selectedServices.push(action.payload);
      }
    },
    clearSelectedServices: (state) => {
      state.selectedServices = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setServices, toggleServiceSelection, clearSelectedServices, setLoading } = servicesSlice.actions;
export default servicesSlice.reducer;