'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from './use-toast'

interface User {
  id: string
  email: string
  role: string
  emailConfirmedAt: Date | null
  createdAt: Date
}

interface UseUserResult {
  user: User | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  logout: () => Promise<void>
}

/**
 * Hook to get current authenticated user
 */
export function useUser(): UseUserResult {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading, isError, error, refetch } = useQuery<
    { success: boolean; data: { user: User | null } },
    Error
  >({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/auth')

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, data: { user: null } }
        }
        throw new Error('Failed to fetch user')
      }

      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      return response.json()
    },
    onSuccess: () => {
      // Clear user cache
      queryClient.setQueryData(['user'], null)
      queryClient.clear()

      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      })

      router.push('/login')
      router.refresh()
    },
    onError: (_error) => {
      toast({
        title: 'Error',
        description: 'Failed to log out',
        variant: 'destructive',
      })
    },
  })

  return {
    user: data?.success ? data.data.user : null,
    isLoading,
    isError,
    error,
    refetch,
    logout: logoutMutation.mutateAsync,
  }
}
