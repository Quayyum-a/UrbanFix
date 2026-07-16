// Technician jobs list screen
// Displays available and assigned jobs for the technician
// Requirements: 6.1-6.4, 13.1-13.5

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography, radius, shadows } from '@/constants/theme'
import { useAuth } from '@/hooks/useAuth'
import { useJobs } from '@/hooks/useJobs'
import { useRouter } from 'expo-router'

type TabType = 'available' | 'active'

export default function TechnicianJobsScreen() {
  const router = useRouter()
  const { userProfile } = useAuth()
  const {
    availableJobs,
    availableJobsLoading,
    availableJobsError,
    fetchAvailableJobs,
    technicianJobs,
    technicianJobsLoading,
    fetchTechnicianJobs,
    acceptJob,
    fetchJobDetails,
    currentJob,
  } = useJobs({ technicianId: userProfile?.id, autoFetch: true })

  const [activeTab, setActiveTab] = useState<TabType>('available')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [showJobModal, setShowJobModal] = useState(false)
  const [processingJobId, setProcessingJobId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    if (activeTab === 'available') {
      await fetchAvailableJobs(selectedCategory || undefined)
    } else {
      await fetchTechnicianJobs()
    }
    setRefreshing(false)
  }, [activeTab, selectedCategory, fetchAvailableJobs, fetchTechnicianJobs])

  const handleViewJobDetails = useCallback((job: any) => {
    setSelectedJob(job)
    setShowJobModal(true)
  }, [])

  const handleAcceptJob = useCallback(async (jobId: string) => {
    Alert.alert(
      'Accept Job',
      'Are you sure you want to accept this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setProcessingJobId(jobId)
            try {
              const success = await acceptJob(jobId)
              if (success) {
                Alert.alert('Success', 'Job accepted! Check your active jobs.')
                setShowJobModal(false)
                setSelectedJob(null)
                await fetchAvailableJobs(selectedCategory || undefined)
              } else {
                Alert.alert('Error', 'Failed to accept job. It may have been taken by another technician.')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to accept job')
            } finally {
              setProcessingJobId(null)
            }
          }
        }
      ]
    )
  }, [acceptJob, fetchAvailableJobs, selectedCategory])

  const renderJobCard = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => handleViewJobDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.jobCardTop}>
        <View style={styles.jobHeader}>
          <Text style={styles.deviceName}>
            {item.device_brand} {item.device_model}
          </Text>
          <Text style={styles.category}>{item.repair_category}</Text>
        </View>
        <View style={styles.priceTag}>
          <Text style={styles.price}>₦{item.total_price?.toLocaleString('en-NG') || '0'}</Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.pickup_address}
          </Text>
        </View>

        {item.customer_rating && (
          <View style={styles.detailItem}>
            <Ionicons name="star-outline" size={16} color={colors.warning} />
            <Text style={styles.detailText}>
              {item.customer_rating.toFixed(1)} rating
            </Text>
          </View>
        )}

        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {activeTab === 'available' && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptJob(item.id)}
            disabled={processingJobId === item.id}
          >
            {processingJobId === item.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {activeTab === 'active' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [activeTab, handleViewJobDetails, handleAcceptJob, processingJobId])

  const jobs = activeTab === 'available' ? availableJobs : technicianJobs
  const loading = activeTab === 'available' ? availableJobsLoading : technicianJobsLoading
  const error = activeTab === 'available' ? availableJobsError : null

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Jobs</Text>
          <Text style={styles.subtitle}>
            {activeTab === 'available' ? 'Find repair jobs' : 'Your active jobs'}
          </Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.tabActive]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabLabel, activeTab === 'available' && styles.tabLabelActive]}>
            Available
          </Text>
          <View style={[styles.tabIndicator, activeTab === 'available' && styles.tabIndicatorActive]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabLabel, activeTab === 'active' && styles.tabLabelActive]}>
            Active
          </Text>
          <View style={[styles.tabIndicator, activeTab === 'active' && styles.tabIndicatorActive]} />
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>Loading jobs...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons
                name={activeTab === 'available' ? 'briefcase-outline' : 'construct-outline'}
                size={48}
                color={colors.text.secondary}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'available' ? 'No Available Jobs' : 'No Active Jobs'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'available'
                  ? 'Check back soon for new repair requests'
                  : 'Accept jobs from the available list'}
              </Text>
            </View>
          )
        }
      />

      {/* Job Details Modal */}
      <Modal
        visible={showJobModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowJobModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedJob && (
              <ScrollView style={styles.modalScroll}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowJobModal(false)}>
                    <Ionicons name="close" size={24} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Job Details</Text>
                  <View style={{ width: 24 }} />
                </View>

                {/* Device Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Device</Text>
                  <View style={styles.infoBox}>
                    <Text style={styles.label}>Brand & Model</Text>
                    <Text style={styles.value}>
                      {selectedJob.device_brand} {selectedJob.device_model}
                    </Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.label}>Repair Type</Text>
                    <Text style={styles.value}>{selectedJob.repair_category}</Text>
                  </View>
                </View>

                {/* Pricing Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Pricing</Text>
                  <View style={styles.priceBreakdown}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Parts</Text>
                      <Text style={styles.priceValue}>
                        ₦{selectedJob.part_price?.toLocaleString('en-NG') || '0'}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Your Labor</Text>
                      <Text style={styles.priceValue}>
                        ₦{selectedJob.labour_price?.toLocaleString('en-NG') || '0'}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Platform Fee</Text>
                      <Text style={styles.priceValue}>
                        ₦{selectedJob.platform_fee?.toLocaleString('en-NG') || '0'}
                      </Text>
                    </View>
                    <View style={[styles.priceRow, styles.totalRow]}>
                      <Text style={styles.priceLabel}>Total</Text>
                      <Text style={styles.priceValueTotal}>
                        ₦{selectedJob.total_price?.toLocaleString('en-NG') || '0'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <View style={styles.infoBox}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                    <Text style={styles.value}>{selectedJob.pickup_address}</Text>
                  </View>
                </View>

                {/* Customer Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Customer</Text>
                  <View style={styles.infoBox}>
                    <Text style={styles.label}>Rating</Text>
                    <Text style={styles.value}>
                      ⭐ {selectedJob.customer_rating?.toFixed(1) || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Action Button */}
                {activeTab === 'available' && (
                  <TouchableOpacity
                    style={styles.acceptJobButton}
                    onPress={() => handleAcceptJob(selectedJob.id)}
                    disabled={processingJobId === selectedJob.id}
                  >
                    {processingJobId === selectedJob.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.acceptJobButtonText}>Accept This Job</Text>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {},
  tabLabel: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabIndicator: {
    width: '100%',
    height: 3,
    marginTop: spacing.xs,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: colors.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.level1,
  },
  jobCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  jobHeader: {
    flex: 1,
  },
  deviceName: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
  },
  category: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  priceTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  price: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '700',
  },
  jobDetails: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  acceptButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  acceptButtonText: {
    ...typography.buttonText,
    color: '#fff',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: colors.secondary + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  statusText: {
    ...typography.labelMd,
    color: colors.secondary,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  retryButtonText: {
    ...typography.buttonText,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    marginTop: spacing.lg,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  modalScroll: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  infoBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  value: {
    ...typography.bodyMd,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  priceBreakdown: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary + '10',
  },
  priceLabel: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  priceValue: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  priceValueTotal: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
  },
  acceptJobButton: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  acceptJobButtonText: {
    ...typography.buttonText,
    color: '#fff',
    fontWeight: '700',
  },
})
