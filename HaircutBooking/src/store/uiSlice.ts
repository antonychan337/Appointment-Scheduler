import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  language: 'en' | 'zh';
  isOwnerView: boolean;
  dashboardPeriod: 'day' | 'week';
  calendarView: 'day' | 'week';
}

const initialState: UIState = {
  language: 'zh',
  isOwnerView: false,
  dashboardPeriod: 'day',
  calendarView: 'day',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<'en' | 'zh'>) => {
      state.language = action.payload;
    },
    toggleView: (state) => {
      state.isOwnerView = !state.isOwnerView;
    },
    setDashboardPeriod: (state, action: PayloadAction<'day' | 'week'>) => {
      state.dashboardPeriod = action.payload;
    },
    setCalendarView: (state, action: PayloadAction<'day' | 'week'>) => {
      state.calendarView = action.payload;
    },
  },
});

export const { setLanguage, toggleView, setDashboardPeriod, setCalendarView } = uiSlice.actions;
export default uiSlice.reducer;