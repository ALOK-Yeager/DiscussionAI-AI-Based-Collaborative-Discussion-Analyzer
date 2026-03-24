"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  History,
  ListTodo,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  PlayCircle,
  Presentation,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'

import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import {
  analyzeAudioInput,
  analyzeDocumentInput,
  analyzeImageInput,
  analyzeTextDiscussion,
  analyzeVideoInput,
  buildPreviewFromContent,
  exportResultAsText,
  type AnalysisResult,
  type InputType,
} from '@/lib/analysis-engine'
import { saveHistoryItem } from '@/lib/analysis-history'

const SAMPLE_DISCUSSION = `Rahul: Let's finalize the project topic today. We've been delaying this for too long.
Priya: I agree. I think we should go with the AI-based discussion analyzer.
Aman: Sounds good to me. I'll handle the frontend development.
Priya: I'll take care of the backend and API integration.
Rahul: Great! I'll manage the documentation and testing.
Aman: We should complete the UI by tomorrow evening.
Priya: Backend will be ready by day after tomorrow.
Rahul: Let's have a review meeting on Friday to check progress.
Aman: I'll create the initial wireframes and share them by tonight.
Priya: Make sure to include the three-column layout as discussed.
Rahul: Team, let's commit to these deadlines. Meeting adjourned!`

const TEAM_MEMBERS = [
  { id: 1, name: 'Rahul', role: 'Team Lead', status: 'online', initials: 'R' },
  { id: 2, name: 'Priya', role: 'Backend Developer', status: 'online', initials: 'P' },
  { id: 3, name: 'Aman', role: 'Frontend Developer', status: 'away', initials: 'A' },
  { id: 4, name: 'Sneha', role: 'Designer', status: 'offline', initials: 'S' },
  { id: 5, name: 'Vikram', role: 'QA Engineer', status: 'online', initials: 'V' },
]

function bytesToSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

