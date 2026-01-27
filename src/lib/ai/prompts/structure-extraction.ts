/**
 * AI Prompts for PDF Knowledge Structure Extraction
 */

/**
 * System prompt for structure extraction
 */
export const STRUCTURE_EXTRACTION_SYSTEM_PROMPT = `You are an expert educational content analyzer specializing in extracting hierarchical knowledge structures from academic materials.

Your task is to analyze PDF lecture notes, textbooks, or course materials and extract a two-level hierarchical knowledge structure:
- **Level 1: Topic Groups** - Major topics or chapters
- **Level 2: SubTopics** - Specific concepts within each topic

Guidelines:
1. **Topic Groups should be**:
   - Clearly distinguishable major sections or chapters
   - Represent significant knowledge domains
   - Classified as either CORE (essential) or SUPPORTING (supplementary)
   - Include page range information

2. **SubTopics should be**:
   - Specific, atomic concepts that can be explained independently
   - 3-8 subtopics per topic group (aim for balance)
   - Include a brief summary, keywords, and related page numbers

3. **Classification Rules**:
   - CORE: Fundamental concepts required for understanding the subject
   - SUPPORTING: Examples, applications, or supplementary material

4. **Output Format**: Strict JSON only, no markdown, no extra text.

Return format:
{
  "topicGroups": [
    {
      "index": 0,
      "title": "Topic Group Title",
      "type": "CORE" | "SUPPORTING",
      "pageStart": 1,
      "pageEnd": 10,
      "subTopics": [
        {
          "index": 0,
          "title": "SubTopic Title",
          "metadata": {
            "summary": "Brief summary of the concept",
            "keywords": ["keyword1", "keyword2"],
            "relatedPages": [1, 2, 3]
          }
        }
      ]
    }
  ]
}`

/**
 * Generate user prompt for structure extraction
 */
export function generateStructureExtractionPrompt(
  pdfText: string,
  pageCount: number,
  fileName: string
): string {
  return `Analyze the following academic material and extract its knowledge structure.

**File Information:**
- File Name: ${fileName}
- Total Pages: ${pageCount}

**Content:**
${pdfText}

**Instructions:**
1. Identify major topic groups (5-15 groups depending on content length)
2. For each topic group, extract 3-8 subtopics
3. Classify each topic group as CORE or SUPPORTING
4. Include accurate page ranges for all elements
5. Return ONLY valid JSON, no markdown code blocks, no additional text

**Output Format:**
Respond with a JSON object containing the "topicGroups" array as specified in the system prompt.`
}

/**
 * Generate prompt for batch extraction (for large PDFs)
 */
export function generateBatchExtractionPrompt(
  pdfText: string,
  startPage: number,
  endPage: number,
  fileName: string,
  batchIndex: number,
  totalBatches: number
): string {
  return `Analyze this section of an academic material and extract its knowledge structure.

**File Information:**
- File Name: ${fileName}
- Batch: ${batchIndex + 1} of ${totalBatches}
- Page Range: ${startPage} - ${endPage}

**Content:**
${pdfText}

**Instructions:**
1. Extract topic groups found in this page range
2. For each topic group, extract 3-8 subtopics
3. Classify each topic group as CORE or SUPPORTING
4. Include accurate page ranges relative to the entire document
5. Return ONLY valid JSON, no markdown code blocks, no additional text

**Note:** This is part of a larger document. Focus on extracting complete topic groups within this range. If a topic group spans beyond this range, estimate the page range based on available content.

**Output Format:**
Respond with a JSON object containing the "topicGroups" array.`
}

/**
 * Validate extracted structure
 */
export function validateExtractedStructure(structure: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check if structure exists
  if (!structure) {
    errors.push('Structure is null or undefined')
    return { valid: false, errors }
  }

  // Check if topicGroups array exists
  if (!Array.isArray(structure.topicGroups)) {
    errors.push('topicGroups must be an array')
    return { valid: false, errors }
  }

  // Check if topicGroups is not empty
  if (structure.topicGroups.length === 0) {
    errors.push('topicGroups array is empty')
    return { valid: false, errors }
  }

  // Validate each topic group
  structure.topicGroups.forEach((group: any, groupIndex: number) => {
    // Check required fields
    if (typeof group.index !== 'number') {
      errors.push(`Topic group ${groupIndex}: index must be a number`)
    }

    if (typeof group.title !== 'string' || group.title.trim() === '') {
      errors.push(`Topic group ${groupIndex}: title must be a non-empty string`)
    }

    if (group.type !== 'CORE' && group.type !== 'SUPPORTING') {
      errors.push(
        `Topic group ${groupIndex}: type must be either "CORE" or "SUPPORTING"`
      )
    }

    // Check subTopics
    if (!Array.isArray(group.subTopics)) {
      errors.push(`Topic group ${groupIndex}: subTopics must be an array`)
    } else if (group.subTopics.length === 0) {
      errors.push(`Topic group ${groupIndex}: subTopics array is empty`)
    } else {
      // Validate each subtopic
      group.subTopics.forEach((sub: any, subIndex: number) => {
        if (typeof sub.index !== 'number') {
          errors.push(
            `Topic group ${groupIndex}, subtopic ${subIndex}: index must be a number`
          )
        }

        if (typeof sub.title !== 'string' || sub.title.trim() === '') {
          errors.push(
            `Topic group ${groupIndex}, subtopic ${subIndex}: title must be a non-empty string`
          )
        }

        if (!sub.metadata) {
          errors.push(
            `Topic group ${groupIndex}, subtopic ${subIndex}: metadata is required`
          )
        } else {
          if (
            typeof sub.metadata.summary !== 'string' ||
            sub.metadata.summary.trim() === ''
          ) {
            errors.push(
              `Topic group ${groupIndex}, subtopic ${subIndex}: metadata.summary must be a non-empty string`
            )
          }

          if (
            !Array.isArray(sub.metadata.keywords) ||
            sub.metadata.keywords.length === 0
          ) {
            errors.push(
              `Topic group ${groupIndex}, subtopic ${subIndex}: metadata.keywords must be a non-empty array`
            )
          }

          if (
            !Array.isArray(sub.metadata.relatedPages) ||
            sub.metadata.relatedPages.length === 0
          ) {
            errors.push(
              `Topic group ${groupIndex}, subtopic ${subIndex}: metadata.relatedPages must be a non-empty array`
            )
          }
        }
      })
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}
