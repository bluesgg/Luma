/**
 * Custom React hooks
 */

export { useToast, toast } from './use-toast'
export { useUser } from './use-user'
export { useCsrf, withCsrf } from './use-csrf'

// Phase 3: File Management
export {
  useFiles,
  useFile,
  useUpdateFile,
  useDeleteFile,
  useDownloadUrl,
  downloadFileFromUrl,
  fileKeys,
} from './use-files'
export {
  useMultiFileUpload,
  type UploadItem,
  type UploadStatus,
  type ValidationError,
} from './use-multi-file-upload'

// Phase 5: Quota Management
export {
  useQuota,
  isQuotaLow,
  isQuotaExceeded,
  getQuotaStatusColor,
} from './use-quota'

// Phase 6: User Settings
export { usePreferences, type UserPreference } from './use-preferences'

// Phase 8: PDF Reader
export { useReadingProgress, progressKeys } from './use-reading-progress'

// Additional hooks will be added in later phases
// export { useCourses } from './use-courses'
// export { useLearningSession } from './use-learning-session'
