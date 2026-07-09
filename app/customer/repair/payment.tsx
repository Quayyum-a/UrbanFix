import React, { useState, useEffect } from 'react'
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
import { repairCategoryLabels } from '@/constants/repairCategories'

interface PaymentScreenParams {
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

export default function PaymentScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<PaymentScreenParams>()
  const { userProfile } = useAuth()

  const [selectedMethod, setSelectedMethod] = useState<'card' | 'bank' | 'ussd'>('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

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

  const formatPrice = (price: number) => `₦${(price / 100).toLocaleString('en-NG')}`
  const repairLabel = repairCategoryLabels[repairCategory] || repairCategory

  const handlePayment = async () => {
    if (!userProfile?.id) {
      Alert.alert('Error', 'Please log in to complete payment')
      return
    }

    setIsProcessing(true)

    try {
      // Simulate payment processing
      // In production, this would integrate with Paystack SDK
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Simulate payment success
      // In production, verify with Paystack webhook
      setShowSuccess(true)

      // After showing success, navigate to job tracking
      setTimeout(() => {
        router.replace({
          pathname: '/customer/repairs',
          params: { newJob: 'true' },
        })
      }, 2000)
    } catch (error) {
      console.error('Payment error:', error)
      Alert.alert('Payment Failed', 'Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successText}>
            Your repair has been booked. A technician will contact you shortly.
          </Text>
          <Text style={styles.successSubtext}>
            Job ID: #{Math.random().toString(36).substr(2, 8).toUpperCase()}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

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
            disabled={isProcessing}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Payment</Text>
            <Text style={styles.subtitle}>Secure payment via Paystack</Text>
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
              <Text style={[styles.stepLabel, styles.stepActiveText]}>Payment</Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryEmoji}>📱</Text>
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryDevice}>{brand} {model}</Text>
                <Text style={styles.summaryRepair}>{repairLabel}</Text>
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

            <View style={styles.technicianRow}>
              <Ionicons name="person-circle-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.technicianText}>
                Technician: {technicianName}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.methodsContainer}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  selectedMethod === method.id && styles.methodCardSelected,
                ]}
                onPress={() => setSelectedMethod(method.id as any)}
                disabled={isProcessing}
                activeOpacity={0.8}
                accessibilityLabel={method.label}
                accessibilityState={{ selected: selectedMethod === method.id }}
              >
                <View style={styles.methodIcon}>
                  <Ionicons name={method.icon} size={28} color={method.color} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  <Text style={styles.methodDesc}>{method.description}</Text>
                </View>
                <View
                  style={[
                    styles.methodRadio,
                    selectedMethod === method.id && styles.methodRadioSelected,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pricing Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total to Pay</Text>
          <PricingBreakdown
            partPrice={partPrice}
            labourPrice={labourPrice}
            platformFee={platformFee}
            totalPrice={totalPrice}
          />
        </View>

        {/* Security Notice */}
        <View style={styles.securityContainer}>
          <View style={styles.securityRow}>
            <Ionicons name="lock-closed" size={18} color={colors.success} />
            <Text style={styles.securityText}>
              Your payment is secured by Paystack. Funds held in escrow until repair is complete.
            </Text>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            isProcessing && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={isProcessing}
          activeOpacity={0.9}
          accessibilityLabel={isProcessing ? 'Processing payment' : `Pay ${formatPrice(totalPrice)}`}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator size="small" color={colors.onPrimary} />
              <Text style={styles.payButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.payButtonText}>
                Pay {formatPrice(totalPrice)}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const PAYMENT_METHODS = [
  {
    id: 'card',
    label: 'Card',
    description: 'Debit/Credit Card (Visa, Mastercard, Verve)',
    icon: 'card',
    color: colors.primary,
  },
  {
    id: 'bank',
    label: 'Bank Transfer',
    description: 'Direct bank transfer via Paystack',
    icon: 'business',
    color: colors.secondary,
  },
  {
    id: 'ussd',
    label: 'USSD',
    description: 'Pay with USSD code (*737*50# etc.)',
    icon: 'phone-portrait',
    color: colors.tertiary,
  },
]

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  successContent: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  successIcon: {
    padding: spacing.md,
  },
  successTitle: {
    ...typography.headlineLg,
    color: colors.text.primary,
    fontWeight: '700',
  },
  successText: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  successSubtext: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    fontFamily: 'monospace',
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
  technicianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  technicianText: {
    ...typography.bodyMd,
    color: colors.text.primary,
    fontWeight: '500',
  },
  methodsContainer: {
    gap: spacing.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.level1,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryContainer,
  },
  methodIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  methodInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  methodLabel: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
  },
  methodDesc: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  methodRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRadioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  securityContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.successContainer,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  securityText: {
    ...typography.bodySm,
    color: colors.success,
    flex: 1,
    lineHeight: 20,
  },
  payButton: {
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
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    ...typography.buttonText,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
})