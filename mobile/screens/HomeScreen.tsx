/**
 * Home Screen - Forms & Templates hub.
 *
 * Shows both legacy form screens and new template-based consent builder.
 * Entitlement-aware: gates premium templates behind paywall.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '../components/ErrorBoundary';
import { getAllTemplates } from '../data/templates';
import usePurchases from '../hooks/usePurchases';
import type { ConsentTemplate, TemplateCategory } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface HomeScreenProps {
  navigation: any;
}

// Legacy form items for backward compat
const legacyForms = [
  { key: 'Record Audio', screen: 'Recording', icon: '\u{1F3A4}' },
  { key: 'Consent Checklist', screen: 'ConsentBuilder', icon: '\u{2705}', params: { title: 'Consent Checklist' } },
];

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  medical: 'Medical',
  legal: 'Legal',
  business: 'Business',
  media: 'Media & Creative',
  research: 'Research',
  property: 'Property',
  personal: 'Personal',
  custom: 'Custom',
};

const CATEGORY_ORDER: TemplateCategory[] = [
  'medical',
  'legal',
  'business',
  'media',
  'research',
  'property',
  'personal',
  'custom',
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { canUseTemplates, canRecord, entitlement, canCreateRecord } = usePurchases();

  const templates = getAllTemplates();

  // Group templates by category
  const sections = CATEGORY_ORDER
    .map((category) => ({
      title: CATEGORY_LABELS[category],
      data: templates.filter((t) => t.category === category),
    }))
    .filter((s) => s.data.length > 0);

  const handleTemplatePress = (template: ConsentTemplate) => {
    if (template.isPremium && !canUseTemplates) {
      // Show paywall info via navigation or alert
      navigation.navigate('Settings');
      return;
    }
    if (!canCreateRecord) {
      navigation.navigate('Settings');
      return;
    }
    navigation.navigate('TemplateForm', { templateId: template.id });
  };

  const handleLegacyPress = (item: typeof legacyForms[0]) => {
    if (item.screen === 'Recording' && !canRecord) {
      navigation.navigate('Settings');
      return;
    }
    navigation.navigate(item.screen, item.params);
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      <View style={styles.quickActionsRow}>
        {legacyForms.map((item) => (
          <Pressable
            key={item.key}
            style={styles.quickActionCard}
            onPress={() => handleLegacyPress(item)}
          >
            <Text style={styles.quickActionIcon}>{item.icon}</Text>
            <Text style={styles.quickActionLabel}>{item.key}</Text>
            {item.screen === 'Recording' && !canRecord && (
              <Text style={styles.proBadge}>PRO</Text>
            )}
          </Pressable>
        ))}
        <Pressable
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.quickActionIcon}>{'\u{1F4CB}'}</Text>
          <Text style={styles.quickActionLabel}>Dashboard</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderTemplateItem = ({ item }: { item: ConsentTemplate }) => {
    const isLocked = item.isPremium && !canUseTemplates;

    return (
      <Pressable
        style={[styles.templateCard, isLocked && styles.templateCardLocked]}
        onPress={() => handleTemplatePress(item)}
      >
        <View style={styles.templateCardContent}>
          <Text style={styles.templateIcon}>{item.icon}</Text>
          <View style={styles.templateInfo}>
            <Text style={styles.templateName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.templateDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          {isLocked && <Text style={styles.lockIcon}>{'\u{1F512}'}</Text>}
        </View>
        <View style={styles.templateMeta}>
          {item.requiresDualSignature && (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>Dual Signature</Text>
            </View>
          )}
          {item.defaultExpiryDays && (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                {item.defaultExpiryDays}d expiry
              </Text>
            </View>
          )}
          {item.isPremium && (
            <View style={[styles.metaBadge, styles.proBadgeContainer]}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string };
  }) => <Text style={styles.sectionHeader}>{section.title}</Text>;

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <SectionList
          ListHeaderComponent={
            <>
              {/* App Header */}
              <View style={styles.appHeader}>
                <Text style={styles.appName}>cnsnt</Text>
                <Text style={styles.appTagline}>
                  Secure Consent Management
                </Text>
                {entitlement === 'free' && (
                  <Pressable
                    style={styles.upgradeBanner}
                    onPress={() => navigation.navigate('Settings')}
                  >
                    <Text style={styles.upgradeBannerText}>
                      Free Tier - Upgrade to Pro for unlimited access
                    </Text>
                  </Pressable>
                )}
              </View>

              {renderQuickActions()}

              <Text style={styles.templatesHeading}>Consent Templates</Text>
            </>
          }
          sections={sections}
          renderItem={renderTemplateItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  appHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 3,
  },
  appTagline: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  upgradeBanner: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    marginTop: Spacing.md,
  },
  upgradeBannerText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '500',
  },
  quickActionsContainer: {
    padding: Spacing.lg,
  },
  quickActionsTitle: {
    ...Typography.label,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
  proBadge: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 10,
    marginTop: Spacing.xs,
  },
  templatesHeading: {
    ...Typography.h2,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  sectionHeader: {
    ...Typography.label,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  templateCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  templateCardLocked: {
    opacity: 0.7,
  },
  templateCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  templateDescription: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  lockIcon: {
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  metaBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
  },
  metaBadgeText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 11,
  },
  proBadgeContainer: {
    backgroundColor: '#E3F2FD',
  },
  proBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
});

export default HomeScreen;
