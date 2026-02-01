/**
 * Custom React hooks
 */

export { useToast, toast } from './use-toast'
export { useUser } from './use-user'
export { useCsrf, withCsrf } from './use-csrf'

// Phase 5: Quota Management
export {
  useQuota,
  isQuotaLow,
  isQuotaExceeded,
  getQuotaStatusColor,
} from './use-quota'

// Phase 6: User Settings
export { usePreferences, type UserPreference } from './use-preferences'

// Phase 7: Course Management
export { useCourses } from './use-courses'
