/**
 * Settings Screen for cnsnt app.
 *
 * - Biometric toggle
 * - Auto-lock timeout
 * - Export all data
 * - Delete all data (with confirmation)
 * - About / legal
 * - Subscription management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '../components/ErrorBoundary';
import authService from '../services/auth';
import db from '../services/database';
import exportService from '../services/export';
import purchaseService from '../services/purchases';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import type { Entitlement } from '../types';

interface SettingsProps {
  navigation: {
    navigate: (screen: string) => void;
  };
  onLock: () => void;
}

const AUTO_LOCK_OPTIONS = [1, 2, 5, 10, 15, 30];

const Settings: React.FC<SettingsProps> = ({ onLock }) => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricName, setBiometricName] = useState('Biometric');
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  const [entitlement, setEntitlement] = useState<Entitlement>('free');
  const [recordCount, setRecordCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const state = await authService.getAuthState();
      setBiometricEnabled(state.biometricEnabled);
      setHasBiometrics(state.hasBiometrics);
      setAutoLockMinutes(state.autoLockMinutes);

      if (state.hasBiometrics) {
        const name = await authService.getBiometricTypeName();
        setBiometricName(name);
      }

      const purchaseState = await purchaseService.getPurchaseState();
      setEntitlement(purchaseState.entitlement);
      setRecordCount(purchaseState.recordCount);
    } catch (_error) {
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const success = await authService.authenticateWithBiometrics();
      if (!success) {
        Alert.alert(
          'Authentication Required',
          `Please verify with ${biometricName} to enable it.`
        );
        return;
      }
    }
    await authService.setBiometricEnabled(value);
    setBiometricEnabled(value);
  };

  const handleAutoLockChange = async (minutes: number) => {
    await authService.setAutoLockTimeout(minutes);
    setAutoLockMinutes(minutes);
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const records = await db.getAllRecords();
      if (records.length === 0) {
        Alert.alert('No Data', 'There are no consent records to export.');
        return;
      }
      const uri = await exportService.exportAllAsJson(records);
      await exportService.shareFile(uri);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export data.';
      Alert.alert('Export Error', message);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all consent records, encryption keys, and authentication data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? All data will be permanently destroyed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete All',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await db.deleteAllRecords();
                      await authService.resetAll();
                      Alert.alert('Deleted', 'All data has been removed.', [
                        {
                          text: 'OK',
                          onPress: () => onLock(),
                        },
                      ]);
                    } catch (error: unknown) {
                      const message = error instanceof Error ? error.message : 'Failed to delete data.';
                      Alert.alert('Error', message);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleLockNow = () => {
    authService.lock();
    onLock();
  };

  const handleUpgrade = async () => {
    const success = await purchaseService.purchasePro();
    if (success) {
      setEntitlement('pro');
      Alert.alert('Success', 'You are now a Pro subscriber!');
    } else {
      Alert.alert(
        'Upgrade',
        'Pro subscription requires a custom dev client build with RevenueCat SDK. The app currently operates in free mode.'
      );
    }
  };

  const handleRestorePurchases = async () => {
    const result = await purchaseService.restorePurchases();
    if (result === 'pro') {
      setEntitlement('pro');
      Alert.alert('Restored', 'Pro subscription restored.');
    } else {
      Alert.alert('No Purchase Found', 'No active Pro subscription was found.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Security */}
          <Text style={styles.sectionTitle}>Security</Text>

          {hasBiometrics && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>
                  {biometricName} Unlock
                </Text>
                <Text style={styles.settingDescription}>
                  Use {biometricName} to unlock the app
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{
                  false: Colors.border,
                  true: Colors.primaryLight,
                }}
                thumbColor={
                  biometricEnabled ? Colors.primary : Colors.surfaceElevated
                }
              />
            </View>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Lock Timeout</Text>
              <Text style={styles.settingDescription}>
                Lock the app after inactivity
              </Text>
            </View>
          </View>
          <View style={styles.optionsRow}>
            {AUTO_LOCK_OPTIONS.map((minutes) => (
              <Pressable
                key={minutes}
                style={[
                  styles.optionChip,
                  autoLockMinutes === minutes && styles.optionChipActive,
                ]}
                onPress={() => handleAutoLockChange(minutes)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    autoLockMinutes === minutes &&
                      styles.optionChipTextActive,
                  ]}
                >
                  {minutes}m
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.actionButton} onPress={handleLockNow}>
            <Text style={styles.actionButtonText}>
              {'\u{1F512}'} Lock Now
            </Text>
          </Pressable>

          {/* Subscription */}
          <Text style={styles.sectionTitle}>Subscription</Text>

          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionBadge}>
              <Text style={styles.subscriptionBadgeText}>
                {entitlement === 'pro' ? 'PRO' : 'FREE'}
              </Text>
            </View>
            <Text style={styles.subscriptionInfo}>
              {entitlement === 'pro'
                ? 'Unlimited records, recording, and all templates.'
                : `Free tier: ${recordCount}/5 records used.`}
            </Text>
            {entitlement === 'free' && (
              <Pressable
                style={styles.upgradeButton}
                onPress={handleUpgrade}
              >
                <Text style={styles.upgradeButtonText}>
                  Upgrade to Pro - $4.99/mo
                </Text>
              </Pressable>
            )}
            <Pressable onPress={handleRestorePurchases}>
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </Pressable>
          </View>

          {/* Data */}
          <Text style={styles.sectionTitle}>Data</Text>

          <Pressable
            style={styles.actionButton}
            onPress={handleExportAll}
            disabled={exporting}
          >
            <Text style={styles.actionButtonText}>
              {exporting
                ? 'Exporting...'
                : `\u{1F4E4} Export All Data (${recordCount} records)`}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.destructiveButton]}
            onPress={handleDeleteAll}
          >
            <Text style={styles.destructiveButtonText}>
              {'\u{1F5D1}'} Delete All Data
            </Text>
          </Pressable>

          {/* About */}
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>cnsnt</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDescription}>
              Secure consent management for professionals. All data is
              encrypted and stored locally on your device.
            </Text>
            <View style={styles.aboutDivider} />
            <Text style={styles.legalText}>
              This app is not a substitute for legal advice. Consult a
              qualified attorney for specific legal needs.
            </Text>
            <Text style={styles.legalText}>
              Privacy Policy | Terms of Service
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  settingDescription: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  optionChipText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  optionChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
  destructiveButton: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
  },
  destructiveButtonText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '500',
  },
  subscriptionCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  subscriptionBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    marginBottom: Spacing.md,
  },
  subscriptionBadgeText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subscriptionInfo: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  upgradeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  upgradeButtonText: {
    ...Typography.button,
    color: Colors.textInverse,
  },
  restoreText: {
    ...Typography.bodySmall,
    color: Colors.textLink,
  },
  aboutCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  aboutTitle: {
    ...Typography.h1,
    color: Colors.primary,
    letterSpacing: 2,
  },
  aboutVersion: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  aboutDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  aboutDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    alignSelf: 'stretch',
    marginVertical: Spacing.lg,
  },
  legalText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
});

export default Settings;
