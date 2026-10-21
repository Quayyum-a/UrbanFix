// What can be repaired. This mirrors `repair_options` in database/urbanfix.sql
// (a test checks they stay identical); the database is the final authority.

export type DeviceType = 'smartphone' | 'laptop' | 'tablet' | 'desktop'

export const DEVICES: { type: DeviceType; label: string; icon: string }[] = [
  { type: 'smartphone', label: 'Phone', icon: 'phone-portrait-outline' },
  { type: 'laptop', label: 'Laptop', icon: 'laptop-outline' },
  { type: 'tablet', label: 'Tablet', icon: 'tablet-portrait-outline' },
  { type: 'desktop', label: 'Desktop', icon: 'desktop-outline' },
]

// partMode: 'catalog' = priced from the price list by model and grade,
//           'inspection' = technician prices the part after checking, 'none' = no part.
export type PartMode = 'catalog' | 'inspection' | 'none'
export const REPAIRS: Record<DeviceType, { category: string; label: string; partMode: PartMode }[]> = {
  smartphone: [
    { category: 'screen_replacement', label: 'Cracked or dead screen', partMode: 'catalog' },
    { category: 'battery_replacement', label: 'Battery drains fast', partMode: 'catalog' },
    { category: 'charging_port', label: "Won't charge", partMode: 'catalog' },
    { category: 'water_damage', label: 'Water damage', partMode: 'inspection' },
    { category: 'camera', label: 'Camera not working', partMode: 'catalog' },
    { category: 'speaker', label: 'Speaker or mic', partMode: 'catalog' },
    { category: 'back_glass', label: 'Broken back glass', partMode: 'catalog' },
    { category: 'buttons', label: 'Buttons not working', partMode: 'inspection' },
    { category: 'software_issues', label: 'Software, stuck or slow', partMode: 'none' },
    { category: 'diagnosis', label: 'Not sure, diagnose it', partMode: 'none' },
  ],
  laptop: [
    { category: 'screen_replacement', label: 'Cracked or dead screen', partMode: 'inspection' },
    { category: 'battery_replacement', label: 'Battery problems', partMode: 'inspection' },
    { category: 'charging_port', label: "Won't charge", partMode: 'inspection' },
    { category: 'keyboard_replacement', label: 'Keyboard or touchpad', partMode: 'inspection' },
    { category: 'hinge_repair', label: 'Broken hinge', partMode: 'inspection' },
    { category: 'overheating', label: 'Overheating or loud fan', partMode: 'inspection' },
    { category: 'storage_upgrade', label: 'Storage or RAM upgrade', partMode: 'inspection' },
    { category: 'motherboard_repair', label: "Won't power on", partMode: 'inspection' },
    { category: 'software_issues', label: 'Software, slow or virus', partMode: 'none' },
    { category: 'diagnosis', label: 'Not sure, diagnose it', partMode: 'none' },
  ],
  tablet: [
    { category: 'screen_replacement', label: 'Cracked or dead screen', partMode: 'catalog' },
    { category: 'battery_replacement', label: 'Battery drains fast', partMode: 'catalog' },
    { category: 'charging_port', label: "Won't charge", partMode: 'catalog' },
    { category: 'software_issues', label: 'Software, stuck or slow', partMode: 'none' },
    { category: 'diagnosis', label: 'Not sure, diagnose it', partMode: 'none' },
  ],
  desktop: [
    { category: 'power_supply', label: "Won't power on", partMode: 'inspection' },
    { category: 'storage_upgrade', label: 'Storage or RAM upgrade', partMode: 'inspection' },
    { category: 'overheating', label: 'Overheating or loud fan', partMode: 'inspection' },
    { category: 'software_issues', label: 'Software, slow or virus', partMode: 'none' },
    { category: 'diagnosis', label: 'Not sure, diagnose it', partMode: 'none' },
  ],
}

export function partModeOf(device: string, category: string): PartMode {
  return (isDeviceType(device) ? REPAIRS[device].find((r) => r.category === category)?.partMode : undefined) ?? 'inspection'
}

export const GRADE_ORDER = ['standard', 'high', 'premium'] as const

export function isDeviceType(v: unknown): v is DeviceType {
  return typeof v === 'string' && DEVICES.some((d) => d.type === v)
}

export function deviceLabel(type: string): string {
  return DEVICES.find((d) => d.type === type)?.label ?? type
}

/** "iPhone" + "iPhone X" → "iPhone X"; "Samsung" + "Galaxy A54" → "Samsung Galaxy A54". */
export function deviceName(brand: string | null, model: string | null, deviceType: string): string {
  const b = (brand ?? '').trim()
  const m = (model ?? '').trim()
  if (!m) return b || deviceLabel(deviceType)
  if (!b || m.toLowerCase().startsWith(b.toLowerCase().split(' ')[0]!) || /^(other|custom)/i.test(b)) return m
  return `${b} ${m}`
}

export function repairLabel(device: string, category: string): string {
  return (isDeviceType(device) ? REPAIRS[device].find((r) => r.category === category)?.label : undefined)
    ?? category.replace(/_/g, ' ')
}


// Pilot is Ikeja; nearby areas listed first.
export const AREAS = [
  'Ikeja', 'Ikeja GRA', 'Allen', 'Opebi', 'Alausa', 'Oregun', 'Ogba', 'Agidingbi', 'Maryland',
  'Ojodu', 'Agege', 'Oshodi', 'Ketu', 'Magodo', 'Gbagada', 'Yaba', 'Surulere', 'Lekki', 'Victoria Island', 'Ikoyi',
]

export const BANKS = [
  'Access Bank', 'GTBank', 'First Bank', 'UBA', 'Zenith Bank', 'Fidelity Bank', 'FCMB', 'Union Bank',
  'Sterling Bank', 'Wema Bank', 'Stanbic IBTC', 'Polaris Bank', 'Ecobank', 'Keystone Bank',
  'Opay', 'Moniepoint', 'Kuda', 'PalmPay',
]
