'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { withCsrf } from './use-csrf'

/**
 * User preference type
 */
export interface UserPreference {
  id: string
  userId: string
  uiLocale: 'en' | 'zh'
  explainLocale: 'en' | 'zh'
  updatedAt: string
}

/**
 * Update preferences payload
 */
interface UpdatePreferencesPayload {
  uiLocale?: 'en' | 'zh'
  explainLocale?: 'en' | 'zh'
}

/**
 * Fetch user preferences from API
 */
async function fetchPreferences(): Promise<UserPreference> {
  const response = await fetch('/api/preferences', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch preferences')
  }

  const result = await response.json()
  return result.data
}

/**
 * Update user preferences via API
 * Uses CSRF protection for security
 */
async function updatePreferencesAPI(
  payload: UpdatePreferencesPayload
): Promise<UserPreference> {
  // Fetch CSRF token first
  const csrfResponse = await fetch('/api/csrf')
  if (!csrfResponse.ok) {
    throw new Error('Failed to fetch CSRF token')
  }
  const csrfData = await csrfResponse.json()
  const csrfToken = csrfData.data?.csrfToken || null

  // Prepare fetch options with CSRF token
  const options = withCsrf(
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    csrfToken
  )

  const response = await fetch('/api/preferences', options)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to update preferences')
  }

  const result = await response.json()
  return result.data
}

/**
 * usePreferences Hook
 * Manages user preferences with optimistic updates
 */
export function usePreferences() {
  const queryClient = useQueryClient()

  // Query for fetching preferences
  const query = useQuery<UserPreference, Error>({
    queryKey: ['preferences'],
    queryFn: fetchPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  })

  // Mutation for updating preferences
  const mutation = useMutation<
    UserPreference,
    Error,
    UpdatePreferencesPayload,
    { previousPreferences: UserPreference | undefined }
  >({
    mutationFn: updatePreferencesAPI,
    // Optimistic update
    onMutate: async (newPreferences) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['preferences'] })

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<UserPreference>([
        'preferences',
      ])

      // Optimistically update to the new value
      if (previousPreferences) {
        queryClient.setQueryData<UserPreference>(['preferences'], {
          ...previousPreferences,
          ...newPreferences,
          updatedAt: new Date().toISOString(),
        })
      }

      // Return context with the previous value
      return { previousPreferences }
    },
    // If mutation fails, roll back to the previous value
    onError: (_error, _variables, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData<UserPreference>(
          ['preferences'],
          context.previousPreferences
        )
      }
    },
    // Always refetch after error or success to ensure we have latest data
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
  })

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: mutation.mutate,
    isUpdating: mutation.isPending,
  }
}
