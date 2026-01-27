'use client'

import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  TopicGroup,
  TopicProgress,
  SubTopicProgress,
} from '@/hooks/use-learning-session'

/**
 * TUTOR-019: Topic Outline Component
 *
 * Collapsible two-level tree navigation showing:
 * - Topic groups (level 1) with CORE/SUPPORTING badges
 * - SubTopics (level 2) with completion status
 * - Current topic/subtopic highlighting
 */

interface TopicOutlineProps {
  topics: TopicGroup[]
  topicProgress: TopicProgress[]
  subTopicProgress: SubTopicProgress[]
  currentTopicIndex: number
  currentSubIndex: number
  onTopicClick?: (topicIndex: number) => void
  onSubTopicClick?: (topicIndex: number, subIndex: number) => void
  className?: string
}

export function TopicOutline({
  topics,
  topicProgress,
  subTopicProgress,
  currentTopicIndex,
  currentSubIndex,
  onTopicClick,
  onSubTopicClick,
  className,
}: TopicOutlineProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(
    new Set([currentTopicIndex])
  )

  const toggleTopic = (index: number) => {
    const newExpanded = new Set(expandedTopics)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedTopics(newExpanded)
  }

  const getTopicStatus = (topicId: string) => {
    const progress = topicProgress.find((tp) => tp.topicGroupId === topicId)
    return progress?.status || 'PENDING'
  }

  const isTopicWeakPoint = (topicId: string) => {
    const progress = topicProgress.find((tp) => tp.topicGroupId === topicId)
    return progress?.isWeakPoint || false
  }

  const getSubTopicStatus = (subTopicId: string) => {
    const progress = subTopicProgress.find(
      (stp) => stp.subTopicId === subTopicId
    )
    return progress?.confirmed ? 'COMPLETED' : 'PENDING'
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-1 p-4">
        {topics.map((topic, topicIndex) => {
          const isExpanded = expandedTopics.has(topicIndex)
          const isCurrent = topicIndex === currentTopicIndex
          const status = getTopicStatus(topic.id)
          const isWeakPoint = isTopicWeakPoint(topic.id)

          return (
            <div key={topic.id} className="space-y-1">
              {/* Topic Group */}
              <button
                onClick={() => {
                  toggleTopic(topicIndex)
                  onTopicClick?.(topicIndex)
                }}
                className={cn(
                  'flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors',
                  'hover:bg-accent',
                  isCurrent && 'border-l-2 border-primary bg-primary/10'
                )}
              >
                {/* Expand/Collapse Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTopic(topicIndex)
                  }}
                  className="mt-0.5 flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Status Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {status === 'COMPLETED' ? (
                    isWeakPoint ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Topic Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start gap-2">
                    <span
                      className={cn(
                        'flex-1 text-sm font-medium',
                        isCurrent && 'text-primary'
                      )}
                    >
                      {topic.index + 1}. {topic.title}
                    </span>
                  </div>

                  {/* Topic Metadata */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={topic.type === 'CORE' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {topic.type}
                    </Badge>
                    {topic.pageStart && topic.pageEnd && (
                      <span className="text-xs text-muted-foreground">
                        pp. {topic.pageStart}-{topic.pageEnd}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* SubTopics */}
              {isExpanded && (
                <div className="ml-6 space-y-1">
                  {topic.subTopics.map((subTopic, subIndex) => {
                    const isCurrentSub =
                      topicIndex === currentTopicIndex &&
                      subIndex === currentSubIndex
                    const subStatus = getSubTopicStatus(subTopic.id)

                    return (
                      <button
                        key={subTopic.id}
                        onClick={() => onSubTopicClick?.(topicIndex, subIndex)}
                        className={cn(
                          'flex w-full items-start gap-2 rounded-lg p-2 pl-6 text-left transition-colors',
                          'hover:bg-accent',
                          isCurrentSub &&
                            'border-l-2 border-primary bg-primary/10'
                        )}
                      >
                        {/* Status Icon */}
                        <div className="mt-0.5 flex-shrink-0">
                          {subStatus === 'COMPLETED' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>

                        {/* SubTopic Content */}
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'text-sm',
                              isCurrentSub && 'font-medium text-primary'
                            )}
                          >
                            {topic.index + 1}.{subTopic.index + 1}{' '}
                            {subTopic.title}
                          </span>

                          {/* SubTopic Summary */}
                          {subTopic.metadata.summary && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {subTopic.metadata.summary}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
