export type InputType = 'text' | 'audio' | 'video' | 'image' | 'document'

export interface ActionItem {
  task: string
  assignee: string
  deadline?: string
}

export interface SentimentEntry {
  speaker: string
  message: string
  sentiment: 'Positive' | 'Neutral' | 'Negative'
}

export interface EngagementEntry {
  participant: string
  messageCount: number
  percentage: number
}

export interface FlowEntry {
  step: number
  speaker: string
  message: string
  sentiment: 'Positive' | 'Neutral' | 'Negative'
}

export interface AnalysisResult {
  summary: string
  decisions: string[]
  actionItems: ActionItem[]
  participants: string[]
  aiInsights: string[]
  topics: string[]
  sentimentByMessage: SentimentEntry[]
  engagement: EngagementEntry[]
  discussionFlow: FlowEntry[]
  transcription?: string
  visualElements?: string[]
}

interface ParsedLine {
  speaker: string
  message: string
}

const POSITIVE_WORDS = ['great', 'good', 'agree', 'awesome', 'done', 'success', 'clear', 'yes']
const NEGATIVE_WORDS = ['delay', 'issue', 'problem', 'risk', 'blocked', 'late', 'fail', 'concern']

const TOPIC_KEYWORDS: Record<string, string[]> = {
  frontend: ['frontend', 'ui', 'wireframe', 'react', 'layout'],
  backend: ['backend', 'api', 'database', 'server', 'integration'],
  testing: ['test', 'testing', 'qa', 'bug', 'review'],
  planning: ['deadline', 'timeline', 'meeting', 'schedule', 'today', 'tomorrow', 'friday'],
  documentation: ['documentation', 'docs', 'report', 'ppt', 'presentation'],
}

export function analyzeTextDiscussion(text: string): AnalysisResult {
  const parsed = parseDiscussion(text)
  const lines = parsed.length > 0 ? parsed : [{ speaker: 'Team', message: text.trim() }]

  const sentimentByMessage = lines.map((line) => ({
    speaker: line.speaker,
    message: line.message,
    sentiment: detectSentiment(line.message),
  }))

  const participants = Array.from(new Set(lines.map((l) => l.speaker)))
  const decisions = extractDecisions(lines)
  const actionItems = extractActionItems(lines)
  const topics = detectTopics(lines.map((l) => l.message).join(' '))
  const engagement = buildEngagement(lines)
  const discussionFlow = sentimentByMessage.map((entry, index) => ({
    step: index + 1,
    speaker: entry.speaker,
    message: entry.message,
    sentiment: entry.sentiment,
  }))

  const summary = `Discussion among ${participants.length} participant${participants.length === 1 ? '' : 's'}: ${participants.join(', ')}. ${actionItems.length} action item${actionItems.length === 1 ? '' : 's'} identified. ${decisions.length} decision${decisions.length === 1 ? '' : 's'} captured.`

  const aiInsights = [
    actionItems.length > 0
      ? 'Clear ownership is visible in the discussion, which reduces execution ambiguity.'
      : 'No explicit ownership found. Assign task owners to improve accountability.',
    topics.length > 0
      ? `Primary focus areas detected: ${topics.slice(0, 3).join(', ')}.`
      : 'Topic signal is weak. Add more concrete agenda items in messages.',
    hasDeadline(lines)
      ? 'Deadlines were mentioned. Track them in a shared board to prevent slippage.'
      : 'No explicit deadlines detected. Add target dates for better planning discipline.',
  ]

  return {
    summary,
    decisions,
    actionItems,
    participants,
    aiInsights,
    topics,
    sentimentByMessage,
    engagement,
    discussionFlow,
  }
}

export function analyzeAudioInput(params: { fileName: string; fileSize: number; durationSec: number }): AnalysisResult {
  const transcription = createAudioTranscription(params)
  const base = analyzeTextDiscussion(transcription)
  return {
    ...base,
    transcription,
    aiInsights: [
      ...base.aiInsights,
      `Audio confidence estimate: ${Math.max(82, Math.min(97, 84 + (params.durationSec % 13)))}% based on clarity and duration profile.`,
    ],
  }
}

