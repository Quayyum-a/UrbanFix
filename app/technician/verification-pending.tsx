// Technician Verification Pending Screen
// Shown to technicians awaiting admin approval
// Displays verification status and timeline

import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography, radius } from '@/constants/theme'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

interface VerificationData {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  rejection_reason: string | null
}

export default function VerificationPendingScreen() {
  const router = useRouter()
  const { userProfile, signOut } = useAuth()
  const [verification, setVerification] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeElapsed, setTimeElapsed] = useState('')

  useEffect(() => {
    loadVerificationStatus()

    // Set up interval to update time elapsed
    const interval = setInterval(() => {
      if (verification?.submitted_at) {
        updateTimeElapsed(verification.submitted_at)
      }
    }, 60000) // Update every minute

    // Set up real-time listener for verification status changes
    const subscription = supabase
      .channel(`verification_${userProfile?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'technician_verifications',
          filter: `user_id=eq.${userProfile?.id}`
        },
        (payload) => {
          console.log('Verification status changed:', payload.new)
          const newStatus = payload.new.status

          if (newStatus === 'approved') {
            Alert.alert(
              'Congratulations!',
              'Your verification has been approved! You can now set up your pricing and start accepting jobs.',
              [
                {
                  text: 'Continue',
                  onPress: () => router.replace('/technician/pricing?setup=true')
                }
              ]
            )
          } else if (newStatus === 'rejected') {
            setVerification({
              ...verification!,
              status: 'rejected',
              rejection_reason: payload.new.rejection_reason
            })
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [verification, userProfile?.id])

  const loadVerificationStatus = async () => {
    try {
      if (!userProfile?.id) return

      const { data, error } = await supabase
        .from('technician_verifications')
        .select('id, status, submitted_at, reviewed_at, rejection_reason')
        .eq('user_id', userProfile.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load verification:', error)
        Alert.alert('Error', 'Failed to load verification status')
        return
      }

      if (data) {
        setVerification(data)
        if (data.status === 'approved') {
          // Redirect to dashboard
          router.replace('/technician')
        } else if (data.status === 'rejected') {
          // Show rejection and allow resubmission
          showRejectionAlert(data.rejection_reason)
        }
        updateTimeElapsed(data.submitted_at)
      }
    } catch (error) {
      console.error('Error loading verification:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTimeElapsed = (submittedAt: string) => {
    const submitted = new Date(submittedAt)
    const now = new Date()
    const diffMs = now.getTime() - submitted.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {
      setTimeElapsed('Just now')
    } else if (diffMins < 60) {
      setTimeElapsed(`${diffMins} minute${diffMins > 1 ? 's' : ''} ago`)
    } else if (diffHours < 24) {
      setTimeElapsed(`${diffHours} hour${diffHours > 1 ? 's' : ''} ago`)
    } else {
      setTimeElapsed(`${diffDays} day${diffDays > 1 ? 's' : ''} ago`)
    }
  }

  const showRejectionAlert = (reason: string | null) => {
    Alert.alert(
      'Verification Rejected',
      reason || 'Your verification was rejected. Please review and resubmit.',
      [
        {
          text: 'Resubmit Documents',
          onPress: () => router.push('/technician/onboarding'),
        },
        { text: 'OK', onPress: () => {} },
      ]
    )
  }

  const handleResubmit = () => {
    router.push('/technician/onboarding')
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Render based on verification status
  if (verification?.status === 'rejected') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Rejection Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="close-circle" size={64} color={colors.error} />
            </View>
          </View>

          {/* Rejection Message */}
          <Text style={styles.statusTitle}>Verification Rejected</Text>
          <Text style={styles.statusDescription}>
            Unfortunately, your verification submission was rejected.
          </Text>

          {/* Rejection Reason */}
          {verification.rejection_reason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{verification.rejection_reason}</Text>
            </View>
          )}

          {/* Action Items */}
          <View style={styles.actionBox}>
            <Text style={styles.actionTitle}>What to do next:</Text>
            <View style={styles.actionItem}>
              <Text style={styles.actionDot}>• </Text>
              <Text style={styles.actionText}>Review the rejection reason above</Text>
            </View>
            <View style={styles.actionItem}>
              <Text style={styles.actionDot}>• </Text>
              <Text style={styles.actionText}>Provide clear, legible documents</Text>
            </View>
            <View style={styles.actionItem}>
              <Text style={styles.actionDot}>• </Text>
              <Text style={styles.actionText}>Ensure all information is accurate</Text>
            </View>
          </View>

          <Button
            title="Resubmit Verification"
            variant="primary"
            size="large"
            onPress={handleResubmit}
            style={styles.button}
          />

          <Button
            title="Sign Out"
            variant="secondary"
            size="large"
            onPress={handleLogout}
            style={styles.button}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Pending status (default)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Pending Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="hourglass-outline" size={64} color={colors.warning} />
          </View>
        </View>

        {/* Status Message */}
        <Text style={styles.statusTitle}>Verification Under Review</Text>
        <Text style={styles.statusDescription}>
          Your verification documents have been submitted successfully. Our team is reviewing your information.
        </Text>

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineCircle, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={20} color="white" />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Documents Submitted</Text>
              <Text style={styles.timelineTime}>{timeElapsed}</Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={[styles.timelineCircle, { backgroundColor: colors.text.disabled }]}>
              <Ionicons name="document-outline" size={20} color="white" />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Under Review</Text>
              <Text style={styles.timelineTime}>Usually within 24 hours</Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={[styles.timelineCircle, { backgroundColor: colors.text.disabled }]}>
              <Ionicons name="checkmark-done-outline" size={20} color="white" />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Approved</Text>
              <Text style={styles.timelineTime}>You'll be notified</Text>
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            You can still explore the app, but you won't be able to accept jobs until your verification is approved.
          </Text>
        </View>

        {/* Submitted Documents */}
        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>Submitted Documents</Text>
          <View style={styles.documentItem}>
            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            <Text style={styles.documentName}>National ID Document</Text>
            <Text style={styles.documentStatus}>✓ Submitted</Text>
          </View>
        </View>

        <Button
          title="Sign Out"
          variant="secondary"
          size="large"
          onPress={handleLogout}
          style={styles.button}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    ...typography.headlineLg,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  statusDescription: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  timelineContainer: {
    width: '100%',
    marginVertical: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  timelineCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
    flexShrink: 0,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  timelineTime: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 21,
    marginBottom: spacing.lg,
  },
  reasonBox: {
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  reasonLabel: {
    ...typography.bodyMd,
    color: colors.error,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  reasonText: {
    ...typography.bodyMd,
    color: colors.text.primary,
    lineHeight: 22,
  },
  infoBox: {
    width: '100%',
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: radius.md,
    marginVertical: spacing.lg,
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoText: {
    ...typography.bodyMd,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 22,
  },
  actionBox: {
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  actionTitle: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  actionDot: {
    ...typography.bodyMd,
    color: colors.primary,
    marginRight: spacing.xs,
    fontWeight: '600',
  },
  actionText: {
    ...typography.bodyMd,
    color: colors.text.primary,
    flex: 1,
  },
  documentsSection: {
    width: '100%',
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  documentItem: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  documentName: {
    ...typography.bodyMd,
    color: colors.text.primary,
    flex: 1,
  },
  documentStatus: {
    ...typography.bodyMd,
    color: colors.success,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    marginTop: spacing.lg,
  },
})
