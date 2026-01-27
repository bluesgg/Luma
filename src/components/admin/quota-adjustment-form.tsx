'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

interface QuotaData {
  bucket: string
  used: number
  limit: number
  resetAt: string
}

interface QuotaAdjustmentFormProps {
  userId: string
  quotas: QuotaData[]
  onSuccess: () => void
}

type Action = 'set_limit' | 'adjust_used' | 'reset'

export function QuotaAdjustmentForm({
  userId,
  quotas,
  onSuccess,
}: QuotaAdjustmentFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [bucket, setBucket] = useState<string>(quotas[0]?.bucket || '')
  const [action, setAction] = useState<Action>('set_limit')
  const [value, setValue] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  const selectedQuota = quotas.find((q) => q.bucket === bucket)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!bucket) {
      setError('Please select a bucket')
      return
    }

    if (!action) {
      setError('Please select an action')
      return
    }

    if ((action === 'set_limit' || action === 'adjust_used') && !value) {
      setError('Please enter a value')
      return
    }

    if (!reason.trim()) {
      setError('Please provide a reason for this adjustment')
      return
    }

    const numValue = value ? parseInt(value, 10) : undefined
    if (
      (action === 'set_limit' || action === 'adjust_used') &&
      numValue === undefined
    ) {
      setError('Please enter a valid number')
      return
    }

    if (action === 'set_limit' && numValue! < 0) {
      setError('Limit cannot be negative')
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/admin/users/${userId}/quota`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket,
          action,
          value: numValue,
          reason: reason.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to adjust quota')
      }

      toast({
        title: 'Success',
        description: 'Quota adjusted successfully',
      })

      // Reset form
      setValue('')
      setReason('')
      setAction('set_limit')

      // Call success callback
      onSuccess()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to adjust quota'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatBucketName = (bucket: string) => {
    return bucket
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getActionDescription = () => {
    if (!selectedQuota) return ''

    switch (action) {
      case 'set_limit':
        return `Current limit: ${selectedQuota.limit}`
      case 'adjust_used':
        return `Current used: ${selectedQuota.used}. Enter positive to increase, negative to decrease.`
      case 'reset':
        return `Current used: ${selectedQuota.used}. This will reset to 0.`
      default:
        return ''
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bucket Selection */}
        <div className="space-y-2">
          <Label htmlFor="bucket">Quota Bucket</Label>
          <Select value={bucket} onValueChange={setBucket}>
            <SelectTrigger id="bucket">
              <SelectValue placeholder="Select bucket" />
            </SelectTrigger>
            <SelectContent>
              {quotas.map((q) => (
                <SelectItem key={q.bucket} value={q.bucket}>
                  {formatBucketName(q.bucket)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Selection */}
        <div className="space-y-2">
          <Label htmlFor="action">Action</Label>
          <Select
            value={action}
            onValueChange={(val: string) => {
              setAction(val as Action)
              setValue('')
            }}
          >
            <SelectTrigger id="action">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="set_limit">Set Limit</SelectItem>
              <SelectItem value="adjust_used">Adjust Used Amount</SelectItem>
              <SelectItem value="reset">Reset Used to 0</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Value Input (conditional) */}
      {(action === 'set_limit' || action === 'adjust_used') && (
        <div className="space-y-2">
          <Label htmlFor="value">
            {action === 'set_limit' ? 'New Limit' : 'Adjustment Value'}
          </Label>
          <Input
            id="value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              action === 'set_limit'
                ? 'Enter new limit'
                : 'Enter adjustment value (+ or -)'
            }
            disabled={isSubmitting}
          />
          {selectedQuota && (
            <p className="text-sm text-gray-600">{getActionDescription()}</p>
          )}
        </div>
      )}

      {/* Action Description for Reset */}
      {action === 'reset' && selectedQuota && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">{getActionDescription()}</p>
        </div>
      )}

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Adjustment</Label>
        <Input
          id="reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason (required for audit trail)"
          maxLength={500}
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500">
          This will be recorded in the audit log
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValue('')
            setReason('')
            setError(null)
          }}
          disabled={isSubmitting}
        >
          Clear
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adjusting...
            </>
          ) : (
            'Apply Adjustment'
          )}
        </Button>
      </div>
    </form>
  )
}