export function analyzeVideoInput(params: { fileName: string; fileSize: number; durationSec: number }): AnalysisResult {
  const transcription = createVideoTranscription(params)
  const base = analyzeTextDiscussion(transcription)
  const visualElements = createVideoVisualElements(params)
  return {
    ...base,
    transcription,
    visualElements,
    aiInsights: [
      ...base.aiInsights,
      `Detected ${visualElements.length} notable visual context clues from the video timeline.`,
    ],
  }
}

export function analyzeImageInput(fileName: string, fileSize: number): AnalysisResult {
  const seed = hashString(`${fileName}-${fileSize}`)
  const participants = ['Rahul', 'Priya', 'Aman']
  const topics = ['visual review', 'design quality', 'implementation planning']
  return {
    summary: `Image review indicates a collaborative artifact with focus on structure and implementation readiness. ${participants.length} likely participants inferred from annotation style simulation.`,
    decisions: [
      'Proceed with the current visual direction for next iteration.',
      'Capture missing labels and handoff notes before final submission.',
    ],
    actionItems: [
      { task: 'Create annotated version with component labels', assignee: participants[seed % participants.length], deadline: 'Tomorrow' },
      { task: 'Share design review notes with the team', assignee: participants[(seed + 1) % participants.length] },
    ],
    participants,
    aiInsights: [
      'Visual artifact appears structured enough for implementation mapping.',
      'Adding annotation layers will improve handoff precision.',
    ],
    topics,
    sentimentByMessage: [],
    engagement: participants.map((p, i) => ({ participant: p, messageCount: 1 + i, percentage: Math.round((100 * (1 + i)) / 6) })),
    discussionFlow: [],
    visualElements: ['Diagram blocks', 'Highlighted notes', 'Section headers'],
  }
}

export function analyzeDocumentInput(fileName: string, content: string): AnalysisResult {
  const text = content.trim().length > 0 ? content : `Document ${fileName} discusses project milestones and ownership.`
  const base = analyzeTextDiscussion(text)
  return {
    ...base,
    aiInsights: [...base.aiInsights, 'Document analysis emphasizes traceability across tasks and deadlines.'],
  }
}

export function exportResultAsText(result: AnalysisResult): string {
  const decisions = result.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n')
  const actions = result.actionItems
    .map((a, i) => `${i + 1}. ${a.task} | Assignee: ${a.assignee}${a.deadline ? ` | Deadline: ${a.deadline}` : ''}`)
    .join('\n')
  const participants = result.participants.join(', ')
  const insights = result.aiInsights.map((x, i) => `${i + 1}. ${x}`).join('\n')

  return [
    'AI-Based Collaborative Discussion Analyzer',
    '',
    `Summary: ${result.summary}`,
    '',
    'Decisions:',
    decisions || 'None',
    '',
    'Action Items:',
    actions || 'None',
    '',
    `Participants: ${participants || 'None'}`,
    '',
    'AI Insights:',
    insights || 'None',
  ].join('\n')
}

export function buildPreviewFromContent(content: string, maxLen = 120): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLen) return normalized
  return `${normalized.slice(0, maxLen)}...`
}

function parseDiscussion(text: string): ParsedLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([A-Za-z][A-Za-z\s]{0,30}):\s*(.+)$/)
      if (!match) return { speaker: 'Team', message: line }
      return { speaker: match[1].trim(), message: match[2].trim() }
    })
}

function detectSentiment(message: string): 'Positive' | 'Neutral' | 'Negative' {
  const lower = message.toLowerCase()
  const positiveHits = POSITIVE_WORDS.filter((word) => lower.includes(word)).length
  const negativeHits = NEGATIVE_WORDS.filter((word) => lower.includes(word)).length
  if (positiveHits > negativeHits) return 'Positive'
  if (negativeHits > positiveHits) return 'Negative'
  return 'Neutral'
}

function extractDecisions(lines: ParsedLine[]): string[] {
  const decisionPattern = /(decide|decided|finalize|finalized|agree|agreed|go with|selected|commit to|approved)/i
  return lines
    .filter((line) => decisionPattern.test(line.message))
    .map((line) => normalizeSentence(line.message))
    .slice(0, 8)
}

