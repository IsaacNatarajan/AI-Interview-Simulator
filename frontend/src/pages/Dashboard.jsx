import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

function Dashboard() {
  const navigate = useNavigate()
  const { token, userId } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sessions, setSessions] = useState([])

  const [role, setRole] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('Entry-level')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [jobDescription, setJobDescription] = useState('')
  const [totalQuestions, setTotalQuestions] = useState(5)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/user/${userId}/sessions`)
      setSessions(res.data.sessions)
    } catch (err) {
      console.log(err)
    }
  }

  const handleStartSession = async () => {
    if (!role.trim()) {
      alert('Please enter the role you are preparing for.')
      return
    }
    if (!totalQuestions || totalQuestions < 1) {
      alert('Please enter a valid number of questions.')
      return
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/session/start`, {
        user_id: userId,
        role,
        experience_level: experienceLevel,
        job_description: jobDescription || null,
        topic: topic || null,
        difficulty,
        total_questions: totalQuestions,
        max_hints: 2
      })
      navigate(`/interview/${res.data.session_id}`)
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 relative">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sessions={sessions}
        onNewSession={() => {}}
        onSelectSession={(id) => navigate(`/interview/${id}`)}
        onSessionDeleted={(deletedId) => setSessions((prev) => prev.filter((s) => s.session_id !== deletedId))}
      />

      <div className={`transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'ml-0 pl-16 md:pl-8'} px-4 md:px-8 py-6 md:py-10`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border border-white shadow-xl rounded-3xl p-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="text-pink-500" size={24} />
            <h1 className="text-2xl font-bold text-gray-800">Start a New Interview</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Role you're preparing for</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Registered Nurse, Software Engineer"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                <option>Entry-level</option>
                <option>Mid-level</option>
                <option>Senior</option>
                <option>Lead</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Topic <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Patient Safety, System Design — leave blank for general role questions"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Job Description (optional)</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here for more tailored questions..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Number of Questions</label>
                <input
  type="number"
  value={totalQuestions === 0 ? '' : totalQuestions}
  onChange={(e) => {
    const val = e.target.value
    if (val === '') {
      setTotalQuestions(0)
    } else {
      setTotalQuestions(Math.max(1, Math.min(20, Number(val))))
    }
  }}
  min={1}
  max={20}
  placeholder="5"
  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
/>
              </div>
            </div>

            <button
              onClick={handleStartSession}
              className="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-xl py-3 font-medium shadow-md hover:shadow-lg transition mt-4"
            >
              Start Interview
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard