// Technician Management Screen
// Unified interface for reviewing and approving/rejecting technician verifications
// Combines the best features of verifications.tsx and technician-approval.tsx

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
import { colors, spacing, radius, shadows } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface TechnicianVerification {
  id: string
  user_id: string
  full_name: string
  phone: string
  avatar_url?: string
  nin: string
  nin_doc_url?: string
  shop_address: string
  bank_name: string
  account_number: string
  account_name: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  rejection_reason?: string
  is_available: boolean
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

export default function TechnicianManagementScreen() {
  const userProfile = useAuthStore(state => state.userProfile)
  const user = useAuthStore(state => state.user)
  const [technicians, setTechnicians] = useState<TechnicianVerification[]>([])
  const [filteredTechnicians, setFilteredTechnicians] = useState<TechnicianVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending')
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianVerification | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)

  useEffect(() => {
    loadTechnicians()
    setupSubscription()
  }, [])

  useEffect(() => {
    return () => {
      // Clean up subscription
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    filterTechnicians()
  }, [activeFilter, technicians])

  const loadTechnicians = async () => {
    try {
      setLoading(true)

      // Query technician_profiles which has the actual verification data
      const { data: profilesData, error: profilesError } = await supabase
        .from('technician_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      if (!profilesData || profilesData.length === 0) {
        setTechnicians([])
        return
      }

      // Get user info for all technicians
      const userIds = profilesData.map(p => p.user_id)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, phone, avatar_url')
        .in('id', userIds)

      if (usersError) throw usersError

      const userMap = new Map(usersData?.map(u => [u.id, u]) || [])

      const formatted = profilesData.map((profile: any) => {
        const user = userMap.get(profile.user_id)
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: user?.full_name || 'Unknown',
          phone: user?.phone || 'N/A',
          avatar_url: user?.avatar_url,
          nin: profile.nin,
          nin_doc_url: profile.nin_doc_url,
          shop_address: profile.shop_address || 'Not provided',
          bank_name: profile.bank_name || 'Not provided',
          account_number: profile.bank_account_number || 'Not provided',
          account_name: profile.bank_account_name || 'Not provided',
          status: profile.verification_status,
          rejection_reason: profile.rejection_reason,
          created_at: profile.created_at,
          is_available: profile.is_available
        }
      })

      setTechnicians(formatted)
    } catch (error) {
      console.error('Error loading technicians:', error)
      Alert.alert('Error', 'Failed to load technicians')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const setupSubscription = () => {
    // Subscribe to changes in technician_verifications table
    const newSubscription = supabase
      .channel('tech_verifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'technician_verifications'
        },
        () => {
          // Refresh data when changes occur
          loadTechnicians()
        }
      )
      .subscribe()

    setSubscription(newSubscription)
  }

  const filterTechnicians = () => {
    if (activeFilter === 'all') {
      setFilteredTechnicians(technicians)
    } else {
      setFilteredTechnicians(technicians.filter(t => t.status === activeFilter))
    }
  }

  const handleApprove = async (technician: TechnicianVerification) => {
    Alert.alert(
      'Approve Technician',
      `Approve ${technician.full_name} as a verified technician?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: () => processApproval(technician)
        }
      ]
    )
  }

  const processApproval = async (technician: TechnicianVerification) => {
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
        .eq('id', technician.id)

      if (verificationError) throw verificationError

      // Update technician profile verification status
      const { error: profileError } = await supabase
        .from('technician_profiles')
        .update({
          verification_status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('user_id', technician.user_id)

      if (profileError) throw profileError

      // Send notification to technician (in a real app)

      Alert.alert('Success', `Technician ${technician.full_name} approved successfully`)
      setSelectedTechnician(null)
      loadTechnicians()
    } catch (error) {
      console.error('Error approving technician:', error)
      Alert.alert('Error', 'Failed to approve technician')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = (technician: TechnicianVerification) => {
    setSelectedTechnician(technician)
    setShowRejectModal(true)
  }

  const processRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason')
      return
    }

    if (!selectedTechnician) return

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
        .eq('id', selectedTechnician.id)

      if (verificationError) throw verificationError

      // Update technician profile verification status
      const { error: profileError } = await supabase
        .from('technician_profiles')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('user_id', selectedTechnician.user_id)

      if (profileError) throw profileError

      Alert.alert('Success', 'Technician rejected')
      setShowRejectModal(false)
      setRejectionReason('')
      setSelectedTechnician(null)
      loadTechnicians()
    } catch (error) {
      console.error('Error rejecting technician:', error)
      Alert.alert('Error', 'Failed to reject technician')
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
        return colors.warning
      case 'approved':
        return colors.success
      case 'rejected':
        return colors.error
      default:
        return colors.textSecondary
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

  const renderTechnician = ({ item }: { item: TechnicianVerification }) => (
    <TouchableOpacity
      style={styles.technicianCard}
      onPress={() => setSelectedTechnician(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-circle" size={56} color="#ccc" />
          </View>
        )}

        <View style={styles.technicianInfo}>
          <Text style={styles.technicianName}>{item.full_name}</Text>
          <Text style={styles.technicianShop} numberOfLines={1}>{item.shop_address}</Text>
          <View style={styles.timeInfo}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        {item.status === 'pending' ? (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => setSelectedTechnician(item)}
          >
            <Text style={styles.reviewButtonText}>Review</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusTextSmall, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="shield-checkmark-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No {activeFilter === 'all' ? '' : activeFilter} technicians</Text>
      <Text style={styles.emptyText}>
        {activeFilter === 'pending'
          ? 'All caught up! No pending technician approvals.'
          : `No ${activeFilter} technicians found.`}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading technicians for approval...</Text>
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
                  {technicians.filter(t => t.status === filter).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Technicians List */}
      <FlatList
        data={filteredTechnicians}
        renderItem={renderTechnician}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              loadTechnicians()
            }}
            tintColor={colors.primary}
          />
        }
      />

      {/* Technician Detail Modal */}
      <Modal
        visible={!!selectedTechnician && !showRejectModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTechnician(null)}
      >
        {selectedTechnician && (
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedTechnician(null)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Technician Details</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.modalContent}>
              {/* Personal Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Personal Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{selectedTechnician.full_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedTechnician.phone}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>NIN</Text>
                  <Text style={styles.detailValue}>{selectedTechnician.nin}</Text>
                </View>
              </View>

              {/* NIN Document */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>NIN Document</Text>
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={() => openDocument(selectedTechnician.nin_document_url)}
                >
                  <Ionicons name="document-text" size={24} color={colors.primary} />
                  <Text style={styles.documentButtonText}>View NIN Document</Text>
                  <Ionicons name="open-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Guarantor Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Guarantor Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{selectedTechnician.guarantor_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedTechnician.guarantor_phone}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{selectedTechnician.guarantor_address}</Text>
                </View>
              </View>

              {/* Bank Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Bank Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bank Name</Text>
                  <Text style={styles.detailValue}>{selectedTechnician.bank_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Account Number</Text>
                  <Text style={styles.detailValue}>{selectedTechnician.account_number}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Account Name</Text>
                  <Text style={styles.detailValue}>{selectedTechnician.account_name}</Text>
                </View>
              </View>

              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Status</Text>
                <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedTechnician.status) + '20' }]}>
                  <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedTechnician.status) }]}>
                    {selectedTechnician.status.charAt(0).toUpperCase() + selectedTechnician.status.slice(1)}
                  </Text>
                </View>
                {selectedTechnician.rejection_reason && (
                  <View style={styles.rejectionReasonBox}>
                    <Text style={styles.rejectionReasonLabel}>Rejection Reason:</Text>
                    <Text style={styles.rejectionReasonText}>{selectedTechnician.rejection_reason}</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              {selectedTechnician.status === 'pending' && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalApproveButton]}
                    onPress={() => handleApprove(selectedTechnician)}
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
                    onPress={() => handleReject(selectedTechnician)}
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
            <Text style={styles.rejectModalTitle}>Reject Technician</Text>
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
  technicianCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f4f8'
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f4f8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  technicianInfo: {
    flex: 1
  },
  technicianName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#191c1e',
    marginBottom: 2
  },
  technicianShop: {
    fontSize: 12,
    color: '#434653',
    marginBottom: 6
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  timeText: {
    fontSize: 11,
    color: '#737685'
  },
  reviewButton: {
    backgroundColor: '#0047bb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  statusBadgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600'
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
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    padding: 16,
    gap: 12
  },
  documentButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary
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
    fontWeight: 600,
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
    fontWeight: 700,
    color: colors.text
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
