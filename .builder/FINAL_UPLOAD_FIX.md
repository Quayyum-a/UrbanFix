# Final Fix: Upload File as Blob

## The Problem
App was sending: `image/jpeg` ✅
Supabase received: `text/plain;charset=UTF-8` ❌

The file wasn't being uploaded as binary data—it was being treated as text.

## The Solution
Changed upload method from passing a plain object to uploading a **Blob**:

```typescript
// BEFORE (wrong):
.upload(filePath, {
  uri: asset.uri,
  name: fileName,
  type: asset.mimeType || 'image/jpeg'
})

// AFTER (correct):
const response = await fetch(asset.uri)
const blob = await response.blob()

.upload(filePath, blob, {
  contentType: asset.mimeType || 'image/jpeg',
  upsert: false
})
```

## What Changed
- **Fetch the file** as a Blob using `fetch(asset.uri)`
- **Pass the Blob** directly to `upload()` (not an object)
- **Use contentType** parameter instead of trying to embed `type` in the data object
- **Add upsert: false** to prevent overwriting

## Test Now

1. Reload the app
2. Go to technician onboarding
3. Tap "Upload NIN Card/Slip"
4. Select an image
5. **Should upload successfully** ✅

## Why This Works

Supabase Storage expects:
- **First argument:** The actual file data (Blob, ArrayBuffer, or File)
- **Second argument:** Optional options object with `contentType`

Not:
- An object with uri/name/type properties

This is the standard way to upload files to cloud storage services.
