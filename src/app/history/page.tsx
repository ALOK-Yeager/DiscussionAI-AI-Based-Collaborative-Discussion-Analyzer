"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  History,
  Trash2,
} from 'lucide-react'

import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  clearHistoryItems,
  deleteHistoryItem,
  getHistoryItems,
  type AnalysisHistoryItem,
} from '@/lib/analysis-history'

function getTypeIcon(type: AnalysisHistoryItem['inputType']) {
  if (type === 'audio') return <FileAudio className="size-4" />
  if (type === 'video') return <FileVideo className="size-4" />
  if (type === 'image') return <FileImage className="size-4" />
  return <FileText className="size-4" />
}

function formatType(type: AnalysisHistoryItem['inputType']) {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} Analysis`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default function HistoryPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<AnalysisHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setItems(getHistoryItems())
      setLoading(false)
    }, 220)
    return () => window.clearTimeout(id)
  }, [])

  const total = useMemo(() => items.length, [items])

  const handleDelete = (id: string) => {
    const next = deleteHistoryItem(id)
    setItems(next)
    toast({ title: 'Deleted', description: 'History item removed.' })
  }

  const handleClearAll = () => {
    const next = clearHistoryItems()
    setItems(next)
    toast({ title: 'Cleared', description: 'All history entries deleted.' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b bg-white/85 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Analysis History</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">Stored locally in browser storage</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/">
                <ArrowLeft className="size-4 mr-1" />
                Back to Analyzer
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="size-4" /> Analysis History
                </CardTitle>
                <CardDescription>{total} saved analyses</CardDescription>
              </div>

              <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={total === 0}>
                <Trash2 className="size-4 mr-1" /> Clear All
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="text-center py-12 text-sm text-slate-500">
                No history yet. Run an analysis on the main page to populate this dashboard.
              </div>
            )}

            {!loading && items.length > 0 && (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-3 pr-2">
                  {items.map((item) => (
                    <Card key={item.id} className="border shadow-none">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getTypeIcon(item.inputType)}
                              <p className="font-semibold text-sm">{formatType(item.inputType)}</p>
                              <Badge variant="outline" className="text-[11px]">{formatDate(item.createdAt)}</Badge>
                            </div>
                            <p className="text-xs text-slate-500">Preview: {item.preview}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Summary: {item.summary}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">View Details</Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>{formatType(item.inputType)}</DialogTitle>
                                  <DialogDescription>{formatDate(item.createdAt)}</DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="max-h-[65vh] pr-3">
                                  <div className="space-y-3 text-sm">
                                    <section className="rounded-md border p-3">
                                      <p className="font-semibold mb-1">Summary</p>
                                      <p>{item.result.summary}</p>
                                    </section>

                                    <section className="rounded-md border p-3">
                                      <p className="font-semibold mb-1">Decisions</p>
                                      <ul className="space-y-1">
                                        {item.result.decisions.length === 0 && <li className="text-slate-500">None</li>}
                                        {item.result.decisions.map((d, i) => <li key={i}>• {d}</li>)}
                                      </ul>
                                    </section>

                                    <section className="rounded-md border p-3">
                                      <p className="font-semibold mb-1">Action Items</p>
                                      <ul className="space-y-1">
                                        {item.result.actionItems.length === 0 && <li className="text-slate-500">None</li>}
                                        {item.result.actionItems.map((a, i) => (
                                          <li key={i}>• {a.task} | {a.assignee}{a.deadline ? ` | ${a.deadline}` : ''}</li>
                                        ))}
                                      </ul>
                                    </section>

                                    <section className="rounded-md border p-3">
                                      <p className="font-semibold mb-1">Raw JSON</p>
                                      <pre className="text-xs overflow-auto bg-slate-950 text-slate-100 p-3 rounded-md">
                                        {JSON.stringify(item.result, null, 2)}
                                      </pre>
                                    </section>
                                  </div>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>

                            <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-white/85 dark:bg-slate-900/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <p>AI-Based Collaborative Discussion Analyzer</p>
            <p>Alokit Mishra | BPIT | B.Tech Major Project</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
