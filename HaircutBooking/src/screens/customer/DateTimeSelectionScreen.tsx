import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../../store';
import { setSelectedDate, setSelectedTime, setAvailableSlots, setLoading } from '../../store/appointmentsSlice';
import { appointmentsAPI } from '../../services/api';

const DateTimeSelectionScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { selectedDate, selectedTime, availableSlots, loading } = useSelector(
    (state: RootState) => state.appointments
  );
  const { selectedServices } = useSelector((state: RootState) => state.services);

  const [ownerId] = useState('demo-owner-id'); // For demo purposes

  useEffect(() => {
    if (selectedDate && selectedServices.length > 0) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedServices]);

  const fetchAvailableSlots = async () => {
    dispatch(setLoading(true));
    try {
      // For simplicity, using first selected service
      const serviceId = selectedServices[0];
      const response = await appointmentsAPI.getAvailableSlots(
        ownerId,
        serviceId,
        selectedDate
      );
      dispatch(setAvailableSlots(response.data.slots));
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      dispatch(setAvailableSlots([]));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDateSelect = (date: any) => {
    dispatch(setSelectedDate(date.dateString));
  };

  const handleTimeSelect = (time: string) => {
    dispatch(setSelectedTime(time));
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const renderTimeSlot = (time: string) => {
    const isSelected = selectedTime === time;
    return (
      <TouchableOpacity
        key={time}
        style={[styles.timeSlot, isSelected && styles.selectedTimeSlot]}
        onPress={() => handleTimeSelect(time)}
      >
        <Text style={[styles.timeText, isSelected && styles.selectedTimeText]}>
          {formatTime(time)}
        </Text>
      </TouchableOpacity>
    );
  };

  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>{t('customer.booking.selectDate')}</Text>
        </View>

        <Calendar
          current={selectedDate}
          minDate={minDate.toISOString().split('T')[0]}
          maxDate={maxDate.toISOString().split('T')[0]}
          onDayPress={handleDateSelect}
          markedDates={{
            [selectedDate]: {
              selected: true,
              selectedColor: '#4A90E2',
            },
          }}
          theme={{
            selectedDayBackgroundColor: '#4A90E2',
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: '#4A90E2',
            arrowColor: '#4A90E2',
          }}
        />

        <View style={styles.timeSlotsContainer}>
          <Text style={styles.sectionTitle}>{t('customer.booking.availableTimes')}</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
          ) : availableSlots.length > 0 ? (
            <View style={styles.timeGrid}>
              {availableSlots.map(renderTimeSlot)}
            </View>
          ) : (
            <Text style={styles.noSlotsText}>
              {t('customer.booking.noAvailableSlots')}
            </Text>
          )}
        </View>
      </ScrollView>

      {selectedTime && (
        <View style={styles.footer}>
          <View style={styles.selectionSummary}>
            <Text style={styles.summaryLabel}>{t('customer.booking.selectedDateTime')}:</Text>
            <Text style={styles.summaryValue}>
              {selectedDate} {formatTime(selectedTime)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate('CustomerInfo' as never)}
          >
            <Text style={styles.nextButtonText}>{t('common.next')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  timeSlotsContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  loader: {
    marginTop: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: '30%',
    padding: 15,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#4A90E2',
  },
  timeText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  selectedTimeText: {
    color: '#FFFFFF',
  },
  noSlotsText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 16,
    marginTop: 20,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectionSummary: {
    marginBottom: 15,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DateTimeSelectionScreen;