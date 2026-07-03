import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Lightbulb, Award } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'

function Interview() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [messages, setMessages] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null) 
  const [sessionInfo, setSessionInfo] = useState(null)
  const [showNextPrompt, setShowNextPrompt] = useState(false)
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sessions, setSessions] = useState([])
  const chatEndRef = useRef(null)

  useEffect(() => {
    fetchSessionHistory()
    fetchSessions()
  }, [sessionId])

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/user/${userId}/sessions`)
      setSessions(res.data.sessions)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchSessionHistory = async () => {
    const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/session/${sessionId}/history`)
    setSessionInfo(res.data)

    const msgs = []
    res.data.history.forEach((h) => {
      msgs.push({ type: 'question', text: h.question })
      msgs.push({ type: 'answer', text: h.answer })
      msgs.push({ type: 'feedback', score: h.score, text: h.feedback })
    })

    const lastAnsweredQuestion = res.data.history.length > 0 ? res.data.history[res.data.history.length - 1].question : null
    const currentQuestionAlreadyAnswered = lastAnsweredQuestion === res.data.current_question

    if (res.data.status === 'completed') {
      if (res.data.summary) {
        setSummaryData({ text: res.data.summary, score: res.data.final_score })
      }
      setSessionEnded(true)
    } else if (currentQuestionAlreadyAnswered) {
      if (res.data.history.length >= res.data.total_questions) {
        setShowSummaryPrompt(true)
      } else {
        setShowNextPrompt(true)
      }
    } else if (res.data.current_question && res.data.history.length < res.data.total_questions) {
      msgs.push({ type: 'question', text: res.data.current_question })
    }

    setMessages(msgs)
  }

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) return

    const answerText = currentAnswer
    setMessages((prev) => [...prev, { type: 'answer', text: answerText }])
    setCurrentAnswer('')
    setLoading(true)

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/session/answer`, {
        session_id: sessionId,
        user_answer: answerText
      })

      if (res.data.intent === 'off_topic') {
        setMessages((prev) => [...prev, { type: 'system', text: res.data.message }])
      } else if (res.data.intent === 'request_clarification') {
        setMessages((prev) => [...prev, { type: 'system', text: res.data.message }])
      } else if (res.data.intent === 'request_elaboration') {
        setMessages((prev) => [...prev, { type: 'system', text: res.data.message }])
      } else if (res.data.intent === 'request_hint') {
        setMessages((prev) => [...prev, { type: 'hint', text: res.data.hint }])
      } else if (res.data.intent === 'skip_question') {
        setMessages((prev) => [...prev, { type: 'system', text: 'Question skipped.' }])
        const updatedHistoryLength = res.data.history.length
        setSessionInfo((prev) => ({ ...prev, history: res.data.history }))
        if (updatedHistoryLength >= sessionInfo.total_questions) {
          setShowSummaryPrompt(true)
        } else {
          setShowNextPrompt(true)
        }
      } else {
        // intent === 'answer'
        setMessages((prev) => [...prev, { type: 'feedback', score: res.data.score, text: res.data.feedback, modelAnswer: res.data.model_answer }])

        if (res.data.hint) {
          setMessages((prev) => [...prev, { type: 'hint', text: res.data.hint }])
        } else {
          const updatedHistoryLength = res.data.history.length
          if (updatedHistoryLength >= sessionInfo.total_questions) {
            setShowSummaryPrompt(true)
          } else {
            setShowNextPrompt(true)
          }
        }

        setSessionInfo((prev) => ({ ...prev, history: res.data.history }))
      }
    } catch (err) {
      console.log(err)
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGetHint = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/session/hint`, {
        session_id: sessionId
      })
      if (res.data.hint) {
        setMessages((prev) => [...prev, { type: 'hint', text: res.data.hint }])
      } else {
        setMessages((prev) => [...prev, { type: 'hint', text: 'No hints remaining for this question.' }])
      }
    } catch (err) {
      console.log(err)
      setErrorMessage('Could not get a hint. Please try again.')
    }
  }

  const handleNextQuestion = async () => {
    setShowNextPrompt(false)
    setLoading(true)
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/session/next-question`, {
        session_id: sessionId
      })
      setMessages((prev) => [...prev, { type: 'question', text: res.data.current_question }])
    } catch (err) {
      console.log(err)
      setErrorMessage('Could not load the next question. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleContinueQuestions = async () => {
    setShowSummaryPrompt(false)
    setLoading(true)
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/session/next-question`, {
        session_id: sessionId,
        extend: true
      })
      setMessages((prev) => [...prev, { type: 'question', text: res.data.current_question }])
      setSessionInfo((prev) => ({ ...prev, total_questions: prev.total_questions + 1 }))
    } catch (err) {
      console.log(err)
      setErrorMessage('Could not load the next question. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGetSummary = async () => {
    setShowSummaryPrompt(false)
    setLoading(true)
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/session/end`, {
        session_id: sessionId
      })
      setSummaryData({ text: res.data.summary, score: res.data.final_score })
      setShowSummaryModal(true)
      setSessionEnded(true)
    } catch (err) {
      console.log(err)
      setErrorMessage('Could not load the next question. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipSummary = async () => {
    setShowSummaryPrompt(false)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sessions={sessions}
        onNewSession={() => navigate('/dashboard')}
        onSelectSession={(id) => navigate(`/interview/${id}`)}
        onSessionDeleted={(deletedId) => {
          setSessions((prev) => prev.filter((s) => s.session_id !== deletedId))
          if (deletedId === sessionId) navigate('/dashboard')
        }}
      />
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm"
          >
            <p className="text-sm">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'ml-0'}`}>
      <div className={`bg-white/80 backdrop-blur-xl border-b border-gray-100 py-4 flex items-center justify-between sticky top-0 z-10 transition-all ${isSidebarOpen ? 'px-6' : 'px-6 pl-16'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-sm hover:shadow-md transition"
            title="Back to Dashboard"
          >
            GAY
          </button>
          <div>
            <h1 className="font-bold text-gray-800">{sessionInfo?.role}</h1>
            <p className="text-xs text-gray-400">{sessionInfo?.topic}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto space-y-4">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.type === 'answer' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.type === 'question' && (
              <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-3 max-w-lg">
                <p className="text-gray-800">{msg.text}</p>
              </div>
            )}

            {msg.type === 'answer' && (
              <div className="bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-lg">
                <p>{msg.text}</p>
              </div>
            )}

            {msg.type === 'feedback' && (
              <div className="bg-white shadow-sm border border-gray-100 rounded-2xl px-5 py-3 max-w-lg flex gap-2">
                <Award className="text-yellow-500 shrink-0 mt-1" size={18} />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Score: {msg.score}/10</p>
                  <p className="text-sm text-gray-600 mt-1">{msg.text}</p>
                  {msg.modelAnswer && (
                    <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-purple-600 mb-1">💬 Here's how I'd put it:</p>
                      <p className="text-sm text-purple-800">{msg.modelAnswer}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {msg.type === 'hint' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-3 max-w-lg flex gap-2">
                <Lightbulb className="text-yellow-500 shrink-0 mt-1" size={18} />
                <p className="text-sm text-yellow-800">{msg.text}</p>
              </div>
            )}

            {msg.type === 'system' && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 max-w-lg">
                <p className="text-sm text-blue-700 italic">{msg.text}</p>
              </div>
            )}            
          </motion.div>
))}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-3 flex gap-1.5 items-center">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </motion.div>
        )}

        {showNextPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center gap-3 py-2">
            <button onClick={handleNextQuestion} className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-5 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition">
              Next Question →
            </button>
          </motion.div>
        )}

        {showSummaryPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-2">
            <p className="text-sm text-gray-500">All questions completed! 🎉</p>
            <div className="flex gap-3">
              <button onClick={handleContinueQuestions} className="bg-white border border-gray-200 text-gray-700 px-5 py-2 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition">
                Continue with more questions
              </button>
              <button onClick={handleGetSummary} className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-5 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition">
                Get Summary
              </button>
              <button onClick={handleSkipSummary} className="bg-gray-100 text-gray-600 px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition">
                Skip
              </button>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {!sessionEnded && (
      <div className="bg-white/80 backdrop-blur-xl border-t border-gray-100 px-4 py-4 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            onClick={handleGetHint}
            disabled={loading}
            className="bg-yellow-100 text-yellow-700 rounded-xl px-4 flex items-center justify-center hover:bg-yellow-200 transition disabled:opacity-50"
            title="Get a hint"
          >
            <Lightbulb size={20} />
          </button>
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmitAnswer()
              }
            }}
            placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '160px', height: '44px' }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none overflow-y-auto"
            disabled={loading}
          />
          <button
            onClick={handleSubmitAnswer}
            disabled={loading || !currentAnswer.trim()}
            className="bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-xl px-5 flex items-center justify-center shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
  )}

  {sessionEnded && (
        <div className="bg-white/80 backdrop-blur-xl border-t border-gray-100 px-4 py-4 sticky bottom-0 text-center flex justify-center gap-3">
          {summaryData && (
            <button
              onClick={() => setShowSummaryModal(true)}
              className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition"
            >
              View Summary
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
          >
            Start New Interview
          </button>
        </div>
      )}
      </div>

      {showSummaryModal && summaryData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-8 relative"
          >
            <button
              onClick={() => setShowSummaryModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-400 mb-1">Session Summary</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                {summaryData.score}/10
              </p>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {summaryData.text}
            </div>
            <button
              onClick={() => { setShowSummaryModal(false); navigate('/dashboard') }}
              className="w-full mt-6 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-xl py-3 font-medium shadow-md hover:shadow-lg transition"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Interview