// Part Requests Screen for Technicians
// Allows technicians to submit and view part requests
// Requirements: 25.1, 25.2, 25.5

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform
} from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import theme from '@/constants/theme'
import { useAuthStore } from '@/stores/authStore'
import { PartRequestForm, PartRequestList, PartRequestDetail, NotificationBadge, PartRequestNotifications } from '@/components/parts-request'
import type { PartRequest, PartRequestNotificationDB } from '@/types/parts-request.types'

type TabType = 'all' | 'pending' | 'approved' | 'rejected'

export default function PartRequestsScreen() {
  const userProfile = useAuthStore(state => state.userProfile)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [showForm, setShowForm] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PartRequest | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  if (!userProfile) {
    return null
  }

  const handleRequestCreated = () => {
    setShowForm(false)
    setRefreshKey(prev => prev + 1) // Trigger refresh
  }

  const handleRequestPress = (request: PartRequest) => {
    setSelectedRequest(request)
  }

  const handleNotificationPress = async (notification: PartRequestNotificationDB) => {
    setShowNotifications(false)
    
    // Load the request details
    const result = await import('@/lib/services/part-request-service').then(m =>
      m.PartRequestService.getRequestById(notification.request_id)
    )
    
    if (result.success && result.data) {
      setSelectedRequest(result.data)
    }
  }

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'list-outline' },
    { key: 'pending', label: 'Pending', icon: 'time-outline' },
    { key: 'approved', label: 'Approved', icon: 'checkmark-circle-outline' },
    { key: 'rejected', label: 'Rejected', icon: 'close-circle-outline' }
  ]

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Part Requests',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <NotificationBadge
                userId={userProfile.id}
                onPress={() => setShowNotifications(true)}
              />
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                style={styles.headerButton}
              >
                <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )
        }}
      />

      <SafeAreaView style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Request List */}
        <PartRequestList
          key={refreshKey}
          technicianId={userProfile.id}
          filterStatus={activeTab === 'all' ? undefined : activeTab}
          onRequestPress={handleRequestPress}
        />

        {/* New Request Button (FAB) */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* New Request Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowForm(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Part Request</Text>
            <View style={{ width: 28 }} />
          </View>
          
          <PartRequestForm
            technicianId={userProfile.id}
            onSuccess={handleRequestCreated}
            onCancel={() => setShowForm(false)}
          />
        </SafeAreaView>
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        visible={!!selectedRequest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedRequest(null)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Details</Text>
            <View style={{ width: 28 }} />
          </View>
          
          {selectedRequest && (
            <PartRequestDetail
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifications(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <PartRequestNotifications
            userId={userProfile.id}
            onNotificationPress={handleNotificationPress}
            onClose={() => setShowNotifications(false)}
          />
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  headerButton: {
    marginRight: 8
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 8
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: theme.colors.primary
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600'
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 90 : 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fff'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text
  },
  modalCloseButton: {
    padding: 4
  }
})
