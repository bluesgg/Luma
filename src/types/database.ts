// =============================================================================
// Luma Web - Database JSON Field Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// SubTopic.metadata
// -----------------------------------------------------------------------------
export interface SubTopicMetadata {
  summary: string
  keywords: string[]
  relatedPages: number[]
}

// -----------------------------------------------------------------------------
// SubTopic Explanation Response (not stored, generated on-demand)
// -----------------------------------------------------------------------------
export interface SubTopicExplanation {
  explanation: {
    motivation: string
    intuition: string
    mathematics: string
    theory: string
    application: string
  }
}

export type ExplanationLayer = keyof SubTopicExplanation['explanation']

// -----------------------------------------------------------------------------
// TopicTest.options
// -----------------------------------------------------------------------------
export type TopicTestOptions = string[]

// -----------------------------------------------------------------------------
// ExtractedImage.bbox & ImageRegion.bbox
// -----------------------------------------------------------------------------
export interface ImageBbox {
  x: number
  y: number
  width: number
  height: number
}

// -----------------------------------------------------------------------------
// TopicProgress.questionAttempts
// -----------------------------------------------------------------------------
export interface QuestionAttempts {
  [questionId: string]: {
    attempts: number
    answered: boolean
    skipped: boolean
  }
}

// -----------------------------------------------------------------------------
// Log metadata fields
// -----------------------------------------------------------------------------
export interface QuotaLogMetadata {
  previousValue?: number
  newValue?: number
  adminId?: string
  reason?: string
}

export interface AIUsageLogMetadata {
  fileId?: string
  sessionId?: string
  topicGroupId?: string
  subTopicId?: string
  requestType?: string
}

export interface AccessLogMetadata {
  fileId?: string
  courseId?: string
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogDetails {
  previousValue?: unknown
  newValue?: unknown
  affectedRecords?: number
  reason?: string
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// -----------------------------------------------------------------------------
// Learning Session API Types
// -----------------------------------------------------------------------------
export interface LearningSessionOutline {
  id: string
  index: number
  title: string
  type: 'CORE' | 'SUPPORTING'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  isWeakPoint: boolean
  subTopics: Array<{
    id: string
    index: number
    title: string
    confirmed: boolean
  }>
}

export interface StartSessionResponse {
  sessionId: string
  isNew: boolean
  file: {
    id: string
    name: string
    pageCount: number | null
  }
  outline: LearningSessionOutline[]
  currentTopicIndex: number
  currentSubIndex: number
  currentPhase: 'EXPLAINING' | 'CONFIRMING' | 'TESTING'
  progress: {
    completed: number
    total: number
  }
}

export interface ExplainResponse {
  subTopic: {
    id: string
    title: string
    topicTitle: string
    pageRange: string
  }
  explanation: SubTopicExplanation['explanation']
  relatedImages: Array<{
    url: string
    pageNumber: number
    imageIndex: number
    label: string
  }>
  hasNextSub: boolean
}

export interface ConfirmResponse {
  confirmed: boolean
  nextAction: 'NEXT_SUB' | 'START_TEST' | 'NEXT_TOPIC' | 'COMPLETE'
  nextSubTopic?: {
    id: string
    title: string
  }
}

export interface TestResponse {
  topicGroup: {
    id: string
    title: string
    type: 'CORE' | 'SUPPORTING'
  }
  question: {
    id: string
    type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER'
    question: string
    options?: string[]
  }
  questionIndex: number
  totalQuestions: number
  attempts: number
  canSkip: boolean
  progress: {
    answered: number
    correct: number
    required: number
  }
}

export interface AnswerResponse {
  isCorrect: boolean
  feedback: string
  correctAnswer?: string
  questionAttempts: number
  canSkipQuestion: boolean
  progress: {
    answered: number
    correct: number
    required: number
    passed: boolean
  }
  isWeakPoint: boolean
  reExplanation?: string
  nextAction: 'NEXT_QUESTION' | 'TOPIC_PASSED' | 'TOPIC_FAILED' | 'CAN_RETRY'
}

// -----------------------------------------------------------------------------
// Admin API Types
// -----------------------------------------------------------------------------
export interface MathpixCostResponse {
  totalRequests: number
  totalCost: number
  daily: Array<{
    date: string
    requests: number
    cost: number
  }>
  byUser: Array<{
    userId: string
    email: string
    requests: number
    cost: number
  }>
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
export const TUTOR_CONSTANTS = {
  CORE_PASS_CORRECT: 2,
  SUPPORTING_PASS_CORRECT: 1,
  CORE_QUESTIONS: 3,
  SUPPORTING_QUESTIONS: 1,
  QUESTION_SKIP_THRESHOLD: 3,
  WEAK_POINT_THRESHOLD: 3,
  BATCH_PAGES: 120,
  STRUCTURE_EXTRACT_TIMEOUT_MS: 300000,
} as const

export const QUOTA_LIMITS = {
  LEARNING_INTERACTIONS: 150,
  AUTO_EXPLAIN: 300,
} as const

export const FILE_LIMITS = {
  MAX_FILE_SIZE_MB: 200,
  MAX_PAGE_COUNT: 500,
  MAX_FILES_PER_COURSE: 30,
  MAX_STORAGE_GB: 5,
  MAX_COURSES_PER_USER: 6,
} as const
