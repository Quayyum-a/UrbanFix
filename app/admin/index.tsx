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
      let stats = {
        pending_verifications: 0,
        pending_part_requests: 0,
        active_disputes: 0,
        total_jobs: 0,
        total_revenue: 0,
        active_technicians: 0,
        active_customers: 0
      }

      // Get pending verifications count
      const { count: verifications, error: verError } = await supabase
        .from('technician_verifications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (!verError) stats.pending_verifications = verifications || 0

      // Get pending part requests count (may not exist yet)
      const { count: partRequests, error: partError } = await supabase
        .from('parts_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (!partError) stats.pending_part_requests = partRequests || 0

      // Get active disputes count (may not exist yet)
      const { count: disputes, error: dispError } = await supabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (!dispError) stats.active_disputes = disputes || 0

      // Get total jobs count
      const { count: totalJobs, error: jobError } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
      if (!jobError) stats.total_jobs = totalJobs || 0

      // Get active technicians count (from users table, not just profiles)
      const { count: activeTechs, error: techError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'technician')
      if (!techError) stats.active_technicians = activeTechs || 0

      // Get active customers count (from users table)
      const { count: activeCustomers, error: custError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer')
      if (!custError) stats.active_customers = activeCustomers || 0

      // Calculate total revenue (sum of completed job payments)
      const { data: revenueData, error: revError } = await supabase
        .from('jobs')
        .select('total_price')
        .in('status', ['complete', 'paid'])
      if (!revError && revenueData) {
        stats.total_revenue = revenueData.reduce((sum, job) => sum + (job.total_price || 0), 0)
      }

      setStats(stats)
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
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#d0e1fb' }]}>
              <Ionicons name="construct" size={22} color="#0047bb" />
            </View>
            <Text style={styles.statValue}>{stats.active_technicians}</Text>
            <Text style={styles.statLabel}>Active Techs</Text>
            <Text style={styles.statMeta}>
              <Ionicons name="radio-button-on" size={10} color="#0047bb" /> Online
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f0f4f8' }]}>
              <Ionicons name="people" size={22} color="#0047bb" />
            </View>
            <Text style={styles.statValue}>{stats.active_customers}</Text>
            <Text style={styles.statLabel}>Total Customers</Text>
          </View>
        </View>
      </View>

      {/* Pending Actions */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>Pending Actions</Text>
          <TouchableOpacity onPress={() => router.push('/admin/technician-management')}>
            <Text style={{ fontSize: 12, color: '#0047bb', fontWeight: '600' }}>View All</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.actionCard, styles.urgentCard]}
          onPress={() => router.push('/admin/technician-management')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, styles.primaryIconBg]}>
            <Ionicons name="shield-checkmark" size={22} color="#fff" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Technician Verifications</Text>
            <Text style={styles.actionDescription}>Credentials awaiting review</Text>
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
          <View style={[styles.actionIcon, styles.secondaryIconBg]}>
            <Ionicons name="cube" size={22} color="#0047bb" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Part Requests</Text>
            <Text style={styles.actionDescription}>Awaiting quote approval</Text>
          </View>
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{stats.pending_part_requests}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/admin/disputes')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, styles.tertiaryIconBg]}>
            <Ionicons name="gavel" size={22} color="#832700" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Active Disputes</Text>
            <Text style={styles.actionDescription}>Escalated by customer/technician</Text>
          </View>
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{stats.active_disputes}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/admin/technician-management')}
          activeOpacity={0.8}
        >
          <View style={styles.quickActionContent}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.quickActionButtonText}>Manage Technicians</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, styles.quickActionButtonSecondary]}
          onPress={() => router.push('/admin/analytics')}
          activeOpacity={0.8}
        >
          <View style={styles.quickActionContent}>
            <Ionicons name="analytics" size={20} color="#0047bb" />
            <Text style={[styles.quickActionButtonText, styles.quickActionButtonTextSecondary]}>View Analytics</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0047bb" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fb'
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
    fontSize: 24,
    fontWeight: '600',
    color: '#191c1e',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#434653'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191c1e',
    marginBottom: 12
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#f0f4f8'
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 2
  },
  statLabel: {
    fontSize: 12,
    color: '#434653',
    textAlign: 'center'
  },
  statMeta: {
    fontSize: 11,
    color: '#737685',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500'
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  urgentCard: {
    borderColor: '#ba1a1a',
    borderWidth: 2
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  primaryIconBg: {
    backgroundColor: '#0047bb'
  },
  secondaryIconBg: {
    backgroundColor: '#d0e1fb'
  },
  tertiaryIconBg: {
    backgroundColor: '#ffdbcf'
  },
  actionContent: {
    flex: 1
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#191c1e',
    marginBottom: 2
  },
  actionDescription: {
    fontSize: 12,
    color: '#434653'
  },
  actionBadge: {
    backgroundColor: '#ba1a1a',
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff'
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0047bb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    paddingVertical: 16
  },
  quickActionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0047bb'
  },
  quickActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8
  },
  quickActionButtonTextSecondary: {
    color: '#0047bb'
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  }
})
