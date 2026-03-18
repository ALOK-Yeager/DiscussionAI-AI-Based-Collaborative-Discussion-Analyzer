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

    // Initialize the AI SDK
    const zai = await ZAI.create()

    // Call the LLM to analyze the discussion
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
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
    let analysisResult
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
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseContent)
      
      // Fallback: Try to extract meaningful content even if JSON parsing fails
      analysisResult = {
        summary: 'Unable to generate a structured summary. Please try again with a clearer discussion format.',
        decisions: [],
        action_items: [],
      }
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
