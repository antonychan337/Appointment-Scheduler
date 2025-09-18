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
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setDashboardPeriod } from '../../store/uiSlice';
import { appointmentsAPI, servicesAPI } from '../../services/api';

interface DashboardMetrics {
  customersServed: { [key: string]: number };
  totalCustomers: number;
  bookingRate: number;
  availableRate: number;
  totalEarnings: number;
}

const DashboardScreen = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const language = useSelector((state: RootState) => state.ui.language);
  const dashboardPeriod = useSelector((state: RootState) => state.ui.dashboardPeriod);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    customersServed: {},
    totalCustomers: 0,
    bookingRate: 0,
    availableRate: 0,
    totalEarnings: 0,
  });
  const [services, setServices] = useState<any[]>([]);
  const [ownerId] = useState('demo-owner-id'); // For demo purposes

  useEffect(() => {
    fetchDashboardData();
  }, [dashboardPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      let startDate = new Date();

      if (dashboardPeriod === 'week') {
        startDate.setDate(today.getDate() - 7);
      } else {
        startDate.setHours(0, 0, 0, 0);
      }

      const [appointmentsRes, servicesRes] = await Promise.all([
        appointmentsAPI.getOwnerAppointments(ownerId, {
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
        }),
        servicesAPI.getServicesByOwner(ownerId),
      ]);

      const appointments = appointmentsRes.data;
      const servicesData = servicesRes.data;
      setServices(servicesData);

      // Calculate metrics
      const serviceCount: { [key: string]: number } = {};
      let totalEarnings = 0;

      appointments.forEach((apt: any) => {
        if (apt.status === 'confirmed' || apt.status === 'completed') {
          serviceCount[apt.serviceId] = (serviceCount[apt.serviceId] || 0) + 1;
          totalEarnings += apt.totalPrice;
        }
      });

      const totalSlots = dashboardPeriod === 'week' ? 7 * 8 * 4 : 8 * 4; // 8 hours, 15-min slots
      const bookedSlots = appointments.length;
      const bookingRate = (bookedSlots / totalSlots) * 100;

      setMetrics({
        customersServed: serviceCount,
        totalCustomers: appointments.length,
        bookingRate: Math.round(bookingRate),
        availableRate: Math.round(100 - bookingRate),
        totalEarnings,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePeriod = () => {
    dispatch(setDashboardPeriod(dashboardPeriod === 'day' ? 'week' : 'day'));
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return 'Unknown';
    return language === 'zh' ? service.nameZh : service.nameEn;
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
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>{t('owner.dashboard.title')}</Text>
          <TouchableOpacity style={styles.periodToggle} onPress={togglePeriod}>
            <Text style={styles.periodToggleText}>
              {dashboardPeriod === 'day' ? t('common.day') : t('common.week')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.totalCustomers}</Text>
            <Text style={styles.metricLabel}>{t('owner.dashboard.customersServed')}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.bookingRate}%</Text>
            <Text style={styles.metricLabel}>{t('owner.dashboard.bookingRate')}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.availableRate}%</Text>
            <Text style={styles.metricLabel}>{t('owner.dashboard.availableTime')}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>¥{metrics.totalEarnings}</Text>
            <Text style={styles.metricLabel}>{t('owner.dashboard.totalEarnings')}</Text>
          </View>
        </View>

        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>{t('owner.dashboard.customersServed')}</Text>
          {services.map(service => {
            const count = metrics.customersServed[service.id] || 0;
            const name = language === 'zh' ? service.nameZh : service.nameEn;

            return (
              <View key={service.id} style={styles.serviceRow}>
                <Text style={styles.serviceName}>{name}</Text>
                <View style={styles.serviceMetrics}>
                  <Text style={styles.serviceCount}>{count}</Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min((count / metrics.totalCustomers) * 100 || 0, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{t('owner.calendar.title')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{t('owner.services.title')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  periodToggle: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  periodToggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: '1%',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  servicesSection: {
    backgroundColor: '#FFFFFF',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  serviceName: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  serviceMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginRight: 10,
    minWidth: 30,
    textAlign: 'right',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DashboardScreen;