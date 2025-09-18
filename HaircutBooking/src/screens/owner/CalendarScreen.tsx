import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { appointmentsAPI } from '../../services/api';

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  customer: { name: string; phone: string };
  service: { nameZh: string; nameEn: string; price: number };
  status: string;
}

const CalendarScreen = () => {
  const { t } = useTranslation();
  const language = useSelector((state: RootState) => state.ui.language);
  const calendarView = useSelector((state: RootState) => state.ui.calendarView);

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [ownerId] = useState('demo-owner-id'); // For demo purposes

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await appointmentsAPI.getOwnerAppointments(ownerId, {
        date: selectedDate.toISOString().split('T')[0],
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const getAppointmentForSlot = (time: string) => {
    const slotDate = new Date(selectedDate);
    const [hour, minute] = time.split(':').map(Number);
    slotDate.setHours(hour, minute, 0, 0);

    return appointments.find(apt => {
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      return slotDate >= aptStart && slotDate < aptEnd;
    });
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setModalVisible(true);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      await appointmentsAPI.cancelAppointment(selectedAppointment.id);
      setModalVisible(false);
      fetchAppointments();
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
    }
  };

  const renderTimeSlot = (time: string) => {
    const appointment = getAppointmentForSlot(time);

    return (
      <View key={time} style={styles.timeSlotRow}>
        <Text style={styles.timeLabel}>{time}</Text>
        {appointment ? (
          <TouchableOpacity
            style={styles.appointmentBlock}
            onPress={() => handleAppointmentPress(appointment)}
          >
            <Text style={styles.appointmentCustomer}>
              {appointment.customer.name}
            </Text>
            <Text style={styles.appointmentService}>
              {language === 'zh' ? appointment.service.nameZh : appointment.service.nameEn}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptySlot} />
        )}
      </View>
    );
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('owner.calendar.title')}</Text>
        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.navButton}>
            <Text style={styles.navButtonText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.currentDate}>
            {selectedDate.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
          </Text>
          <TouchableOpacity onPress={() => navigateDate(1)} style={styles.navButton}>
            <Text style={styles.navButtonText}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.calendarContainer}>
        {getTimeSlots().map(renderTimeSlot)}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('owner.calendar.appointmentDetails')}</Text>

            {selectedAppointment && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('customer.booking.name')}:</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.customer.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('customer.booking.phone')}:</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.customer.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('customer.summary.service')}:</Text>
                  <Text style={styles.detailValue}>
                    {language === 'zh'
                      ? selectedAppointment.service.nameZh
                      : selectedAppointment.service.nameEn}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('common.price')}:</Text>
                  <Text style={styles.detailValue}>¥{selectedAppointment.service.price}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('customer.summary.dateTime')}:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedAppointment.startTime).toLocaleString(
                      language === 'zh' ? 'zh-CN' : 'en-US'
                    )}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelAppointment}
              >
                <Text style={styles.cancelButtonText}>
                  {t('owner.calendar.cancelAppointment')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>{t('common.back')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButton: {
    padding: 10,
  },
  navButtonText: {
    fontSize: 20,
    color: '#4A90E2',
  },
  currentDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginHorizontal: 20,
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  timeSlotRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    height: 60,
  },
  timeLabel: {
    width: 60,
    padding: 10,
    fontSize: 14,
    color: '#666666',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  emptySlot: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  appointmentBlock: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    padding: 10,
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  appointmentCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  appointmentService: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    flex: 2,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FF5252',
  },
  closeButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default CalendarScreen;