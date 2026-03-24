import type { AnalysisResult, InputType } from '@/lib/analysis-engine'

export interface AnalysisHistoryItem {
    id: string
    createdAt: string
    inputType: InputType
    preview: string
    summary: string
    details: {
        fileName?: string
        fileSize?: number
        durationSec?: number
    }
    result: AnalysisResult
}

const HISTORY_KEY = 'discussion-analyzer-history-v1'

export function getHistoryItems(): AnalysisHistoryItem[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(HISTORY_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as AnalysisHistoryItem[]
        if (!Array.isArray(parsed)) return []
        return parsed
    } catch {
        return []
    }
}

export function saveHistoryItem(item: AnalysisHistoryItem): AnalysisHistoryItem[] {
    const next = [item, ...getHistoryItems()].slice(0, 100)
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    }
    return next
}

export function deleteHistoryItem(id: string): AnalysisHistoryItem[] {
    const next = getHistoryItems().filter((item) => item.id !== id)
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    }
    return next
}

export function clearHistoryItems(): AnalysisHistoryItem[] {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(HISTORY_KEY)
    }
    return []
}
