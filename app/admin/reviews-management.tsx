// Reviews Management Screen
// Admin interface for managing customer reviews of technicians

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
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface Review {
  id: string
  job_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string
  created_at: string
  // Related data (joined)
  reviewer_name?: string
  reviewee_name?: string
  job_device_brand?: string
  job_device_model?: string
  job_repair_category?: string
  // Moderation fields (to be added via migration)
  is_hidden?: boolean
  flagged?: boolean
  moderated_by?: string
  moderated_at?: string
  moderation_note?: string
  // Response fields
  response?: string
  responded_by?: string
  responded_at?: string
}

type FilterType = 'all' | 'visible' | 'hidden' | 'flagged'

export default function ReviewsManagementScreen() {
  const userProfile = useAuthStore(state => state.userProfile)
  const user = useAuthStore(state => state.user)
  const [reviews, setReviews] = useState<Review[]>([])
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<'hide' | 'flag' | 'unhide' | 'unflag' | null>(null)
  const [responseText, setResponseText] = useState('')
  const [moderationNote, setModerationNote] = useState('')
  const [processing, setProcessing] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)

  useEffect(() => {
    loadReviews()
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
    filterReviews()
  }, [activeFilter, reviews])

  const loadReviews = async () => {
    try {
      setLoading(true)

      // Fetch reviews with related data
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, job_id, reviewer_id, reviewee_id, rating, comment, created_at')
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError

      if (!reviewsData) {
        setReviews([])
        return
      }

      // Fetch all related users in one query
      const userIds = new Set<string>()
      reviewsData.forEach(r => {
        userIds.add(r.reviewer_id)
        userIds.add(r.reviewee_id)
      })

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', Array.from(userIds))

      if (usersError) throw usersError

      const userMap = new Map(usersData?.map(u => [u.id, u.full_name]) || [])

      // Fetch all related jobs in one query
      const jobIds = new Set(reviewsData.map(r => r.job_id))
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, device_brand, device_model, repair_category')
        .in('id', Array.from(jobIds))

      if (jobsError) throw jobsError

      const jobMap = new Map(jobsData?.map(j => [j.id, j]) || [])

      const formatted = reviewsData.map(r => ({
        id: r.id,
        job_id: r.job_id,
        reviewer_id: r.reviewer_id,
        reviewee_id: r.reviewee_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        is_hidden: false,
        flagged: false,
        moderated_by: undefined,
        moderated_at: undefined,
        moderation_note: undefined,
        response: undefined,
        responded_by: undefined,
        responded_at: undefined,
        reviewer_name: userMap.get(r.reviewer_id),
        reviewee_name: userMap.get(r.reviewee_id),
        job_device_brand: jobMap.get(r.job_id)?.device_brand,
        job_device_model: jobMap.get(r.job_id)?.device_model,
        job_repair_category: jobMap.get(r.job_id)?.repair_category
      }))

      setReviews(formatted)
    } catch (error) {
      console.error('Error loading reviews:', error)
      Alert.alert('Error', 'Failed to load reviews')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const setupSubscription = () => {
    // Subscribe to changes in reviews table
    const newSubscription = supabase
      .channel('reviews_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'reviews'
        },
        () => {
          // Refresh data when changes occur
          loadReviews()
        }
      )
      .subscribe()

    setSubscription(newSubscription)
  }

  const filterReviews = () => {
    switch (activeFilter) {
      case 'all':
        setFilteredReviews(reviews)
        break
      case 'visible':
        setFilteredReviews(reviews.filter(r => r.is_hidden !== true))
        break
      case 'hidden':
        setFilteredReviews(reviews.filter(r => r.is_hidden === true))
        break
      case 'flagged':
        setFilteredReviews(reviews.filter(r => r.flagged === true))
        break
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={colors.warning}
        />
      )
    }
    return stars
  }

  const handleReviewPress = (review: Review) => {
    setSelectedReview(review)
    setShowDetailModal(true)
  }

  const handleHideReview = (review: Review) => {
    setSelectedReview(review)
    setActionType('hide')
    setShowActionModal(true)
  }

  const handleUnhideReview = (review: Review) => {
    setSelectedReview(review)
    setActionType('unhide')
    setShowActionModal(true)
  }

  const handleFlagReview = (review: Review) => {
    setSelectedReview(review)
    setActionType('flag')
    setShowActionModal(true)
  }

  const handleUnflagReview = (review: Review) => {
    setSelectedReview(review)
    setActionType('unflag')
    setShowActionModal(true)
  }

  const processAction = async () => {
    if (!selectedReview) return

    try {
      setProcessing(true)

      let updates: any = {}
      switch (actionType) {
        case 'hide':
          updates = { is_hidden: true }
          break
      case 'unhide':
          updates = { is_hidden: false }
          break
        case 'flag':
          updates = { flagged: true }
          break
        case 'unflag':
          updates = { flagged: false }
          break
      }

      // Add moderation metadata
      updates = {
        ...updates,
        moderated_by: user?.id,
        moderated_at: new Date().toISOString(),
        moderation_note: moderationNote.trim() || null
      }

      const { error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', selectedReview.id)

      if (error) throw error

      Alert.alert('Success', 'Review updated successfully')
      setShowActionModal(false)
      setActionType(null)
      setModerationNote('')
      setSelectedReview(null)
      loadReviews()
    } catch (error) {
      console.error('Error updating review:', error)
      Alert.alert('Error', 'Failed to update review')
    } finally {
      setProcessing(false)
    }
  }

  const handleSendResponse = async () => {
    if (!selectedReview) return
    if (!responseText.trim()) {
      Alert.alert('Error', 'Please enter a response')
      return
    }

    try {
      setProcessing(true)

      // In a real implementation, we would have a separate responses table
      // For this implementation, we'll add response fields to the reviews table
      // This requires a database migration to add these columns

      const { error } = await supabase
        .from('reviews')
        .update({
          response: responseText.trim(),
          responded_by: user?.id,
          responded_at: new Date().toISOString()
        })
        .eq('id', selectedReview.id)

      if (error) throw error

      Alert.alert('Success', 'Response sent successfully')
      setShowDetailModal(false)
      setResponseText('')
      setSelectedReview(null)
      loadReviews()
    } catch (error) {
      console.error('Error sending response:', error)
      Alert.alert('Error', 'Failed to send response')
    } finally {
      setProcessing(false)
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

  const renderReviewItem = ({ item }: { item: Review }) => (
    <TouchableOpacity
      style={styles.reviewCard}
      onPress={() => handleReviewPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.reviewContent}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewerInfo}>
            <Text style={styles.reviewerName}>
              {item.reviewer_name || 'Anonymous'}
            </Text>
            {item.is_hidden && (
              <View style={styles.hiddenBadge}>
                <Text style={styles.hiddenBadgeText}>HIDDEN</Text>
              </View>
            )}
            {item.flagged && (
              <View style={styles.flaggedBadge}>
                <Text style={styles.flaggedBadgeText}>FLAGGED</Text>
              </View>
            )}
          </View>
          <View style={styles.reviewStats}>
            <View style={styles.ratingContainer}>
              {renderStars(item.rating)}
              <Text style={styles.ratingText}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
            <Text style={styles.reviewDate}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>

        {item.comment && (
          <Text style={styles.reviewComment}>
            {item.comment}
          </Text>
        )}

        <View style={styles.reviewMeta}>
          <Text style={styles.metaText}>
            {item.job_repair_category} • {item.job_device_brand} {item.job_device_model}
          </Text>
        </View>

        {/* Response indicator */}
        {item.response && (
          <View style={styles.responseIndicator}>
            <Ionicons name="chatbubbles" size={16} color={colors.primary} />
            <Text style={styles.responseText}>Developer Response</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No {getFilterLabel()} reviews</Text>
      <Text style={styles.emptyText}>
        {activeFilter === 'all'
          ? 'No reviews found yet.'
          : `No ${getFilterLabel().toLowerCase()} reviews found.`}
      </Text>
    </View>
  )

  const getFilterLabel = () => {
    switch (activeFilter) {
      case 'all': return 'Reviews'
      case 'visible': return 'Visible'
      case 'hidden': return 'Hidden'
      case 'flagged': return 'Flagged'
      default: return 'Reviews'
    }
  }

  const getActionTitle = (): string => {
    switch (actionType) {
      case 'hide': return 'Hide Review'
      case 'unhide': return 'Unhide Review'
      case 'flag': return 'Flag Review'
      case 'unflag': return 'Unflag Review'
      default: return 'Action'
    }
  }

  const getActionDescription = (): string => {
    switch (actionType) {
      case 'hide': return 'Hide this review from public view. It will still be accessible in the admin panel.'
      case 'unhide': return 'Make this review visible to the public again.'
      case 'flag': return 'Mark this review for further investigation.'
      case 'unflag': return 'Remove the flag from this review.'
      default: return 'Confirm this action.'
    }
  }

  const getActionConfirmationText = (): string => {
    switch (actionType) {
      case 'hide': return 'Hide Review'
      case 'unhide': return 'Unhide Review'
      case 'flag': return 'Flag Review'
      case 'unflag': return 'Unflag Review'
      default: return 'Confirm'
    }
  }

  const getFilterLabelForTab = (filter: FilterType): string => {
    switch (filter) {
      case 'all': return 'All'
      case 'visible': return 'Visible'
      case 'hidden': return 'Hidden'
      case 'flagged': return 'Flagged'
      default: return 'All'
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reviews Management</Text>
        <Text style={styles.headerSubtitle}>
          Monitor and moderate customer reviews
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'visible', 'hidden', 'flagged'] as FilterType[]).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.filterTabActive
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === filter && styles.filterTextActive
            ]}>
              {getFilterLabelForTab(filter)}
            </Text>
            {filter !== 'all' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {filteredReviews.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Reviews List */}
      <FlatList
        data={filteredReviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              loadReviews()
            }}
            tintColor={colors.primary}
          />
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowDetailModal(false)
          setSelectedReview(null)
          setResponseText('')
        }}
      >
        {selectedReview && (
          <ScrollView style={styles.detailModalContainer}>
            <View style={styles.detailModalHeader}>
              <TouchableOpacity onPress={() => {
                setShowDetailModal(false)
                setSelectedReview(null)
                setResponseText('')
              }}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.detailModalTitle}>Review Details</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.detailModalContent}>
              {/* Reviewer Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Reviewer Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Reviewer</Text>
                  <Text style={styles.detailValue}>
                    {selectedReview.reviewer_name || 'Anonymous'}
                  </Text>
                </View>
              </View>

              {/* Reviewee Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Technician Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Technician</Text>
                  <Text style={styles.detailValue}>
                    {selectedReview.reviewee_name}
                  </Text>
                </View>
              </View>

              {/* Review Details */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Review Details</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Rating</Text>
                  <View style={styles.ratingContainer}>
                    {renderStars(selectedReview.rating)}
                    <Text style={styles.ratingText}>
                      {selectedReview.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedReview.created_at)}
                  </Text>
                </View>
                {selectedReview.comment && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Comment</Text>
                    <Text style={styles.detailValue}>
                      {selectedReview.comment}
                    </Text>
                  </View>
                )}
              </View>

              {/* Job Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Job Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Device</Text>
                  <Text style={styles.detailValue}>
                    {selectedReview.job_device_brand} {selectedReview.job_device_model}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Repair Type</Text>
                  <Text style={styles.detailValue}>
                    {selectedReview.job_repair_category}
                  </Text>
                </View>
              </View>

              {/* Existing Response */}
              {selectedReview.response && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Developer Response</Text>
                  <View style={styles.responseContainer}>
                    <Text style={styles.responseLabel}>Response:</Text>
                    <Text style={styles.responseText}>
                      {selectedReview.response}
                    </Text>
                    {selectedReview.responded_at && (
                      <Text style={styles.responseMeta}>
                        Responded on {formatDate(selectedReview.responded_at)}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Response Input */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Respond to Review</Text>
                <View style={styles.responseInputContainer}>
                  <TextInput
                    style={styles.responseInput}
                    placeholder="Write your response..."
                    value={responseText}
                    onChangeText={setResponseText}
                    multiline
                    numberOfLines={4}
                  />
                  <TouchableOpacity
                    style={styles.sendResponseButton}
                    onPress={handleSendResponse}
                    disabled={processing || !responseText.trim()}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowActionModal(false)
          setActionType(null)
          setModerationNote('')
        }}
      >
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModalContent}>
            <Text style={styles.actionModalTitle}>
              {getActionTitle()}
            </Text>
            <Text style={styles.actionModalSubtitle}>
              {getActionDescription()}
            </Text>

            {(actionType === 'hide' || actionType === 'flag') && (
              <View style={styles.noteContainer}>
                <Text style={styles.noteLabel}>Optional Note:</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Add a note for moderation purposes..."
                  value={moderationNote}
                  onChangeText={setModerationNote}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            <View style={styles.actionModalActions}>
              <TouchableOpacity
                style={[styles.actionModalButton, styles.actionModalCancelButton]}
                onPress={() => {
                  setShowActionModal(false)
                  setActionType(null)
                  setModerationNote('')
                }}
                disabled={processing}
              >
                <Text style={styles.actionModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionModalButton, styles.actionModalConfirmButton]}
                onPress={processAction}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionModalConfirmText}>
                    {getActionConfirmationText()}
                  </Text>
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
  header: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary
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
  reviewCard: {
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
  reviewContent: {
    flex: 1
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  reviewerInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  hiddenBadge: {
    backgroundColor: colors.error + '20',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8
  },
  hiddenBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.error
  },
  flaggedBadge: {
    backgroundColor: colors.warning + '20',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8
  },
  flaggedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning
  },
  reviewStats: {
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textSecondary
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12
  },
  reviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.primary + '20',
    borderRadius: 4
  },
  responseText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary
  },
  // Detail Modal Styles
  detailModalContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff'
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4
  },
  detailModalContent: {
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
  responseContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8
  },
  responseText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20
  },
  responseMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4
  },
  responseInputContainer: {
    marginTop: 16
  },
  responseInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 100
  },
  sendResponseButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12
  },
  // Action Modal Styles
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  actionModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400
  },
  actionModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20
  },
  noteContainer: {
    marginBottom: 20
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4
  },
  noteInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 80
  },
  actionModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24
  },
  actionModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8
  },
  actionModalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  actionModalConfirmButton: {
    backgroundColor: colors.primary
  },
  actionModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text
  },
  actionModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  }
})
