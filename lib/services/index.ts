// Services module exports
// Central export point for all business logic services

export { ProfileService, profileService } from './profile-service'
export { LocationService, locationService } from './location-service'
export { UploadService, uploadService } from './upload-service'
export { PartsCatalogueService } from './parts-catalogue-service'
export { PricingService } from './pricing-service'
export { PartRequestService } from './part-request-service'

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

export type {
  PartsCatalogue,
  CreatePartDTO,
  UpdatePartDTO,
  PartsSearchParams,
  PartsSearchResult,
  RepairCategoryPricing,
  DeviceModel,
  PartsCatalogueStats,
  PartsCatalogueResult
} from '@/types/parts-catalogue.types'

export type {
  PartRequest,
  PartRequestWithDetails,
  CreatePartRequestDTO,
  UpdatePartRequestDTO,
  ApprovePartRequestDTO,
  RejectPartRequestDTO,
  PartRequestStats,
  MostRequestedPart,
  PartRequestFilters,
  PartRequestResult,
  PartRequestListResult,
  PartRequestNotification,
  PartRequestNotificationDB,
  PartRequestNotificationWithDetails
} from '@/types/parts-request.types'