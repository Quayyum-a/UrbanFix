// Take photos and upload them immediately; the parent gets storage paths.
import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, radius, spacing } from '@/constants/theme'
import { friendlyError } from '@/lib/api'
import { pickPhoto, uploadPhoto, type Bucket } from '@/lib/photos'
import { tap } from './ui'

export function PhotoPicker({ bucket, folder, prefix, max = 4, value, onChange, label }: {
  bucket: Bucket
  folder: string
  prefix?: string
  max?: number
  value: string[]
  onChange: (paths: string[]) => void
  label: string
}) {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const add = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickPhoto(source)
      if (!uri) return
      setBusy(true)
      const path = await uploadPhoto(bucket, folder, uri, prefix)
      setPreviews((p) => ({ ...p, [path]: uri }))
      onChange([...value, path])
    } catch (e) {
      Alert.alert("Couldn't add photo", friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const ask = () => {
    tap()
    Alert.alert('Add a photo', undefined, [
      { text: 'Take photo', onPress: () => void add('camera') },
      { text: 'Choose from gallery', onPress: () => void add('library') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[font.label, { marginBottom: spacing.xs }]}>{label}</Text>
      <View style={styles.grid}>
        {value.map((p) => (
          <View key={p} style={styles.thumb}>
            {previews[p] ? <Image source={{ uri: previews[p] }} style={styles.img} /> : null}
            <Pressable style={styles.remove} accessibilityLabel="Remove photo" onPress={() => onChange(value.filter((x) => x !== p))}>
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          </View>
        ))}
        {value.length < max ? (
          <Pressable style={[styles.thumb, styles.add]} onPress={ask} disabled={busy} accessibilityRole="button" accessibilityLabel="Add photo" testID="add-photo">
            {busy ? <ActivityIndicator color={colors.primary} /> : (
              <>
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                <Text style={[font.label, { color: colors.primary }]}>Add</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.border },
  img: { width: '100%', height: '100%' },
  add: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.surface },
  remove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
})
