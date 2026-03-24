/**
 * Empty State component with designed illustration.
 * Used when lists have no data - never show blank screens.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, MIN_TOUCH_SIZE } from '../constants/theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction && (
        <Pressable style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
  },
  actionText: {
    ...Typography.button,
    color: Colors.textInverse,
  },
});

export default EmptyState;
