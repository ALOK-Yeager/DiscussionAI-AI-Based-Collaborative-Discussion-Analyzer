'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  Send, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  ListTodo, 
  Loader2,
  MessageSquare,
  RefreshCw,
  Copy,
  Check,
  Bot
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Sample discussion for demo
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

// Team members for sidebar
const TEAM_MEMBERS = [
  { id: 1, name: 'Rahul', role: 'Team Lead', status: 'online', initials: 'R' },
  { id: 2, name: 'Priya', role: 'Backend Developer', status: 'online', initials: 'P' },
  { id: 3, name: 'Aman', role: 'Frontend Developer', status: 'away', initials: 'A' },
  { id: 4, name: 'Sneha', role: 'Designer', status: 'offline', initials: 'S' },
  { id: 5, name: 'Vikram', role: 'QA Engineer', status: 'online', initials: 'V' },
]

// Analysis result type
interface AnalysisResult {
  summary: string
  decisions: string[]
  action_items: { task: string; assignee: string; deadline?: string }[]
}

export default function Home() {
  const [discussion, setDiscussion] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const { toast } = useToast()

  const loadSampleDiscussion = () => {
    setDiscussion(SAMPLE_DISCUSSION)
    setResult(null)
    toast({
      title: "Sample loaded",
      description: "Sample discussion has been loaded successfully.",
    })
  }

  const clearDiscussion = () => {
    setDiscussion('')
    setResult(null)
    toast({
      title: "Cleared",
      description: "Discussion has been cleared.",
    })
  }

  const analyzeDiscussion = async () => {
    if (!discussion.trim()) {
      toast({
        title: "No discussion to analyze",
        description: "Please enter or paste a discussion first.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    setResult(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ discussion }),
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const data = await response.json()
      setResult(data)
      
      toast({
        title: "Analysis Complete",
        description: "Your discussion has been analyzed successfully!",
      })
    } catch (error) {
      console.error('Analysis error:', error)
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing the discussion. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Discussion Analyzer</h1>
              <p className="text-xs text-gray-500">AI-Powered Team Collaboration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered
            </Badge>
            <Badge variant="outline" className="text-xs">
              B.Tech Major Project
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-full">
          
          {/* Left Sidebar - Team List */}
          <aside className="lg:col-span-2 order-2 lg:order-1">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Members
                </CardTitle>
                <CardDescription className="text-xs">
                  {TEAM_MEMBERS.length} members
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-320px)] lg:h-[calc(100vh-280px)]">
                  <div className="px-4 pb-4 space-y-2">
                    {TEAM_MEMBERS.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              member.status === 'online'
                                ? 'bg-green-500'
                                : member.status === 'away'
                                ? 'bg-yellow-500'
                                : 'bg-gray-300'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          <p className="text-xs text-gray-500 truncate">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Center - Discussion Input */}
          <section className="lg:col-span-5 order-1 lg:order-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Discussion Input
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Paste or type your team discussion
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadSampleDiscussion}
                      className="text-xs"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Load Sample
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDiscussion}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <Textarea
                  placeholder="Paste your team discussion here...

Example format:
Rahul: Let's finalize the project today.
Priya: I'll handle the backend.
Aman: UI by tomorrow."
                  value={discussion}
                  onChange={(e) => setDiscussion(e.target.value)}
                  className="flex-1 min-h-[300px] lg:min-h-[calc(100vh-380px)] resize-none text-sm"
                />
                <Button
                  onClick={analyzeDiscussion}
                  disabled={isAnalyzing || !discussion.trim()}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Discussion...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Discussion
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Right - Analysis Output */}
          <aside className="lg:col-span-5 order-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Analysis Results
                </CardTitle>
                <CardDescription className="text-xs">
                  Structured output from your discussion
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {!result && !isAnalyzing && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Send className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">
                      Enter a discussion and click <span className="font-medium">Analyze</span> to see results
                    </p>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-gray-200 animate-pulse" />
                      <Loader2 className="w-8 h-8 absolute top-4 left-4 text-emerald-500 animate-spin" />
                    </div>
                    <p className="text-gray-500 text-sm mt-4">Analyzing your discussion...</p>
                    <p className="text-gray-400 text-xs mt-1">This may take a few seconds</p>
                  </div>
                )}

                {result && (
                  <ScrollArea className="h-[calc(100vh-320px)] lg:h-[calc(100vh-280px)]">
                    <div className="space-y-4 pr-4">
                      {/* Summary Section */}
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Summary
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(result.summary, 'Summary')}
                          >
                            {copied === 'Summary' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                      </div>

                      {/* Decisions Section */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Key Decisions
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(result.decisions.join('\n'), 'Decisions')}
                          >
                            {copied === 'Decisions' ? (
                              <Check className="w-3 h-3 text-amber-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        <ul className="space-y-2">
                          {result.decisions.map((decision, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-amber-500 mt-1">•</span>
                              {decision}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Action Items Section */}
                      <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                            <ListTodo className="w-4 h-4" />
                            Action Items
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => 
                              copyToClipboard(
                                result.action_items.map(a => `${a.task} - ${a.assignee}${a.deadline ? ` (${a.deadline})` : ''}`).join('\n'),
                                'Action Items'
                              )
                            }
                          >
                            {copied === 'Action Items' ? (
                              <Check className="w-3 h-3 text-blue-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {result.action_items.map((item, index) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-white/50 rounded-md">
                              <Badge variant="outline" className="text-xs shrink-0 bg-white">
                                {item.assignee}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700">{item.task}</p>
                                {item.deadline && (
                                  <p className="text-xs text-gray-500 mt-0.5">Due: {item.deadline}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <p>AI-Based Collaborative Discussion Analyzer</p>
            <p>B.Tech Major Project | Alokit Mishra | BPIT</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
