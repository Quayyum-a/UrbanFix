// Taking, shrinking and uploading photos (device evidence and ID documents).
import { File } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { AppError } from './api'
import { supabase } from './supabase'

export type Bucket = 'job-photos' | 'id-documents'

export function randomName(prefix = 'photo'): string {
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  return `${prefix}-${rand}`.replace(/[^A-Za-z0-9_-]/g, '')
}

/** Ask for permission and take (or choose) a photo. Returns a local uri or null if cancelled. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<string | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) throw new AppError('Allow camera access in your phone settings to take photos.')
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
    return r.canceled ? null : (r.assets[0]?.uri ?? null)
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) throw new AppError('Allow photo access in your phone settings to choose a photo.')
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
  return r.canceled ? null : (r.assets[0]?.uri ?? null)
}

/** Resize to at most 1600px wide and compress, so uploads work on slow mobile data. */
async function shrink(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri)
  ctx.resize({ width: 1600 })
  const img = await ctx.renderAsync()
  const out = await img.saveAsync({ compress: 0.7, format: SaveFormat.JPEG })
  return out.uri
}

/**
 * Upload a photo to `<folder>/<random>.jpg`. Returns the storage path to send to
 * the database. Uploads are write-once: the server refuses overwrites.
 */
export async function uploadPhoto(bucket: Bucket, folder: string, localUri: string, prefix = 'photo'): Promise<string> {
  const small = await shrink(localUri)
  const bytes = await new File(small).arrayBuffer()
  const path = `${folder}/${randomName(prefix)}.jpg`
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: 'image/jpeg', upsert: false })
  if (error) {
    if (/row-level security|unauthorized|403/i.test(error.message)) {
      throw new AppError("You can't add photos to this repair right now.")
    }
    throw error
  }
  return path
}

/** Short-lived links for showing private photos. Missing ones are skipped. */
export async function signedUrls(bucket: Bucket, paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 30)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const d of data) if (d.path && d.signedUrl) out[d.path] = d.signedUrl
  return out
}
