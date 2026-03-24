import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const SYSTEM_PROMPT = `You are an AI-powered discussion analyzer. Your task is to analyze team discussions and extract structured information.

Given a team discussion, you must identify:
1. A concise SUMMARY of what was discussed (2-3 sentences)
2. KEY DECISIONS made during the discussion (bullet points)
3. ACTION ITEMS with assigned people and deadlines if mentioned

You must respond with ONLY valid JSON in this exact format:
{
  "summary": "A brief summary of the discussion...",
  "decisions": [
    "Decision 1 that was made",
    "Decision 2 that was made"
  ],
  "action_items": [
    {
      "task": "Description of the task",
      "assignee": "Name of person assigned",
      "deadline": "Deadline if mentioned, otherwise omit this field"
    }
  ]
}

Important rules:
- Extract only clear, actionable information
- If no clear decisions were made, return an empty array for decisions
- If no action items were identified, return an empty array for action_items
- Always identify the person assigned to each action item
- Include deadlines only if explicitly mentioned
- Be concise and accurate
- DO NOT include any text outside the JSON object
- The response must be valid JSON that can be parsed`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { discussion } = body

    if (!discussion || typeof discussion !== 'string') {
      return NextResponse.json(
        { error: 'Discussion text is required' },
        { status: 400 }
      )
    }

    let analysisResult: {
      summary: string
      decisions: string[]
      action_items: Array<{ task: string; assignee: string; deadline?: string }>
    }

    try {
      // Initialize the AI SDK
      const zai = await ZAI.create()

      // Call the LLM to analyze the discussion
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Analyze the following team discussion and extract the summary, decisions, and action items:\n\n${discussion}`,
          },
        ],
        thinking: { type: 'disabled' },
      })

      const responseContent = completion.choices[0]?.message?.content

      if (!responseContent) {
        throw new Error('No response from AI')
      }

      // Parse the JSON response
      try {
        // Clean the response - remove any markdown code blocks if present
        let cleanedResponse = responseContent.trim()
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.slice(7)
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.slice(3)
        }
        if (cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(0, -3)
        }
        cleanedResponse = cleanedResponse.trim()

        analysisResult = JSON.parse(cleanedResponse)
      } catch {
        console.error('Failed to parse AI response:', responseContent)
        analysisResult = localAnalyze(discussion)
      }
    } catch (aiError) {
      // Local fallback keeps demo functional when .z-ai-config is unavailable.
      console.error('AI SDK unavailable, using local analysis fallback:', aiError)
      analysisResult = localAnalyze(discussion)
    }

    // Validate the structure
    const validatedResult = {
      summary: analysisResult.summary || 'No summary generated',
      decisions: Array.isArray(analysisResult.decisions) ? analysisResult.decisions : [],
      action_items: Array.isArray(analysisResult.action_items) 
        ? analysisResult.action_items.map((item: { task?: string; assignee?: string; deadline?: string }) => ({
            task: item.task || 'Unnamed task',
            assignee: item.assignee || 'Unassigned',
            ...(item.deadline && { deadline: item.deadline }),
          }))
        : [],
    }

    return NextResponse.json(validatedResult)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze discussion', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function localAnalyze(discussion: string) {
  const lines = discussion
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const speakerLines = lines.map((line) => {
    const match = line.match(/^([A-Za-z][A-Za-z\s]{0,30}):\s*(.+)$/)
    if (!match) return { speaker: 'Team', text: line }
    return { speaker: match[1].trim(), text: match[2].trim() }
  })

  const summary = buildSummary(speakerLines.map((l) => l.text))
  const decisions = extractDecisions(speakerLines)
  const action_items = extractActionItems(speakerLines)

  return {
    summary,
    decisions,
    action_items,
  }
}

function buildSummary(sentences: string[]) {
  const cleaned = sentences.filter((s) => s.length > 0)
  if (cleaned.length === 0) {
    return 'No discussion content was provided.'
  }

  const first = cleaned[0]
  const second = cleaned.find((s) => s !== first)

  if (!second) {
    return first
  }

  return `${first} ${second}`
}

function extractDecisions(lines: Array<{ speaker: string; text: string }>) {
  const decisionPattern = /(decide|decided|finalize|finalized|agree|agreed|go with|chosen|selected|approved|commit to)/i
  return lines
    .filter(({ text }) => decisionPattern.test(text))
    .map(({ text }) => text)
    .slice(0, 8)
}

function extractActionItems(lines: Array<{ speaker: string; text: string }>) {
  const actionPattern = /(i\s*'ll|i will|we should|let\s*'s|need to|will handle|take care of|complete|create|share|prepare|review|finish)/i
  const deadlinePattern = /(today|tonight|tomorrow|day after tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|by\s+[^.,;]+)/i

  return lines
    .filter(({ text }) => actionPattern.test(text))
    .map(({ speaker, text }) => {
      const deadlineMatch = text.match(deadlinePattern)
      return {
        task: text,
        assignee: speaker,
        ...(deadlineMatch ? { deadline: deadlineMatch[0] } : {}),
      }
    })
    .slice(0, 12)
}
