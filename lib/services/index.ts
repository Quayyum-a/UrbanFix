// Services module exports
// Central export point for all business logic services

export { ProfileService, profileService } from './profile-service'
export { LocationService, locationService } from './location-service'
export { UploadService, uploadService } from './upload-service'

export type { 
  CustomerProfile, 
  TechnicianProfile,
  ProfileUpdateData 
} from './profile-service'

export type { 
  LocationCoordinates,
  GeocodeResult,
  ReverseGeocodeResult,
  LocationPermissionResult,
  AddressComponents,
  DetailedGeocodeResult,
  PlaceDetailsResult
} from './location-service'

export type { 
  UploadResult,
  FileValidationResult 
} from './upload-service'