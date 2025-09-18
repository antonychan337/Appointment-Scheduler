import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './src/store';
import { setLanguage, toggleView } from './src/store/uiSlice';
import { toggleServiceSelection } from './src/store/servicesSlice';
import './src/locales/i18n';
import { useTranslation } from 'react-i18next';

// Mock services data
const mockServices = [
  { id: '1', nameEn: "Men's Cut", nameZh: '男士理发', durationMinutes: 30, activeTimeMinutes: 30, price: 25, isDefault: true },
  { id: '2', nameEn: "Women's Cut", nameZh: '女士理发', durationMinutes: 45, activeTimeMinutes: 45, price: 35, isDefault: true },
  { id: '3', nameEn: "Children's Cut", nameZh: '儿童理发', durationMinutes: 20, activeTimeMinutes: 20, price: 15, isDefault: true },
  { id: '4', nameEn: 'Hair Coloring', nameZh: '染发', durationMinutes: 90, activeTimeMinutes: 30, price: 80, isDefault: true },
  { id: '5', nameEn: 'Highlights', nameZh: '挑染', durationMinutes: 120, activeTimeMinutes: 40, price: 120, isDefault: true },
];

const mockAppointments = [
  { id: '1', customerName: '张先生', service: "Men's Cut", time: '09:00', price: 25 },
  { id: '2', customerName: '李女士', service: 'Hair Coloring', time: '10:00', price: 80 },
  { id: '3', customerName: '王小朋友', service: "Children's Cut", time: '14:00', price: 15 },
];

