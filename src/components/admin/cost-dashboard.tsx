'use client'

import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AICostData {
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  byModel: Array<{
    model: string
    inputTokens: number
    outputTokens: number
    cost: number
  }>
  dailyTrend: Array<{
    date: string
    inputTokens: number
    outputTokens: number
    cost: number
  }>
}

interface MathpixCostData {
  totalRequests: number
  estimatedCost: number
  topUsers: Array<{
    userId: string
    email: string
    requestCount: number
    cost: number
  }>
  dailyTrend: Array<{
    date: string
    requests: number
    cost: number
  }>
}

export function CostDashboard() {
  const [period, setPeriod] = useState('7d')
  const [aiCost, setAiCost] = useState<AICostData | null>(null)
  const [mathpixCost, setMathpixCost] = useState<MathpixCostData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCostData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [aiResponse, mathpixResponse] = await Promise.all([
          fetch(`/api/admin/cost?period=${period}`),
          fetch(`/api/admin/cost/mathpix?period=${period}`),
        ])

        const aiResult = await aiResponse.json()
        const mathpixResult = await mathpixResponse.json()

        if (!aiResponse.ok || !mathpixResponse.ok) {
          throw new Error('Failed to fetch cost data')
        }

        setAiCost(aiResult.data)
        setMathpixCost(mathpixResult.data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load cost data'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchCostData()

    // Refresh every 60 seconds
    const interval = setInterval(fetchCostData, 60000)
    return () => clearInterval(interval)
  }, [period])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!aiCost || !mathpixCost) {
    return null
  }

  const totalCost = aiCost.estimatedCost + mathpixCost.estimatedCost

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod('7d')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            period === '7d'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setPeriod('30d')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            period === '30d'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 30 Days
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Last {period === '7d' ? '7' : '30'} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${aiCost.estimatedCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {aiCost.totalInputTokens.toLocaleString()} input tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mathpix Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${mathpixCost.estimatedCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {mathpixCost.totalRequests.toLocaleString()} requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed breakdown */}
      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai">AI Usage</TabsTrigger>
          <TabsTrigger value="mathpix">Mathpix Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>By Model</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Input Tokens</TableHead>
                    <TableHead className="text-right">Output Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiCost.byModel.map((model) => (
                    <TableRow key={model.model}>
                      <TableCell className="font-medium">
                        {model.model}
                      </TableCell>
                      <TableCell className="text-right">
                        {model.inputTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {model.outputTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${model.cost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Input Tokens</TableHead>
                    <TableHead className="text-right">Output Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiCost.dailyTrend.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>
                        {new Date(day.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.inputTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.outputTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${day.cost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mathpix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mathpixCost.topUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.requestCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${user.cost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mathpixCost.dailyTrend.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>
                        {new Date(day.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.requests.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${day.cost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
