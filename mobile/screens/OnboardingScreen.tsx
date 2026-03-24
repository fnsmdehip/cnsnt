/**
 * Onboarding Flow - 6 steps:
 * 1. Welcome - "Your consent records, encrypted and secure"
 * 2. Biometric setup (Face ID / Touch ID enrollment)
 * 3. PIN backup setup
 * 4. First template demo
 * 5. Value moment - PDF export with verification hash
 * 6. Paywall - Free vs Pro
 *
 * Animated page transitions, progress dots, haptic feedback.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import authService from '../services/auth';
import { Colors, Typography, Spacing, BorderRadius, Shadows, MIN_TOUCH_SIZE, PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 6;

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [biometricName, setBiometricName] = useState('Face ID');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSet, setPinSet] = useState(false);
  const [biometricSet, setBiometricSet] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    (async () => {
      const support = await authService.checkBiometricSupport();
      setHasBiometrics(support.available);
      if (support.available) {
        const name = await authService.getBiometricTypeName();
        setBiometricName(name);
      }
    })();
  }, []);

  const animateTransition = useCallback(
    (nextStep: number) => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep(nextStep);
        slideAnim.setValue(30);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 20,
            stiffness: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim]
  );

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      animateTransition(step + 1);
    } else {
      onComplete();
    }
  }, [step, animateTransition, onComplete]);

  const handleSkip = useCallback(() => {
    if (step < 3) {
      // Can't skip security setup
      animateTransition(step + 1);
    } else {
      onComplete();
    }
  }, [step, animateTransition, onComplete]);

  const handleBiometricSetup = async () => {
    try {
      await authService.setBiometricEnabled(true);
      const success = await authService.authenticateWithBiometrics();
      if (success) {
        setBiometricSet(true);
        setTimeout(() => handleNext(), 500);
      }
    } catch (_e) {
      Alert.alert('Setup Failed', 'Biometric setup failed. You can enable it later in Settings.');
      handleNext();
    }
  };

  const handlePinSetup = async () => {
    setPinError('');
    if (pin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (pin !== pinConfirm) {
      setPinError('PINs do not match');
      return;
    }
    try {
      await authService.setPin(pin);
      setPinSet(true);
      setTimeout(() => handleNext(), 500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to set PIN';
      setPinError(msg);
    }
  };

  const renderProgressDots = () => (
    <View style={styles.dotsContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === step && styles.dotActive,
            i < step && styles.dotCompleted,
          ]}
        />
      ))}
    </View>
  );

  // Step 0: Welcome
  const renderWelcome = () => (
    <View style={styles.stepContent}>
      <View style={styles.heroIconContainer}>
        <View style={styles.heroIconOuter}>
          <View style={styles.heroIconInner}>
            <Text style={styles.heroIcon}>{'\u{1F6E1}'}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.heroTitle}>Your consent records,{'\n'}encrypted and secure</Text>
      <Text style={styles.heroSubtitle}>
        Professional consent management with military-grade encryption.
        Every record is protected on your device.
      </Text>
      <View style={styles.featureGrid}>
        {[
          { icon: '\u{1F512}', label: 'AES-256 Encryption' },
          { icon: '\u{1F4DD}', label: '8 Legal Templates' },
          { icon: '\u{270D}\uFE0F', label: 'Dual Signatures' },
          { icon: '\u{1F4C4}', label: 'PDF Export + Hash' },
        ].map((f, i) => (
          <View key={i} style={styles.featureItem}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Step 1: Biometric
  const renderBiometric = () => (
    <View style={styles.stepContent}>
      <View style={styles.heroIconContainer}>
        <View style={[styles.heroIconOuter, { backgroundColor: Colors.successLight }]}>
          <Text style={styles.biometricEmoji}>
            {biometricName === 'Face ID' ? '\u{1F9D1}' : '\u{1F91A}'}
          </Text>
        </View>
      </View>
      <Text style={styles.stepTitle}>Secure with {biometricName}</Text>
      <Text style={styles.stepSubtitle}>
        {hasBiometrics
          ? `Use ${biometricName} to quickly and securely unlock your consent vault.`
          : 'Your device does not support biometric authentication. You can set up a PIN instead.'}
      </Text>
      {biometricSet && (
        <View style={styles.successBadge}>
          <Text style={styles.successBadgeText}>{'\u2713'} {biometricName} Enabled</Text>
        </View>
      )}
      {hasBiometrics && !biometricSet && (
        <Pressable style={styles.setupButton} onPress={handleBiometricSetup}>
          <Text style={styles.setupButtonText}>Enable {biometricName}</Text>
        </Pressable>
      )}
      {!hasBiometrics && (
        <View style={styles.infoCard}>
          <Text style={styles.infoCardText}>
            No biometrics detected. Skip to set up PIN backup.
          </Text>
        </View>
      )}
    </View>
  );

  // Step 2: PIN
  const renderPinSetup = () => (
    <View style={styles.stepContent}>
      <View style={styles.heroIconContainer}>
        <View style={[styles.heroIconOuter, { backgroundColor: Colors.warningLight }]}>
          <Text style={styles.biometricEmoji}>{'\u{1F511}'}</Text>
        </View>
      </View>
      <Text style={styles.stepTitle}>Create a Backup PIN</Text>
      <Text style={styles.stepSubtitle}>
        Your PIN provides a fallback way to access your encrypted consent vault.
      </Text>
      {pinSet ? (
        <View style={styles.successBadge}>
          <Text style={styles.successBadgeText}>{'\u2713'} PIN Created</Text>
        </View>
      ) : (
        <View style={styles.pinContainer}>
          <TextInput
            style={styles.pinInput}
            secureTextEntry
            keyboardType="numeric"
            maxLength={8}
            placeholder="Enter PIN (4-8 digits)"
            placeholderTextColor={Colors.textTertiary}
            value={pin}
            onChangeText={setPin}
          />
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
          {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
          <Pressable style={styles.setupButton} onPress={handlePinSetup}>
            <Text style={styles.setupButtonText}>Set PIN</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  // Step 3: Template Demo
  const renderTemplateDemo = () => (
    <View style={styles.stepContent}>
      <View style={styles.heroIconContainer}>
        <View style={[styles.heroIconOuter, { backgroundColor: Colors.primaryLight }]}>
          <Text style={styles.biometricEmoji}>{'\u{1F4DD}'}</Text>
        </View>
      </View>
      <Text style={styles.stepTitle}>Professional Templates</Text>
      <Text style={styles.stepSubtitle}>
        Choose from 8 pre-built consent templates designed by legal professionals.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.templateCarousel}
      >
        {[
          { icon: '\u{1F3E5}', name: 'Medical', desc: 'Informed consent' },
          { icon: '\u{1F4F7}', name: 'Photo/Video', desc: 'Media release' },
          { icon: '\u{1F512}', name: 'NDA', desc: 'Confidentiality' },
          { icon: '\u{1F6E1}', name: 'GDPR', desc: 'Data processing' },
          { icon: '\u{1F52C}', name: 'Research', desc: 'Study consent' },
          { icon: '\u{1F3E0}', name: 'Property', desc: 'Entry auth' },
          { icon: '\u{26A0}', name: 'Waiver', desc: 'Liability' },
          { icon: '\u{1F91D}', name: 'Mutual Release', desc: 'Both parties' },
        ].map((t, i) => (
          <View key={i} style={styles.demoTemplateCard}>
            <Text style={styles.demoTemplateIcon}>{t.icon}</Text>
            <Text style={styles.demoTemplateName}>{t.name}</Text>
            <Text style={styles.demoTemplateDesc}>{t.desc}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // Step 4: Value Moment
  const renderValueMoment = () => (
    <View style={styles.stepContent}>
      <View style={styles.heroIconContainer}>
        <View style={[styles.heroIconOuter, { backgroundColor: Colors.successLight }]}>
          <Text style={styles.biometricEmoji}>{'\u{1F4C4}'}</Text>
        </View>
      </View>
      <Text style={styles.stepTitle}>Tamper-Proof PDF Export</Text>
      <Text style={styles.stepSubtitle}>
        Every consent record exports as a professional PDF with SHA-256 hash
        verification. If anyone modifies the document, the hash will not match.
      </Text>
      <View style={styles.hashDemo}>
        <View style={styles.hashDemoHeader}>
          <Text style={styles.hashDemoTitle}>Document Integrity</Text>
          <View style={styles.hashVerifiedBadge}>
            <Text style={styles.hashVerifiedText}>{'\u2713'} Verified</Text>
          </View>
        </View>
        <Text style={styles.hashDemoLabel}>SHA-256 Hash</Text>
        <Text style={styles.hashDemoValue}>
          a7f3b9c2e1d4f6a8...3c5e7d9f1b2a4c6
        </Text>
        <View style={styles.hashDemoDivider} />
        <View style={styles.hashDemoRow}>
          <Text style={styles.hashDemoRowLabel}>Signatures</Text>
          <Text style={styles.hashDemoRowValue}>{'\u2713'} 2 verified</Text>
        </View>
        <View style={styles.hashDemoRow}>
          <Text style={styles.hashDemoRowLabel}>Timestamp</Text>
          <Text style={styles.hashDemoRowValue}>Immutable</Text>
        </View>
      </View>
    </View>
  );

  // Step 5: Paywall
  const renderPaywall = () => (
    <View style={styles.stepContent}>
      <Text style={styles.paywallTitle}>Choose Your Plan</Text>
      <Text style={styles.paywallSubtitle}>
        Start free. Upgrade when you need more.
      </Text>

      {/* Free Plan */}
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>Free</Text>
          <Text style={styles.planPrice}>$0</Text>
        </View>
        <View style={styles.planFeatures}>
          {[
            '5 consent records',
            '3 free templates',
            'PDF export with hash',
            'Biometric + PIN lock',
          ].map((f, i) => (
            <Text key={i} style={styles.planFeature}>{'\u2713'}  {f}</Text>
          ))}
        </View>
      </View>

      {/* Pro Plan */}
      <View style={[styles.planCard, styles.planCardPro]}>
        <View style={styles.proBanner}>
          <Text style={styles.proBannerText}>RECOMMENDED</Text>
        </View>
        <View style={styles.planHeader}>
          <Text style={[styles.planName, styles.planNamePro]}>Pro</Text>
          <View style={styles.proPricing}>
            <Text style={styles.planPricePro}>{PRO_MONTHLY_PRICE}</Text>
            <Text style={styles.planPricePeriod}>/month</Text>
          </View>
          <Text style={styles.yearlyPrice}>or {PRO_YEARLY_PRICE}/year (save 33%)</Text>
        </View>
        <View style={styles.planFeatures}>
          {[
            'Unlimited consent records',
            'All 8 premium templates',
            'Audio recording',
            'Priority support',
            'PDF export with hash',
            'Biometric + PIN lock',
          ].map((f, i) => (
            <Text key={i} style={[styles.planFeature, styles.planFeaturePro]}>
              {'\u2713'}  {f}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );

  const steps = [
    renderWelcome,
    renderBiometric,
    renderPinSetup,
    renderTemplateDemo,
    renderValueMoment,
    renderPaywall,
  ];

  const getNextLabel = () => {
    switch (step) {
      case 0: return 'Get Started';
      case 1: return biometricSet ? 'Continue' : (hasBiometrics ? 'Skip for Now' : 'Continue');
      case 2: return pinSet ? 'Continue' : 'Skip';
      case 5: return 'Start Free';
      default: return 'Continue';
    }
  };

  const canProceed = () => {
    // PIN step requires PIN to be set if no biometrics
    if (step === 2 && !hasBiometrics && !pinSet) return false;
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderProgressDots()}

      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {steps[step]()}
        </ScrollView>
      </Animated.View>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={styles.nextButtonText}>{getNextLabel()}</Text>
        </Pressable>
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip All</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  dotCompleted: {
    backgroundColor: Colors.primaryMuted,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  heroIconContainer: {
    marginBottom: Spacing.xl,
  },
  heroIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconInner: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIcon: {
    fontSize: 40,
  },
  biometricEmoji: {
    fontSize: 52,
  },
  heroTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.xxl,
    maxWidth: 320,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    maxWidth: 320,
  },
  featureItem: {
    width: 140,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  featureLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  stepTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
    marginBottom: Spacing.xl,
  },
  setupButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    ...Shadows.md,
  },
  setupButtonText: {
    ...Typography.button,
    color: Colors.textInverse,
    textAlign: 'center',
  },
  successBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  successBadgeText: {
    ...Typography.body,
    color: Colors.success,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    maxWidth: 300,
  },
  infoCardText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  pinContainer: {
    width: '100%',
    maxWidth: 280,
    gap: Spacing.md,
  },
  pinInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 6,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
  },
  pinError: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: 'center',
  },
  templateCarousel: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  demoTemplateCard: {
    width: 120,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  demoTemplateIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  demoTemplateName: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  demoTemplateDesc: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  hashDemo: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  hashDemoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  hashDemoTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  hashVerifiedBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  hashVerifiedText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  hashDemoLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  hashDemoValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  hashDemoDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginBottom: Spacing.md,
  },
  hashDemoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  hashDemoRowLabel: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  hashDemoRowValue: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '500',
  },
  paywallTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  paywallSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  planCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planCardPro: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  proBanner: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  proBannerText: {
    ...Typography.caption,
    color: Colors.textInverse,
    fontWeight: '700',
    letterSpacing: 1,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  planName: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  planNamePro: {
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  planPrice: {
    ...Typography.heroNumber,
    color: Colors.textPrimary,
  },
  proPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPricePro: {
    ...Typography.heroNumber,
    color: Colors.primary,
  },
  planPricePeriod: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  yearlyPrice: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  planFeatures: {
    gap: Spacing.sm,
  },
  planFeature: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  planFeaturePro: {
    color: Colors.textPrimary,
  },
  bottomBar: {
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    ...Shadows.md,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    ...Typography.button,
    color: Colors.textInverse,
  },
  skipButton: {
    marginTop: Spacing.md,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
  },
  skipButtonText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
});

export default OnboardingScreen;
