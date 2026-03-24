/**
 * cnsnt - Secure Consent Management App
 *
 * Root component handling:
 * - Authentication gate (biometric + PIN)
 * - Auto-lock on inactivity
 * - Tab + Stack navigation
 * - Error boundaries on all screens
 * - RevenueCat initialization
 */

import React, { useState, useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View, StyleSheet } from 'react-native';

import ErrorBoundary from './components/ErrorBoundary';
import LockScreen from './screens/LockScreen';
import {
  HomeScreen,
  Dashboard,
  Settings,
  RecordingScreen,
  ConsentBuilderScreen,
  NdaScreen,
  WaiverScreen,
  MutualReleaseScreen,
  SexualConsentScreen,
  TemplateForm,
} from './screens';
import { useAppState } from './hooks/useAppState';
import purchaseService from './services/purchases';
import vault from './services/encryption';
import { Colors, Typography } from './constants/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Forms: '\u{1F4DD}',
    Records: '\u{1F4CB}',
    Settings: '\u{2699}\uFE0F',
  };
  return (
    <View style={tabStyles.iconContainer}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconFocused]}>
        {icons[label] || '\u{2022}'}
      </Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  iconFocused: {
    fontSize: 24,
  },
});

function MainTabs({ onLock }: { onLock: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.divider,
        },
        tabBarLabelStyle: {
          ...Typography.caption,
          fontWeight: '500' as const,
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          ...Typography.h3,
          color: Colors.textPrimary,
        },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen
        name="Forms"
        component={HomeScreen}
        options={{ title: 'Forms' }}
      />
      <Tab.Screen
        name="Records"
        component={Dashboard}
        options={{ title: 'Records' }}
      />
      <Tab.Screen name="Settings">
        {(props) => <Settings {...props} onLock={onLock} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLocked, setIsLocked] = useState(true);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const handleLock = useCallback(() => {
    setIsLocked(true);
  }, []);

  useAppState({
    onLock: handleLock,
    enabled: !isLocked,
  });

  useEffect(() => {
    vault.onAutoLock(() => {
      handleLock();
    });
  }, [handleLock]);

  useEffect(() => {
    purchaseService.initialize();
  }, []);

  if (isLocked) {
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <LockScreen onUnlock={handleUnlock} />
          <StatusBar style="dark" />
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: Colors.surface },
              headerTitleStyle: {
                ...Typography.h3,
                color: Colors.textPrimary,
              },
              headerShadowVisible: false,
              headerTintColor: Colors.primary,
            }}
          >
            <Stack.Screen
              name="Main"
              options={{ headerShown: false }}
            >
              {() => <MainTabs onLock={handleLock} />}
            </Stack.Screen>
            <Stack.Screen
              name="ConsentBuilder"
              component={ConsentBuilderScreen}
              options={({ route }) => ({
                title: route.params?.title || 'Consent Builder',
              })}
            />
            <Stack.Screen
              name="Recording"
              component={RecordingScreen}
              options={{ title: 'Audio Recording' }}
            />
            <Stack.Screen
              name="NDA"
              component={NdaScreen}
              options={{ title: 'Non-Disclosure Agreement' }}
            />
            <Stack.Screen
              name="SexualConsent"
              component={SexualConsentScreen}
              options={{ title: 'Sexual Consent Agreement' }}
            />
            <Stack.Screen
              name="Waiver"
              component={WaiverScreen}
              options={{ title: 'Liability Waiver' }}
            />
            <Stack.Screen
              name="MutualRelease"
              component={MutualReleaseScreen}
              options={{ title: 'Mutual Release of Claims' }}
            />
            <Stack.Screen
              name="TemplateForm"
              component={TemplateForm}
              options={{ title: 'New Consent Record' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
