'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Sparkles,
  ChevronRight,
  X,
  BookOpen,
  ArrowRight,
  HelpCircle
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

interface Conversation {
  _id: string
  title: string
  lessonId?: {
    _id: string
    title: string
  }
  updatedAt: string
}

interface Message {
  sender: 'user' | 'ai'
  text: string
  createdAt: string
}

export default function AIChatDashboardPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')

  // New Chat Creation State
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [newChatTitle, setNewChatTitle] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [availableLessons, setAvailableLessons] = useState<any[]>([])
  const [createLoading, setCreateLoading] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sendLoading])

  // Load conversations
  const loadConversations = async (selectFirst = false) => {
    try {
      setConversationsLoading(true)
      const data = await api.get('/api/ai-chats')
      const list = data.conversations || []
      setConversations(list)
      
      if (selectFirst && list.length > 0 && !activeChatId) {
        setActiveChatId(list[0]._id)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setConversationsLoading(false)
    }
  }

  useEffect(() => {
    loadConversations(true)
  }, [])

  // Load enrolled courses & lessons for context dropdown
  useEffect(() => {
    const loadEnrolledLessons = async () => {
      try {
        const enrollData = await api.get('/api/enrollments')
        const enrolls = enrollData.enrollments || []
        
        const lessonsPromises = enrolls.map(async (enroll: any) => {
          const course = enroll.courseId
          if (!course) return []
          try {
            const lessonsData = await api.get(`/api/lessons/course/${course._id}`)
            return (lessonsData.lessons || []).map((l: any) => ({
              ...l,
              courseTitle: course.title
            }))
          } catch {
            return []
          }
        })
        
        const allLessonsNested = await Promise.all(lessonsPromises)
        const allLessons = allLessonsNested.flat()
        setAvailableLessons(allLessons)
      } catch (err) {
        console.error('Failed to load context lessons:', err)
      }
    }
    loadEnrolledLessons()
  }, [])

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      try {
        setMessagesLoading(true)
        const data = await api.get(`/api/ai-chats/${activeChatId}/messages`)
        setMessages(data.history || [])
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setMessagesLoading(false)
      }
    }
    loadMessages()
  }, [activeChatId])

  // Create conversation handler
  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChatTitle.trim()) return

    try {
      setCreateLoading(true)
      const data = await api.post('/api/ai-chats', {
        title: newChatTitle.trim(),
        lessonId: selectedLessonId || undefined
      })
      
      if (data.success && data.conversation) {
        setConversations(prev => [data.conversation, ...prev])
        setActiveChatId(data.conversation._id)
        setShowNewChatModal(false)
        setNewChatTitle('')
        setSelectedLessonId('')
      }
    } catch (err) {
      console.error('Failed to create conversation:', err)
    } finally {
      setCreateLoading(false)
    }
  }

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !activeChatId || sendLoading) return

    const userMessageText = chatInput.trim()
    setChatInput('')
    
    // Optimistic user message append
    const tempUserMsg: Message = {
      sender: 'user',
      text: userMessageText,
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])
    setSendLoading(true)

    try {
      const data = await api.post(`/api/ai-chats/${activeChatId}/messages`, {
        message: userMessageText
      })

      if (data.success && data.reply) {
        const tempAiMsg: Message = {
          sender: 'ai',
          text: data.reply,
          createdAt: new Date().toISOString()
        }
        setMessages(prev => [...prev, tempAiMsg])
        
        // Touch current conversation list to place it on top
        setConversations(prev => {
          const list = [...prev]
          const idx = list.findIndex(c => c._id === activeChatId)
          if (idx !== -1) {
            const updated = { ...list[idx], updatedAt: new Date().toISOString() }
            list.splice(idx, 1)
            list.unshift(updated)
          }
          return list
        })
      }
    } catch (err: any) {
      console.error('Failed to send message:', err)
      const tempErrorMsg: Message = {
        sender: 'ai',
        text: `❌ Error: ${err.message || 'Failed to generate response.'}`,
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, tempErrorMsg])
    } finally {
      setSendLoading(false)
    }
  }

  // Delete conversation handler
  const handleDeleteConversation = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this chat session? All messages will be permanently lost.')) {
      return
    }

    try {
      await api.del(`/api/ai-chats/${chatId}`)
      setConversations(prev => prev.filter(c => c._id !== chatId))
      if (activeChatId === chatId) {
        setActiveChatId(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  const submitPresetQuestion = async (text: string) => {
    if (!activeChatId || sendLoading) return
    setChatInput(text)
  }

  const activeChat = conversations.find(c => c._id === activeChatId)

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 bg-canvas-soft overflow-hidden">
      
      {/* ── Left Sidebar: Conversations list ── */}
      <aside className="w-full md:w-80 bg-white border-r border-hairline flex flex-col shrink-0 h-[260px] md:h-full">
        
        {/* Sidebar Header with New Chat CTA */}
        <div className="p-4 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ink" />
            <h2 className="font-bold text-sm text-ink tracking-tight">AI Study Chats</h2>
          </div>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-1.5 rounded-[6px] bg-primary hover:bg-zinc-800 text-white transition-all cursor-pointer flex items-center justify-center border border-primary shadow-sm"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* List scroll container */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversationsLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Spinner className="w-5 h-5 text-primary animate-spin" />
              <p className="text-[10px] text-mute font-mono uppercase tracking-wider">Loading chats...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 mt-4">
              <div className="w-9 h-9 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center text-mute">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-ink">No conversations</p>
                <p className="text-[10px] text-mute leading-relaxed max-w-[200px] mx-auto">
                  Start your first chat with the AI Study Assistant to ask questions about your lessons!
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowNewChatModal(true)}
                className="w-full text-[11px] font-semibold py-1.5 cursor-pointer bg-primary text-white rounded-md hover:bg-zinc-800 border-0"
              >
                Create a Chat
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-hairline">
              {conversations.map((conv) => {
                const isActive = conv._id === activeChatId
                return (
                  <div
                    key={conv._id}
                    onClick={() => setActiveChatId(conv._id)}
                    className={`w-full relative group flex items-start justify-between p-4 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-canvas-soft text-ink'
                        : 'bg-white text-body hover:bg-canvas-soft hover:text-ink'
                    }`}
                  >
                    {/* Active Brand Left Indicator Line */}
                    {isActive && (
                      <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-primary" />
                    )}

                    <div className="min-w-0 flex-1 pr-3 pl-1">
                      <h4 className={`text-xs font-bold truncate leading-snug ${isActive ? 'text-ink font-extrabold' : 'text-zinc-700'}`}>
                        {conv.title}
                      </h4>
                      
                      {/* Context info tag */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {conv.lessonId ? (
                          <span className="text-[9px] font-mono text-body bg-canvas-soft-2 border border-hairline rounded px-1.5 py-0.5 max-w-[200px] truncate block" title={`Linked to lesson: ${conv.lessonId.title}`}>
                            📖 {conv.lessonId.title}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-mute bg-canvas-soft-2 border border-hairline rounded px-1.5 py-0.5">
                            💡 General Assist
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Delete button (shows on hover or active) */}
                    <button
                      onClick={(e) => handleDeleteConversation(conv._id, e)}
                      className="p-1 text-mute hover:text-red-650 rounded-md hover:bg-red-50 cursor-pointer shrink-0 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 border-0 bg-transparent"
                      title="Delete Chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── Right Panel: Chat log & workspace ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-canvas-soft relative">
        {activeChatId ? (
          <div className="flex-1 flex flex-col min-h-0 bg-white md:bg-transparent">
            
            {/* Active Chat Header */}
            <div className="h-14 px-5 bg-white border-b border-hairline flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-ink truncate leading-tight tracking-tight">
                  {activeChat?.title}
                </h3>
                {activeChat?.lessonId && (
                  <p className="text-[9px] text-zinc-550 font-mono truncate mt-0.5">
                    Grounded Context: {activeChat.lessonId.title}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 bg-canvas-soft-2 border border-hairline px-2.5 py-1 rounded-[6px]">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold font-mono text-body uppercase tracking-wider">
                  AI Online
                </span>
              </div>
            </div>

            {/* Messages Display log */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 flex flex-col min-h-0 no-scrollbar bg-canvas-soft">
              {messagesLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Spinner className="w-5 h-5 text-primary animate-spin" />
                  <p className="text-[10px] text-mute font-mono uppercase tracking-wider">Syncing history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-6 mt-4">
                  <div className="w-10 h-10 rounded-full bg-white border border-hairline shadow-sm flex items-center justify-center text-primary">
                    <Sparkles className="w-4.5 h-4.5 text-ink animate-pulse" />
                  </div>
                  <div className="max-w-[260px] space-y-1.5">
                    <h4 className="font-bold text-xs text-ink tracking-tight">Conversation initialized</h4>
                    <p className="text-[10px] text-mute leading-relaxed">
                      {activeChat?.lessonId 
                        ? "Ask anything about the video content or speech transcript. The assistant uses the lesson transcript for matching answers!"
                        : "Ask any general question about your courses, code issues, or concepts."}
                    </p>
                  </div>
                  
                  {/* Preset Pills */}
                  <div className="w-full max-w-sm space-y-2 pt-2">
                    <button
                      onClick={() => submitPresetQuestion("Please summarize the main takeaways for this topic.")}
                      className="w-full text-left px-4 py-3.5 text-xs bg-white border border-hairline hover:border-zinc-300 text-body hover:text-ink font-semibold rounded-xl vercel-card-shadow hover:vercel-card-shadow-hover transition-all duration-250 cursor-pointer flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <span>📝</span>
                        <span>Summarize main takeaways</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary transition-all translate-x-0 group-hover:translate-x-0.5" />
                    </button>
                    <button
                      onClick={() => submitPresetQuestion("Give me a step-by-step example code demonstrating this concept.")}
                      className="w-full text-left px-4 py-3.5 text-xs bg-white border border-hairline hover:border-zinc-300 text-body hover:text-ink font-semibold rounded-xl vercel-card-shadow hover:vercel-card-shadow-hover transition-all duration-250 cursor-pointer flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <span>💻</span>
                        <span>Show a code example</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary transition-all translate-x-0 group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex flex-col">
                  {messages.map((msg, index) => {
                    const isAi = msg.sender === 'ai'
                    return (
                      <div 
                        key={index} 
                        className={`flex gap-2.5 items-start max-w-[85%] ${
                          isAi ? 'self-start justify-start' : 'self-end justify-end'
                        }`}
                      >
                        {isAi && (
                          <div className="w-7 h-7 rounded-full bg-white text-ink flex items-center justify-center shrink-0 border border-hairline vercel-card-shadow">
                            <Sparkles className="w-3.5 h-3.5 text-ink" />
                          </div>
                        )}
                        
                        <div className="flex flex-col space-y-1">
                          <span className={`text-[9px] font-mono text-mute uppercase px-1 ${isAi ? 'text-left' : 'text-right'}`}>
                            {isAi ? 'Tutor AI' : 'You'}
                          </span>
                          <div
                            className={`rounded-xl px-4 py-3 text-xs leading-relaxed break-words whitespace-pre-line border ${
                              isAi
                                ? 'bg-white text-ink border-hairline rounded-tl-none vercel-card-shadow'
                                : 'bg-primary text-white border-primary rounded-tr-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>

                        {!isAi && (
                          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0 border border-primary text-[10px] font-bold font-mono shadow-sm">
                            {user?.name?.slice(0, 1).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {sendLoading && (
                    <div className="flex gap-2.5 items-start justify-start self-start max-w-[80%]">
                      <div className="w-7 h-7 rounded-full bg-white text-ink flex items-center justify-center shrink-0 border border-hairline vercel-card-shadow">
                        <Sparkles className="w-3.5 h-3.5 text-ink animate-pulse" />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className="text-[9px] font-mono text-mute uppercase px-1">Thinking</span>
                        <div className="bg-white border border-hairline text-ink rounded-xl rounded-tl-none px-4 py-2.5 text-xs vercel-card-shadow flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input message form bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-hairline flex gap-2 shrink-0 items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={sendLoading}
                placeholder={activeChat?.lessonId ? "Ask about the lesson video or subtitles..." : "Type your general study query..."}
                className="flex-1 text-xs border border-hairline rounded-[6px] px-3 py-2.5 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all duration-200 disabled:opacity-55"
              />
              <button
                type="submit"
                disabled={sendLoading || !chatInput.trim()}
                className="p-2.5 bg-primary text-white hover:bg-zinc-800 disabled:opacity-30 rounded-[6px] transition-all shrink-0 cursor-pointer flex items-center justify-center w-9.5 h-9.5 shadow-sm border-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Empty state of dashboard chat page with Vercel Mesh Gradient decoration */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 vercel-mesh-gradient">
            <div className="w-12 h-12 rounded-full bg-white border border-hairline shadow-sm flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5 text-zinc-900 animate-pulse" />
            </div>
            <div className="max-w-sm space-y-2">
              <h3 className="text-sm font-bold text-ink tracking-tight">AI Learning Partner</h3>
              <p className="text-xs text-mute leading-relaxed">
                Welcome to your workspace AI assistant dashboard. Select an existing conversation on the left, or create a new session to begin grounding your study context.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowNewChatModal(true)}
              className="px-5 py-2 text-xs font-semibold cursor-pointer bg-primary hover:bg-zinc-800 text-white rounded-full shadow-sm border-0"
            >
              Start New Chat
            </Button>
          </div>
        )}
      </main>

      {/* ── New Chat Creation Modal Overlay ── */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden vercel-modal-shadow animate-scale-up">
            <div className="px-5 py-4 border-b border-hairline flex items-center justify-between bg-canvas-soft">
              <h3 className="text-sm font-bold text-ink tracking-tight">Initialize AI Chat Session</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 hover:bg-canvas-soft-2 rounded-md text-mute hover:text-ink cursor-pointer border-0 bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateConversation} className="p-5 space-y-4">
              {/* Chat Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-mono text-mute uppercase tracking-wider block">
                  Chat Session Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next.js SSR vs SSG"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  className="w-full text-xs border border-hairline rounded-[6px] p-2.5 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all duration-200"
                />
              </div>

              {/* Lesson Context Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-mono text-mute uppercase tracking-wider block">
                  Grounding Lesson Context (Optional)
                </label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => {
                    setSelectedLessonId(e.target.value)
                    // Auto-fill title if empty or default
                    if (!newChatTitle.trim() || newChatTitle.startsWith('Chat Session')) {
                      const lesson = availableLessons.find(l => l._id === e.target.value)
                      if (lesson) {
                        setNewChatTitle(`Discuss: ${lesson.title}`)
                      } else {
                        setNewChatTitle('General Chat Session')
                      }
                    }
                  }}
                  className="w-full text-xs border border-hairline rounded-[6px] p-2.5 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all duration-200"
                >
                  <option value="">General Assistant (No lesson context)</option>
                  {availableLessons.map((l) => (
                    <option key={l._id} value={l._id}>
                      [{l.courseTitle}] {l.title}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-mute leading-relaxed pt-1">
                  Selecting a lesson grounds the AI in that specific video's Whisper subtitles to answer your queries accurately!
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowNewChatModal(false)}
                  className="text-xs font-semibold py-2 px-3.5 border border-hairline rounded-full cursor-pointer bg-white text-ink hover:bg-canvas-soft-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createLoading || !newChatTitle.trim()}
                  className="text-xs font-semibold py-2 px-4 bg-primary hover:bg-zinc-800 text-white rounded-full cursor-pointer shadow-sm border-0 disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Initialize Chat'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
