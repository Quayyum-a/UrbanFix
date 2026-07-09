import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { PricingBreakdown } from '@/components/ui/PricingBreakdown'
import { repairCategoryLabels, estimatedRepairTimes } from '@/constants/repairCategories'

interface ConfirmScreenParams {
  deviceType: string
  brand: string
  model: string
  repairCategory: string
  partId: string
  partPrice: string
  partName: string
  technicianId: string
  technicianName: string
  labourPrice: string
  platformFee: string
  totalPrice: string
}

export default function BookingConfirmScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<ConfirmScreenParams>()
  const { userProfile } = useAuth()

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false)

  // Parse params
  const deviceType = params.deviceType || ''
  const brand = params.brand || ''
  const model = params.model || ''
  const repairCategory = params.repairCategory || ''
  const partId = params.partId || ''
  const partPrice = parseInt(params.partPrice || '0', 10)
  const partName = params.partName || ''
  const technicianId = params.technicianId || ''
  const technicianName = params.technicianName || ''
  const labourPrice = parseInt(params.labourPrice || '0', 10)
  const platformFee = parseInt(params.platformFee || '0', 10)
  const totalPrice = parseInt(params.totalPrice || '0', 10)

  const formatPrice = useCallback((price: number) => {
    return `₦${(price / 100).toLocaleString('en-NG')}`
  }, [])

  const repairLabel = repairCategoryLabels[repairCategory] || repairCategory
  const repairTime = estimatedRepairTimes[repairCategory] || 2
  const timeLabel = repairTime === 1 ? '~1 hour' : `~${repairTime} hours`

  const handleConfirmBooking = useCallback(async () => {
    if (!userProfile?.id) {
      Alert.alert('Error', 'Please log in to book a repair')
      return
    }

    setIsProcessing(true)

    try {
      // Here you would call your API to create the job
      // For now, we'll simulate the booking process
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Navigate to payment screen or success
      router.replace({
        pathname: '/customer/repair/payment',
        params: {
          deviceType,
          brand,
          model,
          repairCategory,
          partId,
          partPrice: partPrice.toString(),
          partName,
          technicianId,
          technicianName,
          labourPrice: labourPrice.toString(),
          platformFee: platformFee.toString(),
          totalPrice: totalPrice.toString(),
        },
      })
    } catch (error) {
      console.error('Booking error:', error)
      Alert.alert('Booking Failed', 'Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [
    router,
    userProfile?.id,
    deviceType,
    brand,
    model,
    repairCategory,
    partId,
    partPrice,
    partName,
    technicianId,
    technicianName,
    labourPrice,
    platformFee,
    totalPrice,
  ])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Confirm Booking</Text>
            <Text style={styles.subtitle}>Review and confirm your repair</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <View style={styles.progressSteps}>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepCompleted]} />
              <Text style={[styles.stepLabel, styles.stepCompletedText]}>Device</Text>
            </View>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepCompleted]} />
              <Text style={[styles.stepLabel, styles.stepCompletedText]}>Repair</Text>
            </View>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepCompleted]} />
              <Text style={[styles.stepLabel, styles.stepCompletedText]}>Technician</Text>
            </View>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepActive]} />
              <Text style={[styles.stepLabel, styles.stepActiveText]}>Confirm</Text>
            </View>
          </View>
        </View>

        {/* Device & Repair Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repair Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryEmoji}>{getDeviceEmoji(deviceType)}</Text>
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryDevice}>{brand} {model}</Text>
                <Text style={styles.summaryRepair}>{repairLabel}</Text>
              </View>
            </View>

            <View style={styles.summaryMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.metaText}>{timeLabel} estimated</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="construct-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.metaText}>Pickup & delivery included</Text>
              </View>
            </View>

            {partName && (
              <View style={styles.partRow}>
                <Ionicons name="cube-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.partText}>
                  Part: {partName} • {formatPrice(partPrice)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Technician Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Technician</Text>
          <View style={styles.technicianCard}>
            <View style={styles.techAvatar}>
              <Text style={styles.techInitials}>
                {technicianName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.techInfo}>
              <Text style={styles.techName}>{technicianName}</Text>
              <View style={styles.techMeta}>
                <View style={styles.techMetaItem}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={styles.techMetaText}>Verified Technician</Text>
                </View>
                <View style={styles.techMetaItem}>
                  <Ionicons name="briefcase" size={14} color={colors.text.secondary} />
                  <Text style={styles.techMetaText}>Experienced</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Pricing Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
          <PricingBreakdown
            partPrice={partPrice}
            labourPrice={labourPrice}
            platformFee={platformFee}
            totalPrice={totalPrice}
          />
        </View>

        {/* Important Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Notes</Text>
          <View style={styles.notesContainer}>
            <View style={styles.noteItem}>
              <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              <Text style={styles.noteText}>
                Payment held in escrow until repair is complete
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="time" size={18} color={colors.primary} />
              <Text style={styles.noteText}>
                Technician will contact you within 1 hour to schedule pickup
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="card" size={18} color={colors.secondary} />
              <Text style={styles.noteText}>
                Pay securely with Card, Bank Transfer, or USSD via Paystack
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="refresh" size={18} color={colors.warning} />
              <Text style={styles.noteText}>
                Free re-repair within 30 days if issue persists
              </Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By confirming, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            isProcessing && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={isProcessing}
          activeOpacity={0.9}
          accessibilityLabel={isProcessing ? 'Processing booking' : 'Confirm and pay'}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator size="small" color={colors.onPrimary} />
              <Text style={styles.confirmButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.confirmButtonText}>
                Confirm & Pay {formatPrice(totalPrice)}
              </Text>
              <Ionicons name="lock-closed" size={20} color={colors.onPrimary} />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

function getDeviceEmoji(deviceType: string): string {
  const emojis: Record<string, string> = {
    smartphone: '📱',
    laptop: '💻',
    tablet: '📑',
    desktop: '🖥️',
    other: '🔧',
  }
  return emojis[deviceType] || '📱'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: colors.outline,
  },
  stepCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepLabel: {
    ...typography.labelSm,
    textAlign: 'center',
  },
  stepCompletedText: {
    color: colors.success,
    fontWeight: '600',
  },
  stepActiveText: {
    color: colors.primary,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.level1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  summaryEmoji: {
    fontSize: 22,
  },
  summaryInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  summaryDevice: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
  },
  summaryRepair: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  summaryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  partText: {
    ...typography.bodyMd,
    color: colors.text.primary,
    fontWeight: '500',
  },
  technicianCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.level1,
  },
  techAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  techInitials: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  techMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  techMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  techMetaText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  notesContainer: {
    gap: spacing.sm,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  noteText: {
    ...typography.bodyMd,
    color: colors.text.primary,
    flex: 1,
  },
  termsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  termsText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    ...shadows.level2,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    ...typography.buttonText,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
})