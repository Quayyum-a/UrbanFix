// Technician Verification Management Screen
// Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
// Admin interface for reviewing and approving/rejecting technician verifications

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
  ScrollView,
  Image,
  Linking
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import theme from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface TechnicianVerification {
  id: string
  user_id: string
  full_name: string
  phone: string
  nin: string
  nin_document_url: string
  guarantor_name: string
  guarantor_phone: string
  guarantor_address: string
  bank_name: string
  account_number: string
  account_name: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  rejection_reason?: string
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

export default function TechnicianVerificationsScreen() {
  const userProfile = useAuthStore(state => state.userProfile)
  const [verifications, setVerifications] = useState<TechnicianVerification[]>([])
  const [filteredVerifications, setFilteredVerifications] = useState<TechnicianVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending')
  const [selectedVerification, setSelectedVerification] = useState<TechnicianVerification | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadVerifications()
  }, [])

  useEffect(() => {
    filterVerifications()
  }, [activeFilter, verifications])

  const loadVerifications = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('technician_verifications')
        .select(`
          id,
          user_id,
          nin,
          nin_document_url,
          guarantor_name,
          guarantor_phone,
          guarantor_address,
          bank_name,
          account_number,
          account_name,
          status,
          rejection_reason,
          created_at,
          users!inner (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formatted = data?.map((v: any) => ({
        id: v.id,
        user_id: v.user_id,
        full_name: v.users.full_name,
        phone: v.users.phone,
        nin: v.nin,
        nin_document_url: v.nin_document_url,
        guarantor_name: v.guarantor_name,
        guarantor_phone: v.guarantor_phone,
        guarantor_address: v.guarantor_address,
        bank_name: v.bank_name,
        account_number: v.account_number,
        account_name: v.account_name,
        status: v.status,
        rejection_reason: v.rejection_reason,
        created_at: v.created_at
      })) || []

      setVerifications(formatted)
    } catch (error) {
      console.error('Error loading verifications:', error)
      Alert.alert('Error', 'Failed to load verifications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterVerifications = () => {
    if (activeFilter === 'all') {
      setFilteredVerifications(verifications)
    } else {
      setFilteredVerifications(verifications.filter(v => v.status === activeFilter))
    }
  }

  const handleApprove = async (verification: TechnicianVerification) => {
    Alert.alert(
      'Approve Verification',
      `Approve ${verification.full_name} as a verified technician?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: () => processApproval(verification)
        }
      ]
    )
  }

  const processApproval = async (verification: TechnicianVerification) => {
    try {
      setProcessing(true)

      // Update verification status
      const { error: verificationError } = await supabase
        .from('technician_verifications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', verification.id)

      if (verificationError) throw verificationError

      // Update technician profile verification status
      const { error: profileError } = await supabase
        .from('technician_profiles')
        .update({
          verification_status: 'approved'
        })
        .eq('user_id', verification.user_id)

      if (profileError) throw profileError

      Alert.alert('Success', 'Technician approved successfully')
      setSelectedVerification(null)
      loadVerifications()
    } catch (error) {
      console.error('Error approving verification:', error)
      Alert.alert('Error', 'Failed to approve verification')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = (verification: TechnicianVerification) => {
    setSelectedVerification(verification)
    setShowRejectModal(true)
  }

  const processRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason')
      return
    }

    if (!selectedVerification) return

    try {
      setProcessing(true)

      // Update verification status
      const { error: verificationError } = await supabase
        .from('technician_verifications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', selectedVerification.id)

      if (verificationError) throw verificationError

      // Update technician profile verification status
      const { error: profileError } = await supabase
        .from('technician_profiles')
        .update({
          verification_status: 'rejected'
        })
        .eq('user_id', selectedVerification.user_id)

      if (profileError) throw profileError

      Alert.alert('Success', 'Verification rejected')
      setShowRejectModal(false)
      setRejectionReason('')
      setSelectedVerification(null)
      loadVerifications()
    } catch (error) {
      console.error('Error rejecting verification:', error)
      Alert.alert('Error', 'Failed to reject verification')
    } finally {
      setProcessing(false)
    }
  }

  const openDocument = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open document')
    })
  }

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderVerification = ({ item }: { item: TechnicianVerification }) => (
    <TouchableOpacity
      style={styles.verificationCard}
      onPress={() => setSelectedVerification(item)}
      activeOpacity={0.7}
    >
      <View style={styles.verificationHeader}>
        <View style={styles.verificationInfo}>
          <Text style={styles.verificationName}>{item.full_name}</Text>
          <Text style={styles.verificationPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.verificationDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>NIN: {item.nin}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{item.bank_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.verificationActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item)}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="shield-checkmark-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>No {activeFilter === 'all' ? '' : activeFilter} verifications</Text>
      <Text style={styles.emptyText}>
        {activeFilter === 'pending' 
          ? 'All caught up! No pending verifications to review.'
          : `No ${activeFilter} verifications found.`}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading verifications...</Text>
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
                  {verifications.filter(v => v.status === filter).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Verifications List */}
      <FlatList
        data={filteredVerifications}
        renderItem={renderVerification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              loadVerifications()
            }}
            tintColor={theme.colors.primary}
          />
        }
      />

      {/* Verification Detail Modal */}
      <Modal
        visible={!!selectedVerification && !showRejectModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedVerification(null)}
      >
        {selectedVerification && (
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedVerification(null)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Verification Details</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.modalContent}>
              {/* Personal Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Personal Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{selectedVerification.full_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedVerification.phone}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>NIN</Text>
                  <Text style={styles.detailValue}>{selectedVerification.nin}</Text>
                </View>
              </View>

              {/* NIN Document */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>NIN Document</Text>
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={() => openDocument(selectedVerification.nin_document_url)}
                >
                  <Ionicons name="document-text" size={24} color={theme.colors.primary} />
                  <Text style={styles.documentButtonText}>View NIN Document</Text>
                  <Ionicons name="open-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Guarantor Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Guarantor Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{selectedVerification.guarantor_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedVerification.guarantor_phone}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{selectedVerification.guarantor_address}</Text>
                </View>
              </View>

              {/* Bank Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Bank Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bank Name</Text>
                  <Text style={styles.detailValue}>{selectedVerification.bank_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Account Number</Text>
                  <Text style={styles.detailValue}>{selectedVerification.account_number}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Account Name</Text>
                  <Text style={styles.detailValue}>{selectedVerification.account_name}</Text>
                </View>
              </View>

              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Status</Text>
                <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedVerification.status) + '20' }]}>
                  <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedVerification.status) }]}>
                    {selectedVerification.status.charAt(0).toUpperCase() + selectedVerification.status.slice(1)}
                  </Text>
                </View>
                {selectedVerification.rejection_reason && (
                  <View style={styles.rejectionReasonBox}>
                    <Text style={styles.rejectionReasonLabel}>Rejection Reason:</Text>
                    <Text style={styles.rejectionReasonText}>{selectedVerification.rejection_reason}</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              {selectedVerification.status === 'pending' && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalApproveButton]}
                    onPress={() => handleApprove(selectedVerification)}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                        <Text style={styles.modalActionButtonText}>Approve Verification</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalRejectButton]}
                    onPress={() => handleReject(selectedVerification)}
                    disabled={processing}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                    <Text style={styles.modalActionButtonText}>Reject Verification</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>Reject Verification</Text>
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
    backgroundColor: theme.colors.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 12
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    borderBottomColor: theme.colors.primary
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary
  },
  filterTextActive: {
    color: theme.colors.primary,
    fontWeight: '600'
  },
  filterBadge: {
    backgroundColor: theme.colors.error,
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
  verificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  verificationInfo: {
    flex: 1
  },
  verificationName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  verificationPhone: {
    fontSize: 14,
    color: theme.colors.textSecondary
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
  verificationDetails: {
    gap: 8,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  verificationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
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
    backgroundColor: theme.colors.success
  },
  rejectButton: {
    backgroundColor: theme.colors.error
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
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fff'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text
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
    color: theme.colors.text,
    marginBottom: 12
  },
  detailItem: {
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 8,
    padding: 16,
    gap: 12
  },
  documentButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.primary
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
    backgroundColor: theme.colors.error + '10',
    borderRadius: 8,
    padding: 12
  },
  rejectionReasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.error,
    marginBottom: 4
  },
  rejectionReasonText: {
    fontSize: 14,
    color: theme.colors.text,
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
    backgroundColor: theme.colors.success
  },
  modalRejectButton: {
    backgroundColor: theme.colors.error
  },
  modalActionButtonText: {
    fontSize: 16,
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
    color: theme.colors.text,
    marginBottom: 8
  },
  rejectModalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20
  },
  rejectInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
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
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  rejectModalConfirmButton: {
    backgroundColor: theme.colors.error
  },
  rejectModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text
  },
  rejectModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  }
})
