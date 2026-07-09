// Part Request Detail Component
// Shows detailed view of a part request with status and review information
// Requirements: 25.1, 25.5

import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '@/constants/theme'
import { PartRequestService } from '@/lib/services/part-request-service'
import type { PartRequest, PartRequestWithDetails } from '@/types/parts-request.types'

interface PartRequestDetailProps {
  request: PartRequest | PartRequestWithDetails
  onClose?: () => void
}

export function PartRequestDetail({ request, onClose }: PartRequestDetailProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning
      case 'approved':
        return theme.colors.success
      case 'rejected':
        return theme.colors.error
      default:
        return theme.colors.textSecondary
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline'
      case 'approved':
        return 'checkmark-circle'
      case 'rejected':
        return 'close-circle'
      default:
        return 'help-circle-outline'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
          <Ionicons
            name={getStatusIcon(request.status) as any}
            size={24}
            color={getStatusColor(request.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Part Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Part Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Part Name</Text>
          <Text style={styles.value}>{request.part_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Device Brand</Text>
          <Text style={styles.value}>{request.device_brand}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Device Model</Text>
          <Text style={styles.value}>{request.device_model}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Repair Category</Text>
          <Text style={[styles.value, styles.categoryValue]}>
            {request.repair_category.replace(/_/g, ' ')}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Estimated Price</Text>
          <Text style={styles.value}>
            {PartRequestService.formatPrice(request.estimated_price)}
          </Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{request.part_description}</Text>
        </View>
      </View>

      {/* Request Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request Details</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Submitted On</Text>
          <Text style={styles.value}>{formatDate(request.created_at)}</Text>
        </View>

        {request.updated_at && request.updated_at !== request.created_at && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Last Updated</Text>
            <Text style={styles.value}>{formatDate(request.updated_at)}</Text>
          </View>
        )}
      </View>

      {/* Review Information (if reviewed) */}
      {request.status !== 'pending' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Review Information</Text>
          
          {request.reviewed_at && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Reviewed On</Text>
              <Text style={styles.value}>{formatDate(request.reviewed_at)}</Text>
            </View>
          )}

          {request.status === 'approved' && request.added_part_id && (
            <View style={styles.approvedBox}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              <View style={styles.approvedContent}>
                <Text style={styles.approvedTitle}>Part Added to Catalogue</Text>
                <Text style={styles.approvedText}>
                  This part has been added to the catalogue and is now available for use in your repair quotes.
                </Text>
              </View>
            </View>
          )}

          {request.status === 'rejected' && request.rejection_reason && (
            <View style={styles.rejectedBox}>
              <Ionicons name="alert-circle" size={24} color={theme.colors.error} />
              <View style={styles.rejectedContent}>
                <Text style={styles.rejectedTitle}>Request Rejected</Text>
                <Text style={styles.rejectedReason}>{request.rejection_reason}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Pending Status Message */}
      {request.status === 'pending' && (
        <View style={styles.pendingBox}>
          <Ionicons name="time-outline" size={24} color={theme.colors.warning} />
          <View style={styles.pendingContent}>
            <Text style={styles.pendingTitle}>Under Review</Text>
            <Text style={styles.pendingText}>
              Your request is being reviewed by our admin team. You will be notified once a decision is made.
            </Text>
          </View>
        </View>
      )}

      {/* Close Button */}
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right'
  },
  categoryValue: {
    textTransform: 'capitalize'
  },
  descriptionBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20
  },
  approvedBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success + '10',
    borderRadius: 8,
    padding: 12,
    gap: 12
  },
  approvedContent: {
    flex: 1
  },
  approvedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
    marginBottom: 4
  },
  approvedText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18
  },
  rejectedBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.error + '10',
    borderRadius: 8,
    padding: 12,
    gap: 12
  },
  rejectedContent: {
    flex: 1
  },
  rejectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
    marginBottom: 4
  },
  rejectedReason: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18
  },
  pendingBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warning + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16
  },
  pendingContent: {
    flex: 1
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.warning,
    marginBottom: 4
  },
  pendingText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
})
