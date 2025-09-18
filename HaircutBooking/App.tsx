import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider, useSelector } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { store, RootState } from './src/store';
import { setLanguage, toggleView } from './src/store/uiSlice';
import './src/locales/i18n';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

// Customer Screens
import ServiceSelectionScreen from './src/screens/customer/ServiceSelectionScreen';
import DateTimeSelectionScreen from './src/screens/customer/DateTimeSelectionScreen';

// Owner Screens
import DashboardScreen from './src/screens/owner/DashboardScreen';
import CalendarScreen from './src/screens/owner/CalendarScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const HeaderRight = () => {
  const dispatch = useDispatch();
  const language = useSelector((state: RootState) => state.ui.language);
  const isOwnerView = useSelector((state: RootState) => state.ui.isOwnerView);

  return (
    <View style={{ flexDirection: 'row', marginRight: 10 }}>
      <TouchableOpacity
        onPress={() => dispatch(setLanguage(language === 'zh' ? 'en' : 'zh'))}
        style={{ marginRight: 15, padding: 5 }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
          {language === 'zh' ? 'EN' : '中文'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => dispatch(toggleView())}
        style={{ padding: 5 }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
          {isOwnerView ? '👤' : '💼'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const CustomerStack = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4A90E2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <HeaderRight />,
      }}
    >
      <Stack.Screen
        name="ServiceSelection"
        component={ServiceSelectionScreen}
        options={{ title: t('customer.booking.title') }}
      />
      <Stack.Screen
        name="DateTimeSelection"
        component={DateTimeSelectionScreen}
        options={{ title: t('customer.booking.selectDate') }}
      />
    </Stack.Navigator>
  );
};

const OwnerTabs = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E0E0',
        },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#999999',
        headerStyle: {
          backgroundColor: '#4A90E2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t('owner.dashboard.title'),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: t('owner.calendar.title'),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📅</Text>
          ),
        }}
      />
    </Tab.Navigator>
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
    <>
      <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />
      <NavigationContainer>
        {isOwnerView ? <OwnerTabs /> : <CustomerStack />}
      </NavigationContainer>
    </>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;