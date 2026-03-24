/**
 * Animated Splash Screen
 * Fades in the app logo with a shield animation, then transitions out.
 * Uses Animated API for smooth 60fps performance.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors, Typography } from '../constants/theme';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shieldRotate = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Phase 1: Logo appears with scale spring
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          damping: 12,
          stiffness: 100,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Shield pulse
      Animated.sequence([
        Animated.timing(shieldRotate, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(shieldRotate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // Phase 3: Tagline slides up
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      // Phase 4: Hold, then fade out
      Animated.delay(600),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  }, [
    logoScale,
    logoOpacity,
    shieldRotate,
    taglineOpacity,
    taglineTranslateY,
    containerOpacity,
    onComplete,
  ]);

  const shieldRotation = shieldRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-10deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { rotate: shieldRotation },
              ],
            },
          ]}
        >
          <View style={styles.shieldOuter}>
            <View style={styles.shieldInner}>
              <Text style={styles.shieldIcon}>{'\u{1F6E1}'}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Text style={styles.appName}>cnsnt</Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          }}
        >
          <Text style={styles.tagline}>Encrypted Consent Management</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.securityBadge}>
          <Text style={styles.securityIcon}>{'\u{1F512}'}</Text>
          <Text style={styles.securityText}>AES-256 Encrypted</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  shieldOuter: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldIcon: {
    fontSize: 36,
  },
  textContainer: {
    marginBottom: 8,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  tagline: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  footer: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  securityIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  securityText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
});

export default SplashScreen;
