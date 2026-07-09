// Part Request List Component
// Shows technician's part request history
// Requirements: 25.1, 25.5

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '@/constants/theme'
import { PartRequestService } from '@/lib/services/part-request-service'
import type { PartRequest } from '@/types/parts-request.types'

interface PartRequestListProps {
  technicianId: string
  onRequestPress?: (request: PartRequest) => void
  filterStatus?: 'pending' | 'approved' | 'rejected'
}

export function PartRequestList({
  technicianId,
  onRequestPress,
  filterStatus
}: PartRequestListProps) {
  const [requests, setRequests] = useState<PartRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [filterStatus])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const result = await PartRequestService.getRequestsByTechnician(
        technicianId,
        filterStatus
      )

      if (result.success && result.data) {
        setRequests(result.data)
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadRequests()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning
      case 'approved':
        return colors.success
      case 'rejected':
        return colors.error
      default:
        return colors.textSecondary
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline'
      case 'approved':
        return 'checkmark-circle-outline'
      case 'rejected':
        return 'close-circle-outline'
      default:
        return 'help-circle-outline'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderRequest = ({ item }: { item: PartRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => onRequestPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestInfo}>
          <Text style={styles.partName} numberOfLines={1}>
            {item.part_name}
          </Text>
          <Text style={styles.deviceInfo} numberOfLines={1}>
            {item.device_brand} {item.device_model}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.repair_category.replace(/_/g, ' ')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {PartRequestService.formatPrice(item.estimated_price)}
          </Text>
        </View>
      </View>

      <View style={styles.requestFooter}>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        {item.status === 'approved' && item.added_part_id && (
          <View style={styles.addedBadge}>
            <Ionicons name="checkmark" size={12} color={colors.success} />
            <Text style={styles.addedText}>Added to catalogue</Text>
          </View>
        )}
        {item.status === 'rejected' && (
          <View style={styles.rejectedBadge}>
            <Ionicons name="alert-circle-outline" size={12} color={colors.error} />
            <Text style={styles.rejectedText}>See reason</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-open-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Requests Yet</Text>
      <Text style={styles.emptyText}>
        {filterStatus
          ? `You don't have any ${filterStatus} requests`
          : "You haven't submitted any part requests yet"}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={requests}
      renderItem={renderRequest}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    />
  )
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  requestInfo: {
    flex: 1,
    marginRight: 12
  },
  partName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4
  },
  deviceInfo: {
    fontSize: 14,
    color: colors.textSecondary
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  requestDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize'
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500'
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  rejectedText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20
  }
})
