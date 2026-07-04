// Ephemeral booking flow state using Zustand as specified in Engineering Guide Section 4.3

import { create } from 'zustand'

interface BookingStore {
  // Device information
  deviceType: string | null
  deviceBrand: string | null
  deviceModel: string | null
  repairCategory: string | null
  
  // Pricing information
  partId: string | null
  partPrice: number | null
  labourPrice: number | null
  platformFee: number | null
  totalPrice: number | null
  
  // Technician selection
  technicianId: string | null
  
  // Additional information
  photoUris: string[]
  pickupAddress: string | null
  notes: string | null
  
  // Actions
  setDeviceType: (deviceType: string) => void
  setDeviceBrand: (deviceBrand: string) => void
  setDeviceModel: (deviceModel: string) => void
  setRepairCategory: (repairCategory: string) => void
  setPricing: (pricing: {
    partId: string
    partPrice: number
    labourPrice: number
    platformFee: number
    totalPrice: number
  }) => void
  setTechnician: (technicianId: string) => void
  setPhotoUris: (photoUris: string[]) => void
  addPhotoUri: (photoUri: string) => void
  removePhotoUri: (photoUri: string) => void
  setPickupAddress: (address: string) => void
  setNotes: (notes: string) => void
  reset: () => void
}

const initialState = {
  deviceType: null,
  deviceBrand: null,
  deviceModel: null,
  repairCategory: null,
  partId: null,
  partPrice: null,
  labourPrice: null,
  platformFee: null,
  totalPrice: null,
  technicianId: null,
  photoUris: [],
  pickupAddress: null,
  notes: null,
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  ...initialState,
  
  setDeviceType: (deviceType) => set({ deviceType }),
  setDeviceBrand: (deviceBrand) => set({ deviceBrand }),
  setDeviceModel: (deviceModel) => set({ deviceModel }),
  setRepairCategory: (repairCategory) => set({ repairCategory }),
  
  setPricing: (pricing) => set({
    partId: pricing.partId,
    partPrice: pricing.partPrice,
    labourPrice: pricing.labourPrice,
    platformFee: pricing.platformFee,
    totalPrice: pricing.totalPrice,
  }),
  
  setTechnician: (technicianId) => set({ technicianId }),
  
  setPhotoUris: (photoUris) => set({ photoUris }),
  addPhotoUri: (photoUri) => {
    const { photoUris } = get()
    if (!photoUris.includes(photoUri)) {
      set({ photoUris: [...photoUris, photoUri] })
    }
  },
  removePhotoUri: (photoUri) => {
    const { photoUris } = get()
    set({ photoUris: photoUris.filter(uri => uri !== photoUri) })
  },
  
  setPickupAddress: (address) => set({ pickupAddress: address }),
  setNotes: (notes) => set({ notes }),
  
  reset: () => set(initialState),
}))