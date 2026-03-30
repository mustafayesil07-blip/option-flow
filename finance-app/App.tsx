import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FinanceProvider } from './src/store/FinanceContext';
import TabNavigator from './src/navigation/TabNavigator';

const NAV_THEME = {
  dark: true,
  colors: {
    primary:      '#7C6FF7',
    background:   '#0A0A0F',
    card:         '#12121A',
    text:         '#FFFFFF',
    border:       '#252535',
    notification: '#FF3D71',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <NavigationContainer theme={NAV_THEME}>
          <TabNavigator />
          <StatusBar style="light" backgroundColor="#0A0A0F" />
        </NavigationContainer>
      </FinanceProvider>
    </SafeAreaProvider>
  );
}
