'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from './use-toast'

interface Admin {
  id: string
  email: string
  role: string
  createdAt: Date
}

interface UseAdminResult {
  admin: Admin | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  logout: () => Promise<void>
}

/**
 * Hook to get current authenticated admin
 */
export function useAdmin(): UseAdminResult {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading, isError, error, refetch } = useQuery<
    { success: boolean; data: { admin: Admin | null } },
    Error
  >({
    queryKey: ['admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/auth')

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { success: false, data: { admin: null } }
        }
        throw new Error('Failed to fetch admin')
      }

      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      return response.json()
    },
    onSuccess: () => {
      // Clear admin cache
      queryClient.setQueryData(['admin'], null)
      queryClient.clear()

      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      })

      router.push('/admin/login')
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
    admin: data?.success ? data.data.admin : null,
    isLoading,
    isError,
    error,
    refetch,
    logout: logoutMutation.mutateAsync,
  }
}
