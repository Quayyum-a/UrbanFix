// Part Request Management Screen
// Requirements: 25.3, 25.4, 25.5
// Admin interface for reviewing and approving/rejecting technician part requests

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, shadows } from '@/constants/theme'
import { PartRequestService } from '@/lib/services/part-request-service'
import { useAuthStore } from '@/stores/authStore'
import type { PartRequestWithDetails } from '@/types/parts-request.types'

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

export default function PartRequestsManagementScreen() {
  const userProfile = useAuthStore(state => state.userProfile)
  const [requests, setRequests] = useState<PartRequestWithDetails[]>([])
  const [filteredRequests, setFilteredRequests] = useState<PartRequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending')
  const [selectedRequest, setSelectedRequest] = useState<PartRequestWithDetails | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [finalPrice, setFinalPrice] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  useEffect(() => {
    filterRequests()
  }, [activeFilter, requests])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const result = await PartRequestService.getAllRequests({})
      
      if (result.success && result.data) {
        setRequests(result.data)
      }
    } catch (error) {
      console.error('Error loading part requests:', error)
      Alert.alert('Error', 'Failed to load part requests')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterRequests = () => {
    if (activeFilter === 'all') {
      setFilteredRequests(requests)
    } else {
      setFilteredRequests(requests.filter(r => r.status === activeFilter))
    }
  }

  const handleApprove = (request: PartRequestWithDetails) => {
    setSelectedRequest(request)
    setFinalPrice(PartRequestService.koboToNaira(request.estimated_price).toString())
    setShowApproveModal(true)
  }

  const processApproval = async () => {
    if (!finalPrice || parseFloat(finalPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid price')
      return
    }

    if (!selectedRequest || !userProfile) return

    try {
      setProcessing(true)

      const priceInKobo = PartRequestService.nairaToKobo(parseFloat(finalPrice))
      
      const result = await PartRequestService.approveRequest(userProfile.id, {
        request_id: selectedRequest.id,
        final_price: priceInKobo
      })

      if (result.success) {
        Alert.alert('Success', 'Part request approved and added to catalogue')
        setShowApproveModal(false)
        setFinalPrice('')
        setSelectedRequest(null)
        loadRequests()
      } else {
        Alert.alert('Error', result.error || 'Failed to approve request')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      Alert.alert('Error', 'Failed to approve request')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = (request: PartRequestWithDetails) => {
    setSelectedRequest(request)
    setShowRejectModal(true)
  }

  const processRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason')
      return
    }

    if (!selectedRequest || !userProfile) return

    try {
      setProcessing(true)

      const result = await PartRequestService.rejectRequest(userProfile.id, {
        request_id: selectedRequest.id,
        rejection_reason: rejectionReason.trim()
      })

      if (result.success) {
        Alert.alert('Success', 'Part request rejected')
        setShowRejectModal(false)
        setRejectionReason('')
        setSelectedRequest(null)
        loadRequests()
      } else {
        Alert.alert('Error', result.error || 'Failed to reject request')
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      Alert.alert('Error', 'Failed to reject request')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning
      case 'approved': return colors.success
      case 'rejected': return colors.error
      default: return colors.textSecondary
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

  const renderRequest = ({ item }: { item: PartRequestWithDetails }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => setSelectedRequest(item)}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestInfo}>
          <Text style={styles.partName}>{item.part_name}</Text>
          <Text style={styles.deviceInfo}>
            {item.device_brand} {item.device_model}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.technician_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.repair_category.replace(/_/g, ' ')}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            Est: {PartRequestService.formatPrice(item.estimated_price)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item)}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No {activeFilter === 'all' ? '' : activeFilter} requests</Text>
      <Text style={styles.emptyText}>
        {activeFilter === 'pending' 
          ? 'All caught up! No pending part requests to review.'
          : `No ${activeFilter} part requests found.`}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading part requests...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
            {filter !== 'all' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {requests.filter(r => r.status === filter).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Requests List */}
      <FlatList
        data={filteredRequests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              loadRequests()
            }}
            tintColor={colors.primary}
          />
        }
      />

      {/* Request Detail Modal */}
      <Modal
        visible={!!selectedRequest && !showApproveModal && !showRejectModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRequest(null)}
      >
        {selectedRequest && (
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Request Details</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.modalContent}>
              {/* Part Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Part Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Part Name</Text>
                  <Text style={styles.detailValue}>{selectedRequest.part_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Device Brand</Text>
                  <Text style={styles.detailValue}>{selectedRequest.device_brand}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Device Model</Text>
                  <Text style={styles.detailValue}>{selectedRequest.device_model}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Repair Category</Text>
                  <Text style={[styles.detailValue, styles.categoryValue]}>
                    {selectedRequest.repair_category.replace(/_/g, ' ')}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Estimated Price</Text>
                  <Text style={styles.detailValue}>
                    {PartRequestService.formatPrice(selectedRequest.estimated_price)}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Description</Text>
                <View style={styles.descriptionBox}>
                  <Text style={styles.descriptionText}>{selectedRequest.part_description}</Text>
                </View>
              </View>

              {/* Technician Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Requested By</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Technician Name</Text>
                  <Text style={styles.detailValue}>{selectedRequest.technician_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedRequest.technician_phone}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Submitted On</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedRequest.created_at)}</Text>
                </View>
              </View>

              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Status</Text>
                <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedRequest.status) + '20' }]}>
                  <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedRequest.status) }]}>
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </Text>
                </View>
                {selectedRequest.rejection_reason && (
                  <View style={styles.rejectionReasonBox}>
                    <Text style={styles.rejectionReasonLabel}>Rejection Reason:</Text>
                    <Text style={styles.rejectionReasonText}>{selectedRequest.rejection_reason}</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              {selectedRequest.status === 'pending' && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalApproveButton]}
                    onPress={() => handleApprove(selectedRequest)}
                    disabled={processing}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.modalActionButtonText}>Approve & Add to Catalogue</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalRejectButton]}
                    onPress={() => handleReject(selectedRequest)}
                    disabled={processing}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                    <Text style={styles.modalActionButtonText}>Reject Request</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        visible={showApproveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApproveModal(false)}
      >
        <View style={styles.approveModalOverlay}>
          <View style={styles.approveModalContent}>
            <Text style={styles.approveModalTitle}>Approve Part Request</Text>
            <Text style={styles.approveModalSubtitle}>
              Set the final price for this part (it will be added to the catalogue)
            </Text>
            
            <Text style={styles.priceLabel}>Final Price (₦)</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Enter price in Naira"
              value={finalPrice}
              onChangeText={setFinalPrice}
              keyboardType="decimal-pad"
            />
            <Text style={styles.priceHint}>
              Technician estimated: {selectedRequest ? PartRequestService.formatPrice(selectedRequest.estimated_price) : ''}
            </Text>

            <View style={styles.approveModalActions}>
              <TouchableOpacity
                style={[styles.approveModalButton, styles.approveModalCancelButton]}
                onPress={() => {
                  setShowApproveModal(false)
                  setFinalPrice('')
                }}
                disabled={processing}
              >
                <Text style={styles.approveModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveModalButton, styles.approveModalConfirmButton]}
                onPress={processApproval}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.approveModalConfirmText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>Reject Part Request</Text>
            <Text style={styles.rejectModalSubtitle}>
              Please provide a reason for rejection (this will be sent to the technician)
            </Text>
            
            <TextInput
              style={styles.rejectInput}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.rejectModalCancelButton]}
                onPress={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
                disabled={processing}
              >
                <Text style={styles.rejectModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.rejectModalConfirmButton]}
                onPress={processRejection}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.rejectModalConfirmText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  filterTabActive: {
    borderBottomColor: colors.primary
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '600'
  },
  filterBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff'
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  requestInfo: {
    flex: 1
  },
  partName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4
  },
  deviceInfo: {
    fontSize: 14,
    color: colors.textSecondary
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  requestDetails: {
    gap: 8,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize'
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8
  },
  approveButton: {
    backgroundColor: colors.success
  },
  rejectButton: {
    backgroundColor: colors.error
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
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
    color: colors.text,
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  modalContent: {
    padding: 20
  },
  detailSection: {
    marginBottom: 24
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12
  },
  detailItem: {
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text
  },
  categoryValue: {
    textTransform: 'capitalize'
  },
  descriptionBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20
  },
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600'
  },
  rejectionReasonBox: {
    marginTop: 12,
    backgroundColor: colors.error + '10',
    borderRadius: 8,
    padding: 12
  },
  rejectionReasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 4
  },
  rejectionReasonText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20
  },
  modalActions: {
    gap: 12,
    marginTop: 24
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8
  },
  modalApproveButton: {
    backgroundColor: colors.success
  },
  modalRejectButton: {
    backgroundColor: colors.error
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  approveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  approveModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  approveModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8
  },
  approveModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8
  },
  priceInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8
  },
  priceHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 20
  },
  approveModalActions: {
    flexDirection: 'row',
    gap: 12
  },
  approveModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  approveModalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  approveModalConfirmButton: {
    backgroundColor: colors.success
  },
  approveModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text
  },
  approveModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  rejectModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8
  },
  rejectModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20
  },
  rejectInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    minHeight: 100,
    marginBottom: 20
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: 12
  },
  rejectModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rejectModalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  rejectModalConfirmButton: {
    backgroundColor: colors.error
  },
  rejectModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text
  },
  rejectModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  }
})
