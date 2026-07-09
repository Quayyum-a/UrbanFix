// Admin Dashboard - Overview Screen
// Requirements: 19.1, 20.1, 25.3, 27.1
// Shows pending items and key platform metrics

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors, spacing, radius, shadows } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  pending_verifications: number
  pending_part_requests: number
  active_disputes: number
  total_jobs: number
  total_revenue: number
  active_technicians: number
  active_customers: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    pending_verifications: 0,
    pending_part_requests: 0,
    active_disputes: 0,
    total_jobs: 0,
    total_revenue: 0,
    active_technicians: 0,
    active_customers: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)

      // Get pending verifications count
      const { count: verifications } = await supabase
        .from('technician_verifications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Get pending part requests count
      const { count: partRequests } = await supabase
        .from('parts_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Get active disputes count
      const { count: disputes } = await supabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Get total jobs count
      const { count: totalJobs } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })

      // Get active technicians count
      const { count: activeTechs } = await supabase
        .from('technician_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 'approved')

      // Get active customers count
      const { count: activeCustomers } = await supabase
        .from('customer_profiles')
        .select('id', { count: 'exact', head: true })

      // Calculate total revenue (sum of completed job payments)
      const { data: revenueData } = await supabase
        .from('jobs')
        .select('total_price')
        .in('status', ['completed', 'payment_released'])

      const totalRevenue = revenueData?.reduce((sum, job) => sum + (job.total_price || 0), 0) || 0

      setStats({
        pending_verifications: verifications || 0,
        pending_part_requests: partRequests || 0,
        active_disputes: disputes || 0,
        total_jobs: totalJobs || 0,
        total_revenue: totalRevenue,
        active_technicians: activeTechs || 0,
        active_customers: activeCustomers || 0
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboardStats()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 100) // Convert from kobo
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Platform Overview & Management</Text>
      </View>

      {/* Pending Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Actions</Text>
        
        <TouchableOpacity
          style={[styles.actionCard, styles.urgentCard]}
          onPress={() => router.push('/admin/verifications')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="shield-checkmark" size={24} color={colors.error} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Technician Verifications</Text>
            <Text style={styles.actionDescription}>Pending approval required</Text>
          </View>
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{stats.pending_verifications}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/admin/part-requests')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="cube" size={24} color={colors.primary} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Part Requests</Text>
            <Text style={styles.actionDescription}>New parts for review</Text>
          </View>
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{stats.pending_part_requests}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, stats.active_disputes > 0 && styles.urgentCard]}
          onPress={() => router.push('/admin/disputes')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIcon}>
            <Ionicons 
              name="alert-circle" 
              size={24} 
              color={stats.active_disputes > 0 ? colors.error : colors.warning} 
            />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Active Disputes</Text>
            <Text style={styles.actionDescription}>Require resolution</Text>
          </View>
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{stats.active_disputes}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Platform Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="briefcase-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.total_jobs}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="cash-outline" size={28} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{formatCurrency(stats.total_revenue)}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Ionicons name="construct-outline" size={28} color={colors.secondary} />
            </View>
            <Text style={styles.statValue}>{stats.active_technicians}</Text>
            <Text style={styles.statLabel}>Active Technicians</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="people-outline" size={28} color={colors.info} />
            </View>
            <Text style={styles.statValue}>{stats.active_customers}</Text>
            <Text style={styles.statLabel}>Active Customers</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/admin/analytics')}
        >
          <Ionicons name="bar-chart" size={20} color={colors.primary} />
          <Text style={styles.quickActionText}>View Detailed Analytics</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/admin/verifications')}
        >
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.quickActionText}>Manage Technicians</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12
  },
  header: {
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary
  },
  section: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  urgentCard: {
    borderColor: colors.error,
    borderWidth: 2
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  actionContent: {
    flex: 1
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2
  },
  actionDescription: {
    fontSize: 13,
    color: colors.textSecondary
  },
  actionBadge: {
    backgroundColor: colors.error,
    borderRadius: 16,
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  actionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  quickActionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 12
  }
})
