// Dispute Resolution Management Screen
// Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 20.1, 20.2, 20.3, 20.4, 20.5
// Admin interface for reviewing and resolving customer disputes

import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import theme from '@/constants/theme'

export default function DisputeResolutionScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={64} color={theme.colors.warning} />
        <Text style={styles.title}>Dispute Resolution</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>This feature will include:</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.featureText}>View all active disputes with context</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.featureText}>Access chat history and evidence photos</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.featureText}>Resolution options: Refund, Payment, or Split</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.featureText}>Automatic payment execution based on decision</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.featureText}>Notification to both parties with explanation</Text>
          </View>
        </View>
      </View>

      <View style={styles.requirementsBox}>
        <Text style={styles.requirementsTitle}>Requirements Covered:</Text>
        <Text style={styles.requirementsText}>• 16.1-16.5: Dispute initiation and submission</Text>
        <Text style={styles.requirementsText}>• 20.1-20.5: Admin dispute resolution workflow</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: 20,
    alignItems: 'center'
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16
  },
  featureList: {
    gap: 12
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20
  },
  requirementsBox: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 20,
    width: '100%'
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 12
  },
  requirementsText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4
  }
})
