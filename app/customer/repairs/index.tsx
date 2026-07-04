import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, typography, spacing } from '@/constants/theme'

export default function RepairsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>My Repairs</Text>
        <Text style={styles.subtitle}>Track your repair requests and ongoing jobs</Text>
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No repairs found</Text>
          <Text style={styles.emptySubtext}>
            When you book a repair, you'll see it here
          </Text>
        </View>
      </View>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.headlineSm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
    opacity: 0.7,
  },
})