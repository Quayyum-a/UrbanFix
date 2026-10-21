// Bump APP_BUILD with each release that needs a database change, and set
// public.settings.min_app_build to match in that release's migration.
export const APP_BUILD = 2
// The database pricing version this app needs (set by migration 003).
export const REQUIRED_PRICING_VERSION = 3

export type VersionProblem = 'app_outdated' | 'db_outdated' | null

export function versionProblem(settings: { pricing_version?: number | null; min_app_build?: number | null } | null): VersionProblem {
  if (!settings || settings.pricing_version == null || settings.pricing_version < REQUIRED_PRICING_VERSION) return 'db_outdated'
  if (settings.min_app_build == null) return 'db_outdated'
  if (APP_BUILD < settings.min_app_build) return 'app_outdated'
  return null
}
