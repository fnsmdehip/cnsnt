/**
 * Dashboard Screen - main overview of all consent records.
 *
 * Features:
 * - List all consent records with status indicators
 * - Search and filter by status
 * - Quick stats (total, expiring soon, recently created)
 * - Pull-to-refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '../components/ErrorBoundary';
import StatusBadge from '../components/StatusBadge';
import db from '../services/database';
import exportService from '../services/export';
import type { ConsentRecord, ConsentStatus } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

type FilterOption = 'all' | ConsentStatus;

interface DashboardProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    addListener: (event: string, callback: () => void) => () => void;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ navigation }) => {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ConsentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    revoked: 0,
    draft: 0,
    expiringSoon: 0,
    recentlyCreated: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyFilters = useCallback(
    (data: ConsentRecord[], query: string, filter: FilterOption) => {
      let result = data;

      if (filter !== 'all') {
        result = result.filter((r) => r.status === filter);
      }

      if (query.trim()) {
        const lower = query.toLowerCase();
        result = result.filter(
          (r) =>
            r.title.toLowerCase().includes(lower) ||
            r.templateName.toLowerCase().includes(lower) ||
            r.parties.some((p) => p.name.toLowerCase().includes(lower))
        );
      }

      setFilteredRecords(result);
    },
    []
  );

  const loadData = useCallback(async () => {
    try {
      const [allRecords, dashStats] = await Promise.all([
        db.getAllRecords(),
        db.getStats(),
      ]);
      setRecords(allRecords);
      setStats(dashStats);
      applyFilters(allRecords, searchQuery, activeFilter);
    } catch (_error) {
      Alert.alert('Error', 'Failed to load consent records.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, applyFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters(records, searchQuery, activeFilter);
  }, [searchQuery, activeFilter, records, applyFilters]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRecordPress = (record: ConsentRecord) => {
    Alert.alert(
      record.title,
      `Status: ${record.status}\nCreated: ${new Date(record.createdAt).toLocaleDateString()}\nParties: ${record.parties.map((p) => p.name).join(', ')}`,
      [
        {
          text: 'Export PDF',
          onPress: async () => {
            try {
              await exportService.exportAndShare(record);
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Unknown error';
              Alert.alert('Export Error', message);
            }
          },
        },
        ...(record.status === 'active'
          ? [
              {
                text: 'Revoke',
                style: 'destructive' as const,
                onPress: async () => {
                  Alert.alert(
                    'Revoke Consent',
                    'Are you sure you want to revoke this consent record? This action cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' as const },
                      {
                        text: 'Revoke',
                        style: 'destructive' as const,
                        onPress: async () => {
                          await db.revokeRecord(record.id);
                          loadData();
                        },
                      },
                    ]
                  );
                },
              },
            ]
          : []),
        { text: 'Close' },
      ]
    );
  };

  const filters: { key: FilterOption; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'expired', label: 'Expired' },
    { key: 'revoked', label: 'Revoked' },
    { key: 'draft', label: 'Draft' },
  ];

  const renderStatsBar = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={[styles.statItem, styles.statItemActive]}>
        <Text style={[styles.statNumber, { color: Colors.statusActive }]}>
          {stats.active}
        </Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: Colors.warning }]}>
          {stats.expiringSoon}
        </Text>
        <Text style={styles.statLabel}>Expiring</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: Colors.info }]}>
          {stats.recentlyCreated}
        </Text>
        <Text style={styles.statLabel}>Recent</Text>
      </View>
    </View>
  );

  const renderFilterBar = () => (
    <View style={styles.filterContainer}>
      {filters.map((f) => (
        <Pressable
          key={f.key}
          style={[
            styles.filterChip,
            activeFilter === f.key && styles.filterChipActive,
          ]}
          onPress={() => setActiveFilter(f.key)}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === f.key && styles.filterChipTextActive,
            ]}
          >
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderRecord = ({ item }: { item: ConsentRecord }) => (
    <Pressable
      style={styles.recordCard}
      onPress={() => handleRecordPress(item)}
    >
      <View style={styles.recordHeader}>
        <Text style={styles.recordTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <StatusBadge status={item.status} size="small" />
      </View>
      <Text style={styles.recordTemplate}>{item.templateName}</Text>
      <View style={styles.recordMeta}>
        <Text style={styles.recordMetaText}>
          {item.parties.map((p) => p.name).join(', ')}
        </Text>
        <Text style={styles.recordDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {item.expiresAt && item.status === 'active' && (
        <Text style={styles.expiryText}>
          Expires: {new Date(item.expiresAt).toLocaleDateString()}
        </Text>
      )}
      {item.recordingUri && (
        <View style={styles.recordingIndicator}>
          <Text style={styles.recordingIndicatorText}>
            {'\u{1F3A4}'} Audio recorded
          </Text>
        </View>
      )}
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{'\u{1F4CB}'}</Text>
      <Text style={styles.emptyTitle}>No consent records yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first consent record from the Forms tab.
      </Text>
    </View>
  );

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
        {renderStatsBar()}

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {renderFilterBar()}

        <FlatList
          data={filteredRecords}
          renderItem={renderRecord}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            filteredRecords.length === 0
              ? styles.emptyList
              : styles.listContent
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  statItemActive: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.divider,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  searchInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.lg,
  },
  emptyList: {
    flex: 1,
  },
  recordCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  recordTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  recordTemplate: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  recordMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordMetaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },
  recordDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  expiryText: {
    ...Typography.caption,
    color: Colors.warning,
    marginTop: Spacing.xs,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  recordingIndicatorText: {
    ...Typography.caption,
    color: Colors.info,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});

export default Dashboard;
