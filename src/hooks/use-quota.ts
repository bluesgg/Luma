/**
 * useQuota Hook
 * Manages quota data fetching and helper functions
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { QuotaBucket } from '@prisma/client'
import type { QuotaStatusResponse } from '@/types'

type QuotaData = QuotaStatusResponse

/**
 * Fetch quota status from API
 * Fixed: Keep resetAt as string to match QuotaStatusResponse type definition
 */
async function fetchQuotaStatus(): Promise<QuotaData> {
  const response = await fetch('/api/quota', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch quota status')
  }

  const result = await response.json()

  // Return data as-is with resetAt as string (components can parse to Date if needed)
  return result.data
}

/**
 * Check if quota is low (< 20% remaining)
 */
export function isQuotaLow(used: number, limit: number): boolean {
  const remaining = limit - used
  const percentage = (remaining / limit) * 100
  return percentage < 20
}

/**
 * Check if quota is exceeded
 */
export function isQuotaExceeded(used: number, limit: number): boolean {
  return used >= limit
}

/**
 * Get quota status color based on percentage
 */
export function getQuotaStatusColor(
  percentage: number
): 'green' | 'yellow' | 'red' {
  if (percentage < 70) return 'green'
  if (percentage <= 90) return 'yellow'
  return 'red'
}

/**
 * Convert QuotaBucket enum to camelCase key
 */
function getBucketKey(
  bucket: QuotaBucket
): 'learningInteractions' | 'autoExplain' {
  return bucket === 'LEARNING_INTERACTIONS'
    ? 'learningInteractions'
    : 'autoExplain'
}

/**
 * useQuota Hook
 * Fetches and manages quota data with TanStack Query
 */
export function useQuota() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['quota'],
    queryFn: fetchQuotaStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
    refetchOnWindowFocus: true,
    retry: 1,
  })

  /**
   * Check if quota is low for a specific bucket
   */
  const isQuotaLowForBucket = (bucket: QuotaBucket): boolean => {
    if (!query.data) return false
    const key = getBucketKey(bucket)
    const { used, limit } = query.data[key]
    return isQuotaLow(used, limit)
  }

  /**
   * Check if quota is exceeded for a specific bucket
   */
  const isQuotaExceededForBucket = (bucket: QuotaBucket): boolean => {
    if (!query.data) return false
    const key = getBucketKey(bucket)
    const { used, limit } = query.data[key]
    return isQuotaExceeded(used, limit)
  }

  /**
   * Check if user can consume a specific amount of quota
   */
  const canConsumeQuota = (
    bucket: QuotaBucket,
    amount: number = 1
  ): boolean => {
    if (!query.data) return false
    const key = getBucketKey(bucket)
    const { remaining } = query.data[key]
    return remaining >= amount
  }

  /**
   * Invalidate quota cache to trigger refetch
   */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['quota'] })
  }

  /**
   * Manually refetch quota data
   */
  const refetch = () => {
    return query.refetch()
  }

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isQuotaLow: isQuotaLowForBucket,
    isQuotaExceeded: isQuotaExceededForBucket,
    canConsumeQuota,
    invalidate,
    refetch,
  }
}
