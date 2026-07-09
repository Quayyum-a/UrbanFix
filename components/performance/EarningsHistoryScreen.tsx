// Earnings history screen with filtering and detailed view
// Shows complete payout history for technicians

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '@/constants/theme'
import { PerformanceService } from '@/lib/services/performance-service'
import type { EarningHistoryItem } from '@/types/performance.types'

interface EarningsHistoryScreenProps {
  technicianId: string
}

type FilterType = 'all' | 'paid' | 'pending'

export function EarningsHistoryScreen({ technicianId }: EarningsHistoryScreenProps) {
  const [earnings, setEarnings] = useState<EarningHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [hasMore, setHasMore] = useState(true)

  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    loadEarnings(true)
  }, [technicianId, filter])

  const loadEarnings = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
        setEarnings([])
      } else {
        setLoadingMore(true)
      }

      const offset = reset ? 0 : earnings.length

      const result = await PerformanceService.getEarningsHistory(technicianId, {
        limit: ITEMS_PER_PAGE,
        offset
      })

      if (result.success) {
        const newEarnings = result.data as EarningHistoryItem[]
        
        // Apply local filter if needed
        const filteredEarnings = newEarnings.filter(earning => {
          if (filter === 'paid') return earning.paid_out
          if (filter === 'pending') return !earning.paid_out
          return true
        })

        setEarnings(prev => reset ? filteredEarnings : [...prev, ...filteredEarnings])
        setHasMore(newEarnings.length === ITEMS_PER_PAGE)
      }
    } catch (error) {
      console.error('Failed to load earnings:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadEarnings(true)
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadEarnings(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const calculateTotals = () => {
    return earnings.reduce(
      (acc, earning) => {
        acc.total += earning.net_earnings
        if (earning.paid_out) {
          acc.paid += earning.net_earnings
        } else {
          acc.pending += earning.net_earnings
        }
        return acc
      },
      { total: 0, paid: 0, pending: 0 }
    )
  }

  const totals = calculateTotals()

  const renderEarningItem = ({ item }: { item: EarningHistoryItem }) => (
    <View style={styles.earningCard}>
      {/* Header */}
      <View style={styles.earningHeader}>
        <View style={styles.earningDevice}>
          <Text style={styles.earningBrand}>{item.device_brand}</Text>
          <Text style={styles.earningModel}>{item.device_model}</Text>
          {item.repair_category_name && (
            <Text style={styles.earningCategory}>{item.repair_category_name}</Text>
          )}
        </View>
        
        {item.paid_out ? (
          <View style={styles.paidBadge}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.paidBadgeText}>Paid</Text>
          </View>
        ) : (
          <View style={styles.pendingBadge}>
            <Ionicons name="hourglass" size={16} color={theme.colors.warning} />
            <Text style={styles.pendingBadgeText}>Pending</Text>
          </View>
        )}
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Labor</Text>
          <Text style={styles.breakdownValue}>{formatCurrency(item.labor_amount)}</Text>
        </View>
        
        {item.parts_amount > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Parts</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(item.parts_amount)}</Text>
          </View>
        )}
        
        {item.platform_fee > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee</Text>
            <Text style={[styles.breakdownValue, styles.feeValue]}>
              -{formatCurrency(item.platform_fee)}
            </Text>
          </View>
        )}
        
        <View style={[styles.breakdownRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Net Earnings</Text>
          <Text style={styles.totalValue}>{formatCurrency(item.net_earnings)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.earningFooter}>
        <Text style={styles.earningDate}>{formatDate(item.job_completed_at)}</Text>
        {item.paid_out && item.paid_out_at && (
          <Text style={styles.paidOutDate}>
            Paid on {formatDate(item.paid_out_at)}
          </Text>
        )}
      </View>
    </View>
  )

  const renderListHeader = () => (
    <>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Earnings</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totals.total)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Paid Out</Text>
          <Text style={[styles.summaryValue, styles.paidValue]}>
            {formatCurrency(totals.paid)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, styles.pendingValue]}>
            {formatCurrency(totals.pending)}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'paid' && styles.filterTabActive]}
          onPress={() => setFilter('paid')}
        >
          <Text style={[styles.filterText, filter === 'paid' && styles.filterTextActive]}>
            Paid
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
      </View>
    </>
  )

  const renderListFooter = () => {
    if (!loadingMore) return null
    
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    )
  }

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={64} color={theme.colors.gray} />
      <Text style={styles.emptyText}>No earnings yet</Text>
      <Text style={styles.emptySubtext}>
        Complete jobs to start earning
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading earnings history...</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.container}
      data={earnings}
      renderItem={renderEarningItem}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderListHeader}
      ListFooterComponent={renderListFooter}
      ListEmptyComponent={renderEmptyList}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.gray
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.gray,
    marginBottom: 4
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  paidValue: {
    color: theme.colors.success
  },
  pendingValue: {
    color: theme.colors.warning
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 8
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center'
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  earningCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  earningDevice: {
    flex: 1
  },
  earningBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  earningModel: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: 2
  },
  earningCategory: {
    fontSize: 13,
    color: theme.colors.primary,
    marginTop: 4
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning
  },
  breakdownContainer: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  breakdownLabel: {
    fontSize: 14,
    color: theme.colors.gray
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text
  },
  feeValue: {
    color: theme.colors.error
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary
  },
  earningFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  earningDate: {
    fontSize: 12,
    color: theme.colors.gray
  },
  paidOutDate: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '500'
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
    paddingTop: 64
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: 8
  }
})
