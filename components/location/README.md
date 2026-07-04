# Location Components

This directory contains location-related components for the UrbanFix application, implementing address management, map integration, and location services.

## Components

### AddressPicker
A comprehensive address selection component with Google Maps integration.

**Features:**
- Current location detection
- Manual address entry with autocomplete
- Drag-to-adjust pin functionality  
- Address validation
- Google Places API integration

**Usage:**
```tsx
import { AddressPicker } from '@/components/location'

<AddressPicker
  onAddressSelected={(address) => console.log(address)}
  onCancel={() => setShowPicker(false)}
  initialAddress="123 Victoria Island, Lagos"
  title="Select Pickup Location"
/>
```

### AddressManagement
Interface for saving and managing multiple addresses with custom labels.

**Features:**
- Save multiple addresses with custom labels (Home, Work, Other)
- Address validation with visual confirmation
- Distance calculations for technician matching
- Offline scenario handling with appropriate messaging
- Integration with existing AddressPicker
- AsyncStorage persistence

**Usage:**
```tsx
import { AddressManagement } from '@/components/location'

<AddressManagement
  savedAddresses={addresses}
  selectedAddressId={selectedId}
  onAddressSelect={(address) => setSelected(address)}
  onAddressesUpdate={(addresses) => saveAddresses(addresses)}
  showDistance={true}
  referenceLocation={technicianLocation}
  maxAddresses={5}
/>
```

### AddressManagementExample
Example implementations showing integration with customer profiles and booking flows.

**Included Examples:**
- `AddressManagementExample` - Complete integration component
- `BookingAddressExample` - Usage in booking flow
- `ProfileAddressExample` - Usage in customer profile

## Types

### SavedAddress
```typescript
interface SavedAddress {
  id: string
  label: string
  text: string
  coordinates: LocationCoordinates
  formattedAddress?: string
  isValidated: boolean
  createdAt: string
  lastUsed?: string
}
```

### LocationCoordinates
```typescript
interface LocationCoordinates {
  latitude: number
  longitude: number
}
```

## Key Features

### Address Validation
- Nigerian address format validation
- Real-time validation feedback
- Visual confirmation indicators
- Offline validation handling

### Distance Calculations
- Haversine formula for accurate distance calculation
- Formatted distance display (meters/kilometers)
- Integration with technician matching

### Offline Support
- Network connectivity monitoring
- Offline indicators
- Graceful degradation when offline
- Local storage persistence

### Accessibility
- WCAG 2.1 AA compliance
- Proper semantic labels
- Touch target requirements (44px minimum)
- Screen reader support
- Keyboard navigation

### Error Handling
- Network error recovery
- Storage error handling
- Validation error display
- User-friendly error messages

## Integration Requirements

### Dependencies
```json
{
  "@react-native-async-storage/async-storage": "^1.23.1",
  "@react-native-community/netinfo": "^11.0.0",
  "react-native-maps": "1.14.0",
  "expo-location": "~17.0.1"
}
```

### Environment Variables
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Permissions
- Location services (for current location detection)
- Network access (for geocoding and validation)

## Design System Compliance

All components follow the UrbanFix design system:
- **Colors:** Deep Trust Blue (#031636) and Emergency Orange (#FF5722)
- **Typography:** Inter font family with consistent text styles
- **Spacing:** 8-point grid system
- **Border Radius:** 8px to 16px range
- **Shadows:** Tonal layering and ambient shadows
- **Touch Targets:** Minimum 44px for accessibility

## Testing

### Unit Tests
Run component tests:
```bash
npm test -- __tests__/unit/AddressManagement.test.tsx
```

### Integration Tests
The components integrate with:
- Location services
- Google Maps API
- AsyncStorage
- Network connectivity monitoring

### Property-Based Testing
Components support property-based testing for:
- Address validation consistency
- Distance calculation accuracy
- Multi-address management
- Offline behavior consistency

## Performance Considerations

### Optimizations
- Debounced address search (500ms)
- Lazy loading of map components
- Efficient list rendering for large address lists
- Image optimization for map tiles
- Memory-efficient distance calculations

### Caching
- AsyncStorage for address persistence
- Network request caching
- Geocoding result caching
- Map tile caching

## Security

### Data Privacy
- No sensitive location data in logs
- Secure storage of address data
- Network request encryption (HTTPS)
- User consent for location access

### Validation
- Input sanitization
- Address format validation
- Coordinate range validation
- Network request validation