function downloadBlob(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function Home() {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<InputType>('text')
  const [discussion, setDiscussion] = useState('')
  const [docText, setDocText] = useState('')

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [audioDurationSec, setAudioDurationSec] = useState(0)

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [videoDurationSec, setVideoDurationSec] = useState(0)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingIntervalRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      cleanupRecorder()
    }
  }, [audioUrl, videoUrl])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault()
        void handleAnalyze()
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        setActiveTab('text')
        setDiscussion(SAMPLE_DISCUSSION)
        setResult(null)
        toast({ title: 'Sample loaded', description: 'Text sample loaded for quick analysis.' })
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        clearCurrentInput()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTab, toast])

  const transcriptionPreview = useMemo(() => {
    if (result?.transcription) return buildPreviewFromContent(result.transcription, 180)
    return ''
  }, [result])

  const cleanupRecorder = () => {
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
  }

  const drawWaveform = () => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const render = () => {
      if (!analyserRef.current || !canvasRef.current) return

      analyser.getByteFrequencyData(dataArray)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ede9fe'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const bars = 48
      const barWidth = canvas.width / bars
      for (let i = 0; i < bars; i += 1) {
        const v = dataArray[i] / 255
        const h = Math.max(4, v * canvas.height)
        const x = i * barWidth
        const y = (canvas.height - h) / 2
        const grad = ctx.createLinearGradient(x, y, x, y + h)
        grad.addColorStop(0, '#8b5cf6')
        grad.addColorStop(1, '#6d28d9')
        ctx.fillStyle = grad
        ctx.fillRect(x + 1, y, Math.max(2, barWidth - 2), h)
      }

      animationFrameRef.current = window.requestAnimationFrame(render)
    }

    render()
  }

  const startRecording = async () => {
    try {
      if (isRecording) return

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      recordedChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        setRecordingBlob(blob)
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setAudioFile(new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' }))
        setAudioDurationSec(recordingSeconds)
        cleanupRecorder()
      }

      recorder.start(200)
      setIsRecording(true)
      setRecordingSeconds(0)
      setRecordingBlob(null)
      setResult(null)

      drawWaveform()

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1
          if (next >= 120) {
            stopRecording()
          }
          return next
        })
      }, 1000)

      toast({ title: 'Recording started', description: 'Microphone recording is live (max 2 minutes).' })
    } catch {
      toast({
        title: 'Recording failed',
        description: 'Could not access microphone. Check browser permissions.',
        variant: 'destructive',
      })
    }
  }

  const stopRecording = () => {
    if (!isRecording) return
    setIsRecording(false)
    mediaRecorderRef.current?.stop()
    toast({ title: 'Recording stopped', description: 'You can play back the audio before analyzing.' })
  }

  const clearCurrentInput = () => {
    if (activeTab === 'text') {
      setDiscussion('')
    }
    if (activeTab === 'audio') {
      setAudioFile(null)
      setAudioDurationSec(0)
      setRecordingBlob(null)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl('')
      if (isRecording) stopRecording()
    }
    if (activeTab === 'video') {
      setVideoFile(null)
      setVideoDurationSec(0)
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      setVideoUrl('')
    }
    if (activeTab === 'image') {
      setImageFile(null)
    }
    if (activeTab === 'document') {
      setDocumentFile(null)
      setDocText('')
    }

    setResult(null)
    toast({ title: 'Cleared', description: `Cleared ${activeTab} input.` })
  }

  const runProgress = async <T,>(job: () => T): Promise<T> => {
    setProgress(0)
    return new Promise((resolve) => {
      let value = 0
      const id = window.setInterval(() => {
        value = Math.min(95, value + Math.floor(6 + Math.random() * 12))
        setProgress(value)
        if (value >= 95) {
          window.clearInterval(id)
          const output = job()
          setProgress(100)
          window.setTimeout(() => resolve(output), 180)
        }
      }, 170)
    })
  }

  const createHistoryEntry = (analysis: AnalysisResult) => {
    const details: { fileName?: string; fileSize?: number; durationSec?: number } = {}
    let preview = ''

    if (activeTab === 'text') {
      preview = buildPreviewFromContent(discussion)
    }
    if (activeTab === 'audio') {
      preview = audioFile ? `Audio: ${audioFile.name} (${bytesToSize(audioFile.size)})` : 'Recorded audio clip'
      if (audioFile) {
        details.fileName = audioFile.name
        details.fileSize = audioFile.size
      }
      details.durationSec = audioDurationSec || recordingSeconds
    }
    if (activeTab === 'video') {
      preview = videoFile ? `Video: ${videoFile.name} (${bytesToSize(videoFile.size)})` : 'Uploaded video'
      if (videoFile) {
        details.fileName = videoFile.name
        details.fileSize = videoFile.size
      }
      details.durationSec = videoDurationSec
    }
    if (activeTab === 'image') {
      preview = imageFile ? `Image: ${imageFile.name} (${bytesToSize(imageFile.size)})` : 'Image analysis'
      if (imageFile) {
        details.fileName = imageFile.name
        details.fileSize = imageFile.size
      }
    }
    if (activeTab === 'document') {
      preview = documentFile
        ? `Document: ${documentFile.name} (${bytesToSize(documentFile.size)})`
        : buildPreviewFromContent(docText || 'Document content analysis')
      if (documentFile) {
        details.fileName = documentFile.name
        details.fileSize = documentFile.size
      }
    }

    saveHistoryItem({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      inputType: activeTab,
      preview,
      summary: analysis.summary,
      details,
      result: analysis,
    })
  }

  const handleAnalyze = async () => {
    if (isAnalyzing) return

    if (activeTab === 'text' && !discussion.trim()) {
      toast({ title: 'No text to analyze', description: 'Please enter discussion text.', variant: 'destructive' })
      return
    }
    if (activeTab === 'audio' && !audioFile && !recordingBlob) {
      toast({ title: 'No audio selected', description: 'Upload or record audio first.', variant: 'destructive' })
      return
    }
    if (activeTab === 'video' && !videoFile) {
      toast({ title: 'No video selected', description: 'Upload a video file first.', variant: 'destructive' })
      return
    }
    if (activeTab === 'image' && !imageFile) {
      toast({ title: 'No image selected', description: 'Upload an image first.', variant: 'destructive' })
      return
    }
    if (activeTab === 'document' && !documentFile && !docText.trim()) {
      toast({ title: 'No document content', description: 'Upload a document or add text.', variant: 'destructive' })
      return
    }

    setResult(null)
    setIsAnalyzing(true)

    try {
      const analysis = await runProgress(() => {
        if (activeTab === 'text') {
          return analyzeTextDiscussion(discussion)
        }

        if (activeTab === 'audio') {
          const fileName = audioFile?.name ?? 'recorded-audio.webm'
          const fileSize = audioFile?.size ?? recordingBlob?.size ?? 0
          const durationSec = audioDurationSec || recordingSeconds || 60
          return analyzeAudioInput({ fileName, fileSize, durationSec })
        }

        if (activeTab === 'video') {
          return analyzeVideoInput({
            fileName: videoFile?.name ?? 'uploaded-video.mp4',
            fileSize: videoFile?.size ?? 0,
            durationSec: videoDurationSec || 120,
          })
        }

        if (activeTab === 'image') {
          return analyzeImageInput(imageFile?.name ?? 'uploaded-image.png', imageFile?.size ?? 0)
        }

        return analyzeDocumentInput(documentFile?.name ?? 'document.txt', docText)
      })

      setResult(analysis)
      createHistoryEntry(analysis)
      toast({ title: 'Analysis complete', description: 'Structured insights generated successfully.' })
    } catch {
      toast({ title: 'Analysis failed', description: 'Something went wrong during analysis.', variant: 'destructive' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const exportText = () => {
    if (!result) return
    const content = exportResultAsText(result)
    downloadBlob(content, `analysis-${Date.now()}.txt`, 'text/plain')
    toast({ title: 'Exported', description: 'Text report downloaded.' })
  }

  const exportJson = () => {
    if (!result) return
    const content = JSON.stringify(result, null, 2)
    downloadBlob(content, `analysis-${Date.now()}.json`, 'application/json')
    toast({ title: 'Exported', description: 'JSON report downloaded.' })
  }

  const exportPdf = () => {
    window.print()
    toast({ title: 'Print opened', description: 'Use Save as PDF in the print dialog.' })
  }

  const copySummary = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.summary)
    toast({ title: 'Copied', description: 'Summary copied to clipboard.' })
  }

  const runQuickDemo = async () => {
    if (isAnalyzing) return

    setActiveTab('text')
    setDiscussion(SAMPLE_DISCUSSION)
    setResult(null)
    setIsAnalyzing(true)

    try {
      const analysis = await runProgress(() => analyzeTextDiscussion(SAMPLE_DISCUSSION))
      setResult(analysis)

      saveHistoryItem({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        inputType: 'text',
        preview: buildPreviewFromContent(SAMPLE_DISCUSSION),
        summary: analysis.summary,
        details: {},
        result: analysis,
      })

      toast({ title: 'Demo ready', description: 'Loaded sample and completed full analysis for presentation.' })
    } catch {
      toast({ title: 'Demo failed', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resultStats = result
    ? [
        { label: 'Participants', value: String(result.participants.length) },
        { label: 'Decisions', value: String(result.decisions.length) },
        { label: 'Action Items', value: String(result.actionItems.length) },
        { label: 'Topics', value: String(result.topics.length) },
      ]
    : []

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b bg-white/85 backdrop-blur-sm dark:bg-slate-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Discussion Analyzer</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">AI-Based Collaborative Discussion Analyzer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => void runQuickDemo()}>
                  <PlayCircle className="size-4 mr-1" /> Demo
                </Button>
              </TooltipTrigger>
              <TooltipContent>One-click sample run for live demonstration</TooltipContent>
            </Tooltip>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="rounded-xl hidden sm:inline-flex">
                  <Presentation className="size-4 mr-1" /> Professor Pitch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>How To Explain This Project In 45 Seconds</DialogTitle>
                  <DialogDescription>Use this script during your presentation.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <section className="rounded-md border p-3">
                    <p className="font-semibold mb-1">Problem</p>
                    <p>Team discussions are unstructured, so important decisions and action items often get lost.</p>
                  </section>
                  <section className="rounded-md border p-3">
                    <p className="font-semibold mb-1">Solution</p>
                    <p>This system converts text, audio, video, images, and documents into structured outputs: summary, decisions, action items, participants, sentiment, and engagement.</p>
                  </section>
                  <section className="rounded-md border p-3">
                    <p className="font-semibold mb-1">Innovation</p>
                    <p>It combines multi-format ingestion with explainable analytics and a persistent history dashboard, all in one collaborative interface.</p>
                  </section>
                  <section className="rounded-md border p-3">
                    <p className="font-semibold mb-1">Impact</p>
                    <p>Teams can move from conversation to execution faster, with clear accountability and fewer missed commitments.</p>
                  </section>
                </div>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link href="/history">
                    <History className="size-4 mr-1" />
                    History
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open analysis history dashboard</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 lg:p-6">
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="shadow-sm border-emerald-100">
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Target className="size-3.5" /> Problem Solved
              </p>
              <p className="text-sm mt-1 text-slate-700 dark:text-slate-200">Turns messy team discussions into trackable outcomes.</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-amber-100">
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">How It Works</p>
              <p className="text-sm mt-1 text-slate-700 dark:text-slate-200">Ingest any format, simulate extraction, generate structured insights.</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-sky-100">
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-sky-700 dark:text-sky-300">Outcome</p>
              <p className="text-sm mt-1 text-slate-700 dark:text-slate-200">Faster reviews, clearer ownership, and auditable discussion history.</p>
            </CardContent>
          </Card>
        </div>

        {resultStats.length > 0 && (
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {resultStats.map((stat) => (
              <Card key={stat.label} className="shadow-sm">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-full">
          <aside className="lg:col-span-2 order-2 lg:order-1">
            <Card className="h-full shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" /> Team Members
                </CardTitle>
                <CardDescription className="text-xs">{TEAM_MEMBERS.length} active members</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-320px)] lg:h-[calc(100vh-280px)]">
                  <div className="px-4 pb-4 space-y-2">
                    {TEAM_MEMBERS.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs font-medium bg-linear-to-br from-emerald-400 to-teal-500 text-white">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              member.status === 'online' ? 'bg-green-500' : member.status === 'away' ? 'bg-yellow-500' : 'bg-slate-300'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          <p className="text-xs text-slate-500 truncate">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          <section className="lg:col-span-5 order-1 lg:order-2">
            <Card className="h-full flex flex-col shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Input Section
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">Tabs: Text, Audio, Video, Image, Document</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => { setActiveTab('text'); setDiscussion(SAMPLE_DISCUSSION); setResult(null) }}>
                          <FileText className="w-3 h-3 mr-1" /> Load Sample
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ctrl+L</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={clearCurrentInput}>
                          <Trash2 className="w-3 h-3 mr-1" /> Clear
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Esc</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InputType)} className="h-full">
                  <TabsList className="grid grid-cols-5 w-full">
                    <TabsTrigger value="text">Text</TabsTrigger>
                    <TabsTrigger value="audio">Audio</TabsTrigger>
                    <TabsTrigger value="video">Video</TabsTrigger>
                    <TabsTrigger value="image">Image</TabsTrigger>
                    <TabsTrigger value="document">Document</TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-3">
                    <Textarea
                      value={discussion}
                      onChange={(e) => setDiscussion(e.target.value)}
                      placeholder="Paste discussion transcript with speaker names..."
                      className="min-h-70 lg:min-h-[calc(100vh-430px)] resize-none"
                    />
                  </TabsContent>

                  <TabsContent value="audio" className="space-y-3">
                    <div className="rounded-xl border p-3 bg-linear-to-r from-purple-50 to-fuchsia-50 dark:from-purple-950/40 dark:to-fuchsia-950/20">
                      <LabelRow icon={<FileAudio className="size-4" />} title="Audio Upload" />
                      <Input
                        type="file"
                        accept=".mp3,.wav,.m4a,.ogg,.webm,audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          if (!file) return
                          setAudioFile(file)
                          setRecordingBlob(null)
                          if (audioUrl) URL.revokeObjectURL(audioUrl)
                          const url = URL.createObjectURL(file)
                          setAudioUrl(url)
                          setResult(null)
                        }}
                      />
                    </div>

                    <div className="rounded-xl border p-3 bg-white dark:bg-slate-900">
                      <LabelRow icon={<Mic className="size-4" />} title="Microphone Recorder (max 2:00)" />
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Button
                          type="button"
                          variant={isRecording ? 'destructive' : 'default'}
                          onClick={isRecording ? stopRecording : startRecording}
                          className={isRecording ? '' : 'bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'}
                        >
                          {isRecording ? <MicOff className="size-4 mr-2" /> : <Mic className="size-4 mr-2" />}
                          {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </Button>
                        <Badge variant="outline"><Clock3 className="size-3 mr-1" /> {formatDuration(recordingSeconds)}</Badge>
                      </div>

                      <canvas ref={canvasRef} width={820} height={90} className="w-full h-22.5 rounded-lg border bg-purple-50 dark:bg-purple-950/20" />
                    </div>

                    {audioUrl && (
                      <div className="rounded-xl border p-3 bg-white dark:bg-slate-900">
                        <LabelRow icon={<Upload className="size-4" />} title="Audio Preview" />
                        <audio
                          controls
                          src={audioUrl}
                          className="w-full"
                          onLoadedMetadata={(e) => setAudioDurationSec(e.currentTarget.duration || 0)}
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          {audioFile ? `${audioFile.name} (${bytesToSize(audioFile.size)})` : 'Recorded clip'}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="video" className="space-y-3">
                    <div className="rounded-xl border p-3 bg-linear-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20">
                      <LabelRow icon={<FileVideo className="size-4" />} title="Video Upload (max 50MB)" />
                      <Input
                        type="file"
                        accept=".mp4,.webm,.mov,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          if (!file) return
                          if (file.size > 50 * 1024 * 1024) {
                            toast({ title: 'File too large', description: 'Upload video under 50MB.', variant: 'destructive' })
                            return
                          }
                          setVideoFile(file)
                          if (videoUrl) URL.revokeObjectURL(videoUrl)
                          setVideoUrl(URL.createObjectURL(file))
                          setResult(null)
                        }}
                      />
                    </div>

                    {videoUrl && (
                      <div className="rounded-xl border p-3 bg-white dark:bg-slate-900">
                        <LabelRow icon={<Upload className="size-4" />} title="Video Preview" />
                        <video
                          controls
                          src={videoUrl}
                          className="w-full rounded-lg border"
                          onLoadedMetadata={(e) => setVideoDurationSec(e.currentTarget.duration || 0)}
                        />
                        {videoFile && (
                          <p className="text-xs text-slate-500 mt-2">
                            {videoFile.name} | {bytesToSize(videoFile.size)} | Duration {formatDuration(videoDurationSec)}
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="image" className="space-y-3">
                    <div className="rounded-xl border p-3 bg-linear-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20">
                      <LabelRow icon={<FileImage className="size-4" />} title="Image Upload" />
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          setImageFile(file)
                          setResult(null)
                        }}
                      />
                      {imageFile && <p className="text-xs text-slate-500 mt-2">{imageFile.name} ({bytesToSize(imageFile.size)})</p>}
                    </div>
                  </TabsContent>

                  <TabsContent value="document" className="space-y-3">
                    <div className="rounded-xl border p-3 bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
                      <LabelRow icon={<FileText className="size-4" />} title="Document Upload" />
                      <Input
                        type="file"
                        accept=".txt,.md,.doc,.docx,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          setDocumentFile(file)
                          setResult(null)
                        }}
                      />
                      {documentFile && <p className="text-xs text-slate-500 mt-2">{documentFile.name} ({bytesToSize(documentFile.size)})</p>}
                    </div>
                    <Textarea
                      value={docText}
                      onChange={(e) => setDocText(e.target.value)}
                      placeholder="Optional: paste extracted document text for deeper analysis..."
                      className="min-h-55 resize-none"
                    />
                  </TabsContent>
                </Tabs>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => void handleAnalyze()}
                      disabled={isAnalyzing}
                      className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" /> Analyze ({activeTab})
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ctrl+Enter</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </section>

          <aside className="lg:col-span-5 order-3">
            <Card className="h-full flex flex-col shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Results Section
                    </CardTitle>
                    <CardDescription className="text-xs">Summary, decisions, action items, insights, participants, and analytics</CardDescription>
                  </div>

                  {result && (
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" onClick={copySummary}><Copy className="size-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy summary</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" onClick={exportText}><Download className="size-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Export text</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" onClick={exportJson}><FileText className="size-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Export JSON</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" onClick={exportPdf}><FileVideo className="size-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Export PDF (Print)</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                {!result && !isAnalyzing && (
                  <div className="h-full min-h-90 flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">Choose a tab, provide input, and click Analyze to generate insights.</p>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="space-y-4 py-6">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-300">Processing {activeTab} analysis...</p>
                      <Progress value={progress} />
                      <p className="text-xs text-slate-500">{progress}% complete</p>
                    </div>
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                )}

                <AnimatePresence>
                  {result && !isAnalyzing && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
                      <ScrollArea className="h-[calc(100vh-320px)] lg:h-[calc(100vh-280px)] pr-4">
                        <div className="space-y-4">
                          <section className="rounded-lg p-4 border border-emerald-100 bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
                            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2"><FileText className="size-4" /> Summary</h3>
                            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{result.summary}</p>
                          </section>

                          <section className="rounded-lg p-4 border border-amber-100 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
                            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2"><CheckCircle2 className="size-4" /> Key Decisions</h3>
                            <ul className="space-y-2 text-sm">
                              {result.decisions.length === 0 && <li className="text-slate-500">No explicit decisions detected.</li>}
                              {result.decisions.map((decision, index) => (
                                <li key={index} className="flex gap-2 text-slate-700 dark:text-slate-200"><span>•</span><span>{decision}</span></li>
                              ))}
                            </ul>
                          </section>

                          <section className="rounded-lg p-4 border border-sky-100 bg-linear-to-br from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/20">
                            <h3 className="text-sm font-semibold text-sky-800 dark:text-sky-300 mb-2 flex items-center gap-2"><ListTodo className="size-4" /> Action Items</h3>
                            <div className="space-y-2">
                              {result.actionItems.length === 0 && <p className="text-sm text-slate-500">No action items identified.</p>}
                              {result.actionItems.map((item, index) => (
                                <div key={index} className="rounded-md bg-white/70 dark:bg-slate-900/50 border p-2 text-sm">
                                  <p className="font-medium text-slate-700 dark:text-slate-200">{item.task}</p>
                                  <p className="text-xs text-slate-500 mt-1">Owner: {item.assignee}{item.deadline ? ` | Deadline: ${item.deadline}` : ''}</p>
                                </div>
                              ))}
                            </div>
                          </section>

                          <section className="rounded-lg p-4 border border-rose-100 bg-linear-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20">
                            <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-2"><Sparkles className="size-4" /> AI Insights</h3>
                            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                              {result.aiInsights.map((insight, index) => (
                                <li key={index}>• {insight}</li>
                              ))}
                            </ul>
                          </section>

                          <section className="rounded-lg border p-4 bg-white dark:bg-slate-900">
                            <h3 className="text-sm font-semibold mb-2">Participants</h3>
                            <div className="flex flex-wrap gap-2">
                              {result.participants.map((participant) => (
                                <Badge key={participant} variant="secondary">{participant}</Badge>
                              ))}
                            </div>
                          </section>

                          {result.topics.length > 0 && (
                            <section className="rounded-lg border p-4 bg-white dark:bg-slate-900">
                              <h3 className="text-sm font-semibold mb-2">Topics Detected</h3>
                              <div className="flex flex-wrap gap-2">
                                {result.topics.map((topic) => (
                                  <Badge key={topic} variant="outline">{topic}</Badge>
                                ))}
                              </div>
                            </section>
                          )}

                          {result.sentimentByMessage.length > 0 && (
                            <section className="rounded-lg border p-4 bg-white dark:bg-slate-900">
                              <h3 className="text-sm font-semibold mb-2">Sentiment by Message</h3>
                              <div className="space-y-2">
                                {result.sentimentByMessage.map((entry, index) => (
                                  <div key={index} className="text-xs rounded-md border p-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium">{entry.speaker}</span>
                                      <Badge variant={entry.sentiment === 'Positive' ? 'default' : entry.sentiment === 'Negative' ? 'destructive' : 'secondary'}>
                                        {entry.sentiment}
                                      </Badge>
                                    </div>
                                    <p className="mt-1 text-slate-600 dark:text-slate-300">{entry.message}</p>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {result.engagement.length > 0 && (
                            <section className="rounded-lg border p-4 bg-white dark:bg-slate-900">
                              <h3 className="text-sm font-semibold mb-2">Engagement Score</h3>
                              <div className="space-y-2">
                                {result.engagement.map((entry) => (
                                  <div key={entry.participant}>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span>{entry.participant}</span>
                                      <span>{entry.percentage}% ({entry.messageCount} msgs)</span>
                                    </div>
                                    <Progress value={entry.percentage} />
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {result.discussionFlow.length > 0 && (
                            <section className="rounded-lg border p-4 bg-white dark:bg-slate-900">
                              <h3 className="text-sm font-semibold mb-2">Discussion Flow Timeline</h3>
                              <div className="space-y-2">
                                {result.discussionFlow.map((entry) => (
                                  <div key={entry.step} className="text-xs rounded-md border p-2">
                                    <p className="font-medium">Step {entry.step}: {entry.speaker}</p>
                                    <p className="text-slate-600 dark:text-slate-300">{entry.message}</p>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {transcriptionPreview && (
                            <section className="rounded-lg border p-4 bg-white dark:bg-slate-900">
                              <h3 className="text-sm font-semibold mb-2">Transcription</h3>
                              <p className="text-xs text-slate-600 dark:text-slate-300">{transcriptionPreview}</p>
                            </section>
                          )}

                          {result.visualElements && result.visualElements.length > 0 && (
                            <section className="rounded-lg border p-4 bg-white dark:bg-slate-900">
                              <h3 className="text-sm font-semibold mb-2">Visual Elements Detected</h3>
                              <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                                {result.visualElements.map((item, index) => (
                                  <li key={index}>• {item}</li>
                                ))}
                              </ul>
                            </section>
                          )}
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </aside>
        </div>
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

function LabelRow({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
      {icon}
      <span>{title}</span>
    </div>
  )
}
