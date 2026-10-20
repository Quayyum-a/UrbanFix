// What can be repaired. This mirrors `repair_options` in database/urbanfix.sql
// (a test checks they stay identical); the database is the final authority.

export type DeviceType = 'smartphone' | 'laptop' | 'tablet' | 'desktop'

export const DEVICES: { type: DeviceType; label: string; icon: string }[] = [
  { type: 'smartphone', label: 'Phone', icon: 'phone-portrait-outline' },
  { type: 'laptop', label: 'Laptop', icon: 'laptop-outline' },
  { type: 'tablet', label: 'Tablet', icon: 'tablet-portrait-outline' },
  { type: 'desktop', label: 'Desktop', icon: 'desktop-outline' },
]

export const REPAIRS: Record<DeviceType, { category: string; label: string }[]> = {
  smartphone: [
    { category: 'screen_replacement', label: 'Cracked or dead screen' },
    { category: 'battery_replacement', label: 'Battery drains fast' },
    { category: 'charging_port', label: "Won't charge" },
    { category: 'water_damage', label: 'Water damage' },
    { category: 'camera', label: 'Camera not working' },
    { category: 'speaker', label: 'Speaker or mic' },
    { category: 'back_glass', label: 'Broken back glass' },
    { category: 'buttons', label: 'Buttons not working' },
    { category: 'software_issues', label: 'Software, stuck or slow' },
    { category: 'diagnosis', label: 'Not sure, diagnose it' },
  ],
  laptop: [
    { category: 'screen_replacement', label: 'Cracked or dead screen' },
    { category: 'battery_replacement', label: 'Battery problems' },
    { category: 'charging_port', label: "Won't charge" },
    { category: 'keyboard_replacement', label: 'Keyboard or touchpad' },
    { category: 'hinge_repair', label: 'Broken hinge' },
    { category: 'overheating', label: 'Overheating or loud fan' },
    { category: 'storage_upgrade', label: 'Storage or RAM upgrade' },
    { category: 'motherboard_repair', label: "Won't power on" },
    { category: 'software_issues', label: 'Software, slow or virus' },
    { category: 'diagnosis', label: 'Not sure, diagnose it' },
  ],
  tablet: [
    { category: 'screen_replacement', label: 'Cracked or dead screen' },
    { category: 'battery_replacement', label: 'Battery drains fast' },
    { category: 'charging_port', label: "Won't charge" },
    { category: 'software_issues', label: 'Software, stuck or slow' },
    { category: 'diagnosis', label: 'Not sure, diagnose it' },
  ],
  desktop: [
    { category: 'power_supply', label: "Won't power on" },
    { category: 'storage_upgrade', label: 'Storage or RAM upgrade' },
    { category: 'overheating', label: 'Overheating or loud fan' },
    { category: 'software_issues', label: 'Software, slow or virus' },
    { category: 'diagnosis', label: 'Not sure, diagnose it' },
  ],
}

export function isDeviceType(v: unknown): v is DeviceType {
  return typeof v === 'string' && DEVICES.some((d) => d.type === v)
}

export function deviceLabel(type: string): string {
  return DEVICES.find((d) => d.type === type)?.label ?? type
}

export function repairLabel(device: string, category: string): string {
  return (isDeviceType(device) ? REPAIRS[device].find((r) => r.category === category)?.label : undefined)
    ?? category.replace(/_/g, ' ')
}

export const BRANDS: Record<DeviceType, string[]> = {
  smartphone: ['Tecno', 'Infinix', 'Samsung', 'iPhone', 'itel', 'Redmi', 'Oppo', 'Other'],
  laptop: ['HP', 'Dell', 'Lenovo', 'MacBook', 'Asus', 'Acer', 'Other'],
  tablet: ['iPad', 'Samsung', 'Tecno', 'Lenovo', 'Other'],
  desktop: ['HP', 'Dell', 'Lenovo', 'iMac', 'Custom', 'Other'],
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
