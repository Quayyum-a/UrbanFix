// Technician home screen placeholder
// This will be implemented in later tasks

import React from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function TechnicianHomeScreen() {
  const { signOut, userProfile } = useAuth()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome, {userProfile?.full_name}!</Text>
        <Text style={styles.subtitle}>Technician Dashboard</Text>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            🚧 Technician features coming soon!
          </Text>
          <Text style={styles.placeholderSubtext}>
            • Complete verification process{'\n'}
            • Accept repair jobs{'\n'}
            • Set pricing for services{'\n'}
            • Track earnings{'\n'}
            • Chat with customers
          </Text>
        </View>

        <Button onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center'
  },
  placeholder: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 32,
    marginBottom: 40,
    alignItems: 'center'
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center'
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    textAlign: 'center'
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
})