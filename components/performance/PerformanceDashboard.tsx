// Technician performance dashboard
// Displays earnings, metrics, and recent reviews

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '@/constants/theme'
import { PerformanceService } from '@/lib/services/performance-service'
import type { PerformanceDashboardData } from '@/types/performance.types'

interface PerformanceDashboardProps {
  technicianId: string
  onViewAllEarnings?: () => void
  onViewAllReviews?: () => void
}

export function PerformanceDashboard({
  technicianId,
  onViewAllEarnings,
  onViewAllReviews
}: PerformanceDashboardProps) {
  const [data, setData] = useState<PerformanceDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [technicianId])

  const loadDashboard = async () => {
    try {
      const result = await PerformanceService.getDashboardData(technicianId)

      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadDashboard()
  }

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`
  }

  const formatCompletionTime = (hours: number) => {
    if (hours === 0) return 'N/A'
    if (hours < 1) return `${Math.round(hours * 60)} mins`
    if (hours === 1) return '1 hour'
    if (hours < 24) return `${Math.round(hours)} hours`
    const days = Math.round(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={theme.colors.warning}
        />
      )
    }
    return stars
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </View>
    )
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.gray} />
        <Text style={styles.errorText}>Failed to load performance data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { summary, recent_earnings, recent_reviews, earnings_by_category } = data

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Earnings Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          {/* Total Earnings */}
          <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="wallet" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.total_earnings)}
            </Text>
            <Text style={styles.summaryLabel}>Total Earnings</Text>
          </View>

          {/* Pending Payouts */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="hourglass" size={24} color={theme.colors.warning} />
            </View>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.pending_payouts)}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          {/* This Month Earnings */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="calendar" size={24} color={theme.colors.success} />
            </View>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.this_month_earnings)}
            </Text>
            <Text style={styles.summaryLabel}>This Month</Text>
          </View>

          {/* Completed Jobs */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            </View>
            <Text style={styles.summaryValue}>{summary.completed_jobs}</Text>
            <Text style={styles.summaryLabel}>Jobs Done</Text>
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        
        <View style={styles.metricsCard}>
          {/* Average Rating */}
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Ionicons name="star" size={20} color={theme.colors.warning} />
              <Text style={styles.metricLabel}>Average Rating</Text>
            </View>
            <View style={styles.metricRight}>
              <Text style={styles.metricValue}>
                {summary.average_rating.toFixed(1)}
              </Text>
              <Text style={styles.metricSubtext}>
                ({summary.total_reviews} reviews)
              </Text>
            </View>
          </View>

          {/* Completion Time */}
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Ionicons name="timer" size={20} color={theme.colors.primary} />
              <Text style={styles.metricLabel}>Avg Completion Time</Text>
            </View>
            <View style={styles.metricRight}>
              <Text style={styles.metricValue}>
                {formatCompletionTime(summary.avg_completion_time_hours)}
              </Text>
            </View>
          </View>

          {/* This Month Jobs */}
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Ionicons name="trending-up" size={20} color={theme.colors.success} />
              <Text style={styles.metricLabel}>Jobs This Month</Text>
            </View>
            <View style={styles.metricRight}>
              <Text style={styles.metricValue}>{summary.this_month_jobs}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Earnings by Category */}
      {earnings_by_category.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings by Category</Text>
          
          {earnings_by_category.slice(0, 5).map((category, index) => (
            <View key={index} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>
                  {category.category_name || 'General'}
                </Text>
                <Text style={styles.categoryEarnings}>
                  {formatCurrency(category.total_earnings)}
                </Text>
              </View>
              <View style={styles.categoryDetails}>
                <Text style={styles.categoryDetail}>
                  {category.jobs_count} job{category.jobs_count > 1 ? 's' : ''}
                </Text>
                <Text style={styles.categoryDetail}>•</Text>
                <Text style={styles.categoryDetail}>
                  {formatCurrency(category.avg_earnings_per_job)} avg
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Earnings */}
      {recent_earnings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Earnings</Text>
            {onViewAllEarnings && (
              <TouchableOpacity onPress={onViewAllEarnings}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recent_earnings.map((earning) => (
            <View key={earning.id} style={styles.earningCard}>
              <View style={styles.earningHeader}>
                <View style={styles.earningDevice}>
                  <Text style={styles.earningBrand}>{earning.device_brand}</Text>
                  <Text style={styles.earningModel}>{earning.device_model}</Text>
                </View>
                <View style={styles.earningAmountContainer}>
                  <Text style={styles.earningAmount}>
                    {formatCurrency(earning.net_earnings)}
                  </Text>
                  {earning.paid_out ? (
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>Paid</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.earningDate}>
                {new Date(earning.job_completed_at).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Reviews */}
      {recent_reviews.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {onViewAllReviews && (
              <TouchableOpacity onPress={onViewAllReviews}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recent_reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                <View style={styles.reviewStars}>
                  {renderStars(review.rating)}
                </View>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
              <Text style={styles.reviewMeta}>
                {review.repair_category} • {review.device_brand}
              </Text>
              <Text style={styles.reviewDate}>
                {new Date(review.created_at).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.gray,
    marginTop: 16,
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  summaryContainer: {
    padding: 16,
    gap: 12
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  summaryCardPrimary: {
    backgroundColor: '#F0F7FF',
    borderColor: theme.colors.primary
  },
  summaryIconContainer: {
    marginBottom: 8
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.gray
  },
  section: {
    padding: 16,
    paddingTop: 8
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500'
  },
  metricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 16
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  metricLabel: {
    fontSize: 14,
    color: theme.colors.text
  },
  metricRight: {
    alignItems: 'flex-end'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  metricSubtext: {
    fontSize: 12,
    color: theme.colors.gray
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text
  },
  categoryEarnings: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary
  },
  categoryDetails: {
    flexDirection: 'row',
    gap: 8
  },
  categoryDetail: {
    fontSize: 13,
    color: theme.colors.gray
  },
  earningCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  earningDevice: {
    flex: 1
  },
  earningBrand: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text
  },
  earningModel: {
    fontSize: 13,
    color: theme.colors.gray,
    marginTop: 2
  },
  earningAmountContainer: {
    alignItems: 'flex-end',
    gap: 4
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary
  },
  paidBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.success
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.warning
  },
  earningDate: {
    fontSize: 12,
    color: theme.colors.gray
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2
  },
  reviewComment: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 8
  },
  reviewMeta: {
    fontSize: 13,
    color: theme.colors.gray,
    marginBottom: 4
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.gray
  }
})
