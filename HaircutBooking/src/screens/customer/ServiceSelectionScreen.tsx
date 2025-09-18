import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../../store';
import { toggleServiceSelection, setServices, setLoading } from '../../store/servicesSlice';
import { servicesAPI } from '../../services/api';

const ServiceSelectionScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const language = useSelector((state: RootState) => state.ui.language);
  const { services, selectedServices, loading } = useSelector(
    (state: RootState) => state.services
  );

  const [ownerId] = useState('demo-owner-id'); // For demo purposes

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    dispatch(setLoading(true));
    try {
      const response = await servicesAPI.getServicesByOwner(ownerId);
      dispatch(setServices(response.data));
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    dispatch(toggleServiceSelection(serviceId));
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.durationMinutes || 0);
    }, 0);
  };

  const renderService = ({ item }: any) => {
    const isSelected = selectedServices.includes(item.id);
    const name = language === 'zh' ? item.nameZh : item.nameEn;

    return (
      <TouchableOpacity
        style={[styles.serviceCard, isSelected && styles.selectedCard]}
        onPress={() => handleServiceToggle(item.id)}
      >
        <View style={styles.serviceInfo}>
          <Text style={[styles.serviceName, isSelected && styles.selectedText]}>
            {name}
          </Text>
          <Text style={[styles.serviceDetails, isSelected && styles.selectedText]}>
            {item.durationMinutes} {t('common.minutes')} • ¥{item.price}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
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
        <Text style={styles.title}>{t('customer.booking.selectService')}</Text>
      </View>

      <FlatList
        data={services}
        renderItem={renderService}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />

      {selectedServices.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {t('common.duration')}: {getTotalDuration()} {t('common.minutes')}
            </Text>
            <Text style={styles.summaryText}>
              {t('common.price')}: ¥{getTotalPrice()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate('DateTimeSelection' as never)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  list: {
    padding: 15,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
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

export default ServiceSelectionScreen;