const HeaderRight = () => {
  const dispatch = useDispatch();
  const language = useSelector((state: RootState) => state.ui.language);
  const isOwnerView = useSelector((state: RootState) => state.ui.isOwnerView);

  return (
    <View style={styles.headerRight}>
      <TouchableOpacity
        onPress={() => dispatch(setLanguage(language === 'zh' ? 'en' : 'zh'))}
        style={styles.headerButton}
      >
        <Text style={styles.headerButtonText}>
          {language === 'zh' ? 'EN' : '中文'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => dispatch(toggleView())}
        style={styles.headerButton}
      >
        <Text style={styles.headerButtonText}>
          {isOwnerView ? '👤' : '💼'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const CustomerView = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const language = useSelector((state: RootState) => state.ui.language);
  const selectedServices = useSelector((state: RootState) => state.services.selectedServices);
  const [currentScreen, setCurrentScreen] = useState('services');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });

  const getTotalPrice = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = mockServices.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const renderServiceSelection = () => (
    <View>
      <Text style={styles.title}>{t('customer.booking.selectService')}</Text>
      {mockServices.map(service => {
        const isSelected = selectedServices.includes(service.id);
        const name = language === 'zh' ? service.nameZh : service.nameEn;

        return (
          <TouchableOpacity
            key={service.id}
            style={[styles.serviceCard, isSelected && styles.selectedCard]}
            onPress={() => dispatch(toggleServiceSelection(service.id))}
          >
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceName, isSelected && styles.selectedText]}>
                {name}
              </Text>
              <Text style={[styles.serviceDetails, isSelected && styles.selectedText]}>
                {service.durationMinutes} {t('common.minutes')} • ¥{service.price}
              </Text>
              {service.activeTimeMinutes < service.durationMinutes && (
                <Text style={styles.activeTimeText}>
                  {language === 'zh' ? `需在场时间: ${service.activeTimeMinutes}分钟` :
                   `Active time: ${service.activeTimeMinutes} minutes`}
                </Text>
              )}
            </View>
            <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        );
      })}

      {selectedServices.length > 0 && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setCurrentScreen('datetime')}
        >
          <Text style={styles.nextButtonText}>
            {t('common.next')} - ¥{getTotalPrice()}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDateTimeSelection = () => (
    <View>
      <Text style={styles.title}>{t('customer.booking.selectDate')}</Text>

      <Text style={styles.subtitle}>{t('customer.booking.selectDate')}</Text>
      <TextInput
        style={styles.input}
        placeholder="2024-01-20"
        value={selectedDate}
        onChangeText={setSelectedDate}
      />

      <Text style={styles.subtitle}>{t('customer.booking.selectTime')}</Text>
      <View style={styles.timeGrid}>
        {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map(time => (
          <TouchableOpacity
            key={time}
            style={[styles.timeSlot, selectedTime === time && styles.selectedTimeSlot]}
            onPress={() => setSelectedTime(time)}
          >
            <Text style={[styles.timeText, selectedTime === time && styles.selectedTimeText]}>
              {time}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTime && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setCurrentScreen('info')}
        >
          <Text style={styles.nextButtonText}>{t('common.next')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCustomerInfo = () => (
    <View>
      <Text style={styles.title}>{t('customer.booking.yourInfo')}</Text>

      <Text style={styles.subtitle}>{t('customer.booking.name')}</Text>
      <TextInput
        style={styles.input}
        value={customerInfo.name}
        onChangeText={(text) => setCustomerInfo({...customerInfo, name: text})}
      />

      <Text style={styles.subtitle}>{t('customer.booking.phone')}</Text>
      <TextInput
        style={styles.input}
        value={customerInfo.phone}
        onChangeText={(text) => setCustomerInfo({...customerInfo, phone: text})}
      />

      <Text style={styles.subtitle}>{t('customer.booking.email')}</Text>
      <TextInput
        style={styles.input}
        value={customerInfo.email}
        onChangeText={(text) => setCustomerInfo({...customerInfo, email: text})}
      />

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setCurrentScreen('confirmation')}
      >
        <Text style={styles.nextButtonText}>{t('customer.booking.confirmBooking')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfirmation = () => (
    <View style={styles.confirmationContainer}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.title}>{t('customer.booking.bookingConfirmed')}</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{t('customer.summary.title')}</Text>

        {selectedServices.map(serviceId => {
          const service = mockServices.find(s => s.id === serviceId);
          if (!service) return null;
          const name = language === 'zh' ? service.nameZh : service.nameEn;
          return (
            <Text key={serviceId} style={styles.summaryItem}>• {name}</Text>
          );
        })}

        <Text style={styles.summaryItem}>{t('customer.summary.dateTime')}: {selectedDate} {selectedTime}</Text>
        <Text style={styles.summaryItem}>{t('customer.summary.totalPrice')}: ¥{getTotalPrice()}</Text>
      </View>

      <Text style={styles.noticeText}>
        {t('customer.booking.cancellationNotice', { hours: 24 })}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {currentScreen === 'services' && renderServiceSelection()}
      {currentScreen === 'datetime' && renderDateTimeSelection()}
      {currentScreen === 'info' && renderCustomerInfo()}
      {currentScreen === 'confirmation' && renderConfirmation()}
    </ScrollView>
  );
};

const OwnerView = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderDashboard = () => (
    <View>
      <Text style={styles.title}>{t('owner.dashboard.title')}</Text>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>12</Text>
          <Text style={styles.metricLabel}>{t('owner.dashboard.customersServed')}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>75%</Text>
          <Text style={styles.metricLabel}>{t('owner.dashboard.bookingRate')}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>25%</Text>
          <Text style={styles.metricLabel}>{t('owner.dashboard.availableTime')}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>¥580</Text>
          <Text style={styles.metricLabel}>{t('owner.dashboard.totalEarnings')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('owner.dashboard.todayAppointments')}</Text>
      {mockAppointments.map(apt => (
        <View key={apt.id} style={styles.appointmentCard}>
          <Text style={styles.appointmentTime}>{apt.time}</Text>
          <View style={styles.appointmentDetails}>
            <Text style={styles.appointmentCustomer}>{apt.customerName}</Text>
            <Text style={styles.appointmentService}>{apt.service} - ¥{apt.price}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderCalendar = () => (
    <View>
      <Text style={styles.title}>{t('owner.calendar.title')}</Text>

      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.currentDate}>2024-01-20</Text>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'].map(time => {
        const appointment = mockAppointments.find(apt => apt.time === time);
        return (
          <View key={time} style={styles.timeSlotRow}>
            <Text style={styles.timeLabel}>{time}</Text>
            {appointment ? (
              <View style={styles.appointmentBlock}>
                <Text style={styles.appointmentCustomer}>{appointment.customerName}</Text>
                <Text style={styles.appointmentService}>{appointment.service}</Text>
              </View>
            ) : (
              <View style={styles.emptySlot} />
            )}
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'calendar' && renderCalendar()}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.navIcon, activeTab === 'dashboard' && styles.activeNav]}>📊</Text>
          <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.activeNav]}>
            {t('owner.dashboard.title')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.navIcon, activeTab === 'calendar' && styles.activeNav]}>📅</Text>
          <Text style={[styles.navLabel, activeTab === 'calendar' && styles.activeNav]}>
            {t('owner.calendar.title')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AppContent = () => {
  const { i18n } = useTranslation();
  const language = useSelector((state: RootState) => state.ui.language);
  const isOwnerView = useSelector((state: RootState) => state.ui.isOwnerView);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isOwnerView ? '💼 Owner' : '👤 Customer'}
        </Text>
        <HeaderRight />
      </View>
      {isOwnerView ? <OwnerView /> : <CustomerView />}
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 15,
    marginBottom: 10,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCard: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },
  serviceDetails: {
    fontSize: 14,
    color: '#666666',
  },
  activeTimeText: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 3,
  },
  selectedText: {
    color: '#4A90E2',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
    fontSize: 16,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  timeSlot: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  timeText: {
    fontSize: 16,
    color: '#333333',
  },
  selectedTimeText: {
    color: '#FFFFFF',
  },
  confirmationContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333',
  },
  summaryItem: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 20,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  appointmentTime: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: 'bold',
    marginRight: 15,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  appointmentService: {
    fontSize: 14,
    color: '#666666',
    marginTop: 3,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 24,
    color: '#999999',
  },
  navLabel: {
    fontSize: 12,
    color: '#999999',
    marginTop: 3,
  },
  activeNav: {
    color: '#4A90E2',
  },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  timeSlotRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    height: 60,
    alignItems: 'center',
  },
  timeLabel: {
    width: 60,
    fontSize: 14,
    color: '#666666',
    paddingLeft: 10,
  },
  appointmentBlock: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    padding: 10,
    marginLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  emptySlot: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    marginLeft: 10,
  },
});

export default App;