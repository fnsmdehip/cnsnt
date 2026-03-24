/**
 * Lock Screen - handles biometric and PIN authentication.
 * Shown on app open and after auto-lock timeout.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import authService from '../services/auth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface LockScreenProps {
  onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pinIsSet, setPinIsSet] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricName, setBiometricName] = useState('Biometric');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const checkAuthState = useCallback(async () => {
    setLoading(true);
    try {
      const state = await authService.getAuthState();
      setPinIsSet(state.pinIsSet);
      setHasBiometrics(state.hasBiometrics);
      setBiometricEnabled(state.biometricEnabled);

      if (state.hasBiometrics) {
        const name = await authService.getBiometricTypeName();
        setBiometricName(name);
      }

      if (state.biometricEnabled && state.pinIsSet) {
        const success = await authService.authenticateWithBiometrics();
        if (success) {
          onUnlock();
          return;
        }
      }
    } catch (_e) {
      Alert.alert('Error', 'Authentication check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onUnlock]);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  const handleSetPin = async () => {
    setError('');
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (pin !== pinConfirm) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.setPin(pin);
      onUnlock();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to set PIN';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterPin = async () => {
    setError('');
    if (!pin) {
      setError('Please enter your PIN');
      return;
    }

    setLoading(true);
    try {
      const success = await authService.authenticateWithPin(pin);
      if (success) {
        onUnlock();
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setError('');
    setLoading(true);
    try {
      const success = await authService.authenticateWithBiometrics();
      if (success) {
        onUnlock();
      } else {
        setError(`${biometricName} authentication failed. Use PIN instead.`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Biometric auth failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Authenticating...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.lockIcon}>{'\u{1F512}'}</Text>
        <Text style={styles.appName}>cnsnt</Text>
        <Text style={styles.subtitle}>
          {pinIsSet ? 'Enter your PIN to unlock' : 'Create a PIN to get started'}
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.pinInput}
            secureTextEntry
            keyboardType="numeric"
            maxLength={8}
            placeholder="Enter PIN"
            placeholderTextColor={Colors.textTertiary}
            value={pin}
            onChangeText={setPin}
            autoFocus
          />

          {!pinIsSet && (
            <TextInput
              style={styles.pinInput}
              secureTextEntry
              keyboardType="numeric"
              maxLength={8}
              placeholder="Confirm PIN"
              placeholderTextColor={Colors.textTertiary}
              value={pinConfirm}
              onChangeText={setPinConfirm}
            />
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.primaryButton}
          onPress={pinIsSet ? handleEnterPin : handleSetPin}
        >
          <Text style={styles.primaryButtonText}>
            {pinIsSet ? 'Unlock' : 'Set PIN'}
          </Text>
        </Pressable>

        {pinIsSet && biometricEnabled && hasBiometrics && (
          <Pressable style={styles.biometricButton} onPress={handleBiometric}>
            <Text style={styles.biometricButtonText}>
              Use {biometricName}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.footer}>
        Your data is encrypted and stored locally on this device.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  lockIcon: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  appName: {
    ...Typography.h1,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    letterSpacing: 2,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 280,
    marginBottom: Spacing.lg,
  },
  pinInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
  },
  error: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    minWidth: 200,
    alignItems: 'center',
    ...Shadows.md,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.textInverse,
  },
  biometricButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    minWidth: 200,
    alignItems: 'center',
  },
  biometricButtonText: {
    ...Typography.button,
    color: Colors.primary,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  footer: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
});

export default LockScreen;
