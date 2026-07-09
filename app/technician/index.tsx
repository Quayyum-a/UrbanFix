// Technician home screen
// Shows verification status and dashboard for verified technicians

import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography, radius } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function TechnicianHomeScreen() {
  const router = useRouter()
  const { signOut, userProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)

  useEffect(() => {
    checkVerificationStatus()
  }, [userProfile?.id])

  const checkVerificationStatus = async () => {
    if (!userProfile?.id) {
      setLoading(false)
      return
    }

    try {
      const { data: profile } = await supabase
        .from('technician_profiles')
        .select('verification_status, rejection_reason')
        .eq('user_id', userProfile.id)
        .single()

      if (profile) {
        setVerificationStatus(profile.verification_status as any)
        setRejectionReason(profile.rejection_reason)
      }
    } catch (error) {
      console.error('Error checking verification:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Verification Pending
  if (verificationStatus === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time" size={64} color={colors.warning} />
            </View>
            
            <Text style={styles.statusTitle}>Verification Under Review</Text>
            <Text style={styles.statusDescription}>
              Your documents are being reviewed by our admin team. This usually takes 24-48 hours.
            </Text>

            <View style={styles.timelineContainer}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotComplete]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Documents Submitted ✓</Text>
                  <Text style={styles.timelineText}>We received your verification documents</Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Under Review</Text>
                  <Text style={styles.timelineText}>Admin team is verifying your information</Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Approval</Text>
                  <Text style={styles.timelineText}>You'll be notified once approved</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.secondary} />
              <Text style={styles.infoText}>
                You'll receive an SMS and in-app notification once your verification is complete.
              </Text>
            </View>

            <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
              <Text style={styles.secondaryButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Verification Rejected
  if (verificationStatus === 'rejected') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="close-circle" size={64} color={colors.error} />
            </View>
            
            <Text style={styles.statusTitle}>Verification Declined</Text>
            <Text style={styles.statusDescription}>
              Unfortunately, we couldn't verify your documents at this time.
            </Text>

            {rejectionReason && (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionTitle}>Reason:</Text>
                <Text style={styles.rejectionText}>{rejectionReason}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/technician/onboarding')}
            >
              <Text style={styles.primaryButtonText}>Resubmit Documents</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
              <Text style={styles.secondaryButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Approved - Show Dashboard
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{userProfile?.full_name}!</Text>
          </View>
          <TouchableOpacity style={styles.avatarButton}>
            <Ionicons name="person-circle" size={48} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="construct" size={32} color={colors.secondary} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={32} color={colors.success} />
            <Text style={styles.statValue}>₦0</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color={colors.warning} />
            <Text style={styles.statValue}>0.0</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Coming Soon Card */}
        <View style={styles.comingSoonCard}>
          <Ionicons name="rocket" size={48} color={colors.secondary} />
          <Text style={styles.comingSoonTitle}>Dashboard Coming Soon!</Text>
          <Text style={styles.comingSoonText}>
            We're building out your technician dashboard. You'll soon be able to:
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.featureText}>Accept and manage repair jobs</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.featureText}>Set your service pricing</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.featureText}>Track earnings and payouts</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.featureText}>Chat with customers</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
    alignItems: 'center'
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginTop: spacing.sm
  },
  content: {
    padding: spacing.md
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  greeting: {
    ...typography.bodyLg,
    color: colors.text.secondary
  },
  name: {
    ...typography.headlineMd,
    color: colors.text.primary
  },
  avatarButton: {
    padding: spacing.xs
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  statValue: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginTop: spacing.xs
  },
  statLabel: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginTop: 2
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  statusIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  statusTitle: {
    ...typography.headlineMd,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center'
  },
  statusDescription: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg
  },
  timelineContainer: {
    width: '100%',
    marginBottom: spacing.lg
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
    marginTop: 4,
    marginRight: spacing.sm
  },
  timelineDotComplete: {
    backgroundColor: colors.success
  },
  timelineDotActive: {
    backgroundColor: colors.warning
  },
  timelineContent: {
    flex: 1
  },
  timelineTitle: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2
  },
  timelineText: {
    ...typography.bodyMd,
    color: colors.text.secondary
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.secondary + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%'
  },
  infoText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1
  },
  rejectionBox: {
    backgroundColor: colors.error + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: colors.error
  },
  rejectionTitle: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.xs
  },
  rejectionText: {
    ...typography.bodyMd,
    color: colors.text.primary
  },
  primaryButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  primaryButtonText: {
    ...typography.buttonText,
    color: '#fff'
  },
  secondaryButton: {
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
    alignItems: 'center'
  },
  secondaryButtonText: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    fontWeight: '500'
  },
  comingSoonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  comingSoonTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  comingSoonText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md
  },
  featureList: {
    width: '100%',
    gap: spacing.sm
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.md
  },
  featureText: {
    ...typography.bodyMd,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  signOutButtonText: {
    ...typography.buttonText,
    color: '#fff'
  }
})
