/**
 * AI Prompts for SubTopic Explanation Generation
 */

import type { SubTopicMetadata } from '@/types/database'

/**
 * System prompt for explanation generation
 */
export const EXPLANATION_SYSTEM_PROMPT = `You are an expert tutor specializing in breaking down complex academic concepts into clear, structured explanations.

Your task is to explain specific subtopics from academic materials using a structured five-layer approach:

1. **Motivation** - Why this concept matters and its real-world relevance
2. **Intuition** - A simple, intuitive explanation using analogies
3. **Mathematics** - Formal definitions, formulas, and mathematical foundations
4. **Theory** - Theoretical frameworks, principles, and relationships
5. **Application** - Practical examples, use cases, and problem-solving

Guidelines:
- Use clear, academic language appropriate for university students
- Include LaTeX formulas where appropriate (use $ $ for inline, $$ $$ for display)
- Reference specific pages from the source material when relevant
- Make each layer self-contained but build upon previous layers
- Keep explanations concise but comprehensive (200-400 words per layer)
- Use Markdown formatting for structure (headings, lists, emphasis)

Output Format: JSON with five explanation layers.`

/**
 * Generate user prompt for subtopic explanation
 */
export function generateExplanationPrompt(
  subTopicTitle: string,
  topicGroupTitle: string,
  metadata: SubTopicMetadata,
  pdfContext: string,
  pageNumbers: number[]
): string {
  return `Explain the following subtopic using the five-layer approach.

**Context:**
- Topic Group: ${topicGroupTitle}
- SubTopic: ${subTopicTitle}
- Summary: ${metadata.summary}
- Keywords: ${metadata.keywords.join(', ')}
- Related Pages: ${metadata.relatedPages.join(', ')}

**Source Content (from pages ${pageNumbers.join(', ')}):**
${pdfContext}

**Instructions:**
Generate a comprehensive explanation with these five layers:
1. motivation - Why this concept is important
2. intuition - Simple, intuitive explanation
3. mathematics - Formal definitions and formulas
4. theory - Theoretical foundations
5. application - Practical examples

Use LaTeX for mathematical notation:
- Inline: $x = 5$
- Display: $$\\int_0^1 f(x) dx$$

Return ONLY valid JSON with this structure:
{
  "motivation": "...",
  "intuition": "...",
  "mathematics": "...",
  "theory": "...",
  "application": "..."
}`
}

/**
 * Generate prompt for re-explanation (after wrong answer)
 */
export function generateReExplanationPrompt(
  subTopicTitle: string,
  question: string,
  userAnswer: string,
  correctAnswer: string,
  attemptCount: number
): string {
  return `A student answered a question incorrectly. Provide a focused re-explanation.

**Context:**
- SubTopic: ${subTopicTitle}
- Question: ${question}
- Student's Answer: ${userAnswer}
- Correct Answer: ${correctAnswer}
- Attempt Number: ${attemptCount}

**Instructions:**
1. Identify the misconception in the student's answer
2. Provide a brief, targeted explanation (150-250 words)
3. Use LaTeX for any formulas: $formula$ or $$display$$
4. Focus on clarifying the specific misunderstanding

Return plain text (not JSON), using Markdown formatting.`
}

/**
 * System prompt for test generation
 */
export const TEST_GENERATION_SYSTEM_PROMPT = `You are an expert in creating assessment questions for academic concepts.

Your task is to generate multiple-choice and short-answer questions that test understanding of specific topics.

Guidelines for Multiple Choice:
- Create 4 options (A, B, C, D)
- Only one correct answer
- Distractors should be plausible but clearly wrong to someone who understands
- Question should test conceptual understanding, not memorization

Guidelines for Short Answer:
- Question should require a brief written response (1-2 sentences or a calculation)
- Answer should be unambiguous and objectively gradable
- Include the exact expected answer

Output Format: JSON array of questions.`

/**
 * Generate prompt for topic test questions
 */
export function generateTestQuestionsPrompt(
  topicGroupTitle: string,
  subTopics: Array<{ title: string; summary: string }>,
  questionCount: number,
  topicType: 'CORE' | 'SUPPORTING'
): string {
  const subTopicList = subTopics
    .map((st, i) => `${i + 1}. ${st.title}: ${st.summary}`)
    .join('\n')

  return `Generate ${questionCount} test questions for the following topic.

**Topic:** ${topicGroupTitle}
**Type:** ${topicType}

**SubTopics Covered:**
${subTopicList}

**Requirements:**
- Mix of multiple-choice (60%) and short-answer (40%)
- Questions should cover different subtopics
- Test conceptual understanding, not just facts
- Appropriate difficulty for university students

Return ONLY valid JSON with this structure:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "question": "Question text with LaTeX if needed: $formula$",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Exact text of correct option",
      "explanation": "Why this is correct and why others are wrong"
    },
    {
      "type": "SHORT_ANSWER",
      "question": "Question text",
      "correctAnswer": "Expected answer",
      "explanation": "Explanation of the answer"
    }
  ]
}`
}

/**
 * Validate explanation structure
 */
export function validateExplanation(explanation: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const requiredLayers = [
    'motivation',
    'intuition',
    'mathematics',
    'theory',
    'application',
  ]

  if (!explanation) {
    errors.push('Explanation is null or undefined')
    return { valid: false, errors }
  }

  requiredLayers.forEach((layer) => {
    if (typeof explanation[layer] !== 'string') {
      errors.push(`Missing or invalid layer: ${layer}`)
    } else if (explanation[layer].trim().length < 50) {
      errors.push(`Layer "${layer}" is too short (minimum 50 characters)`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate test questions
 */
export function validateTestQuestions(data: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data || !Array.isArray(data.questions)) {
    errors.push('Invalid format: questions array is required')
    return { valid: false, errors }
  }

  data.questions.forEach((q: any, index: number) => {
    if (!q.type || !['MULTIPLE_CHOICE', 'SHORT_ANSWER'].includes(q.type)) {
      errors.push(
        `Question ${index}: type must be MULTIPLE_CHOICE or SHORT_ANSWER`
      )
    }

    if (typeof q.question !== 'string' || q.question.trim() === '') {
      errors.push(`Question ${index}: question text is required`)
    }

    if (typeof q.correctAnswer !== 'string' || q.correctAnswer.trim() === '') {
      errors.push(`Question ${index}: correctAnswer is required`)
    }

    if (typeof q.explanation !== 'string' || q.explanation.trim() === '') {
      errors.push(`Question ${index}: explanation is required`)
    }

    if (q.type === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(
          `Question ${index}: MULTIPLE_CHOICE must have exactly 4 options`
        )
      } else {
        if (!q.options.includes(q.correctAnswer)) {
          errors.push(
            `Question ${index}: correctAnswer must be one of the options`
          )
        }
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}
