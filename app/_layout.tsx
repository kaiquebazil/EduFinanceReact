import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '../src/store/AppContext';
import LockScreen from './lock';

SplashScreen.preventAutoHideAsync().catch(() => {});

function InnerLayout() {
  const { isLoading, isLocked, theme } = useApp();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLocked) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LockScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={theme?.isDark ? 'light-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme?.colors?.background ?? '#f0f4fa' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="tabs" />
        <Stack.Screen name="add-transaction" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="month-picker" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="search" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="edit-transaction" />
        <Stack.Screen name="all-transactions" />
        <Stack.Screen name="category-detail" />
        <Stack.Screen name="credit-cards" />
        <Stack.Screen name="card-detail" />
        <Stack.Screen name="card-invoice" />
        <Stack.Screen name="installments" />
        <Stack.Screen name="invoices" />
        <Stack.Screen name="recurring" />
        <Stack.Screen name="categories-manage" />
        <Stack.Screen name="themes" />
        <Stack.Screen name="font-size" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="balance-display" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="lock" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <InnerLayout />
      </AppProvider>
    </SafeAreaProvider>
  );
}