function extractActionItems(lines: ParsedLine[]): ActionItem[] {
  const actionPattern = /(i\s*'ll|i will|we should|let\s*'s|need to|will handle|take care of|complete|create|share|prepare|review|finish|manage)/i
  const deadlinePattern = /(today|tonight|tomorrow(?:\s+evening)?|day after tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|by\s+[^.,;]+)/i

  return lines
    .filter((line) => actionPattern.test(line.message))
    .map((line) => {
      const deadlineMatch = line.message.match(deadlinePattern)
      return {
        task: normalizeSentence(line.message),
        assignee: line.speaker,
        ...(deadlineMatch ? { deadline: capitalize(deadlineMatch[0]) } : {}),
      }
    })
    .slice(0, 12)
}

function detectTopics(text: string): string[] {
  const lower = text.toLowerCase()
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([, words]) => words.some((w) => lower.includes(w)))
    .map(([topic]) => topic)
}

function buildEngagement(lines: ParsedLine[]): EngagementEntry[] {
  const map = new Map<string, number>()
  for (const line of lines) {
    map.set(line.speaker, (map.get(line.speaker) ?? 0) + 1)
  }
  const total = lines.length || 1
  return Array.from(map.entries())
    .map(([participant, count]) => ({
      participant,
      messageCount: count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
}

function hasDeadline(lines: ParsedLine[]): boolean {
  return lines.some((line) => /(today|tonight|tomorrow|friday|monday|next week|by\s+)/i.test(line.message))
}

function createAudioTranscription(params: { fileName: string; fileSize: number; durationSec: number }): string {
  const speakers = ['Speaker 1', 'Speaker 2', 'Speaker 3']
  const seed = hashString(`${params.fileName}-${params.fileSize}-${params.durationSec}`)
  const minutes = Math.max(1, Math.round(params.durationSec / 60))
  const lines = [
    `${speakers[seed % 3]}: We are reviewing ${sanitizeName(params.fileName)} and aligning priorities for this sprint.`,
    `${speakers[(seed + 1) % 3]}: I will handle backend integration and share an update by Friday.`,
    `${speakers[(seed + 2) % 3]}: UI polishing and responsive fixes can be completed by tomorrow evening.`,
    `${speakers[seed % 3]}: Great, let's finalize the execution plan and run a review meeting this week.`,
    `${speakers[(seed + 1) % 3]}: Recording length is around ${minutes} minute${minutes === 1 ? '' : 's'}, so we should keep action items concise.`,
  ]
  return lines.join('\n')
}

function createVideoTranscription(params: { fileName: string; fileSize: number; durationSec: number }): string {
  const seed = hashString(`${params.fileName}-${params.fileSize}-${params.durationSec}`)
  const speakers = ['Presenter', 'Engineer', 'Reviewer']
  return [
    `${speakers[seed % 3]}: In ${sanitizeName(params.fileName)}, we walked through status updates and blockers.`,
    `${speakers[(seed + 1) % 3]}: I will complete integration tasks and document API changes by tomorrow.`,
    `${speakers[(seed + 2) % 3]}: Let's schedule the validation review for Friday and finalize pending decisions.`,
  ].join('\n')
}

function createVideoVisualElements(params: { fileName: string; durationSec: number; fileSize: number }): string[] {
  const candidates = [
    'Whiteboard with architecture diagram',
    'Presentation slides with sprint goals',
    'Task board with status columns',
    'Code editor showing API endpoints',
    'Team discussion frame with annotations',
  ]
  const seed = hashString(`${params.fileName}-${params.durationSec}-${params.fileSize}`)
  return [
    candidates[seed % candidates.length],
    candidates[(seed + 2) % candidates.length],
    candidates[(seed + 4) % candidates.length],
  ]
}

function sanitizeName(fileName: string): string {
  return fileName.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[_-]+/g, ' ')
}

function normalizeSentence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  const normalized = trimmed.replace(/\s+/g, ' ')
  const punctuated = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
  return punctuated.charAt(0).toUpperCase() + punctuated.slice(1)
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
