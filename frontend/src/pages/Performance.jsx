import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { motion } from 'framer-motion'
import { TrendingUp, Award, BookOpen } from 'lucide-react'

function Performance() {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sessions, setSessions] = useState([])
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
    fetchPerformance()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/user/${userId}/sessions`)
      setSessions(res.data.sessions)
    } catch (err) {
      console.log(err)
    }
  }

  const fetchPerformance = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/user/${userId}/performance`)
      setPerformance(res.data)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sessions={sessions}
        onNewSession={() => navigate('/dashboard')}
        onSelectSession={(id) => navigate(`/interview/${id}`)}
        onSessionDeleted={(deletedId) => setSessions((prev) => prev.filter((s) => s.session_id !== deletedId))}
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'ml-0 pl-16 md:pl-8'} px-4 md:px-8 py-6 md:py-10`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-sm hover:shadow-md transition shrink-0"
              title="Back to Dashboard"
            >
              GAY
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Your Performance</h1>
          </div>

          {loading && <p className="text-gray-400">Loading...</p>}

          {!loading && (!performance || performance.sessions_count === 0) && (
            <div className="bg-white/80 backdrop-blur-xl border border-white shadow-xl rounded-3xl p-8 text-center">
              <p className="text-gray-500">No completed interviews yet. Finish a session to see your stats here!</p>
            </div>
          )}

          {!loading && performance && performance.sessions_count > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-xl border border-white shadow-xl rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Award size={18} />
                    <p className="text-xs font-medium">Overall Average</p>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                    {performance.overall_average_score}/10
                  </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 backdrop-blur-xl border border-white shadow-xl rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <BookOpen size={18} />
                    <p className="text-xs font-medium">Sessions Completed</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{performance.sessions_count}</p>
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/80 backdrop-blur-xl border border-white shadow-xl rounded-2xl p-6">
                <div className="flex items-center gap-2 text-gray-700 mb-4">
                  <TrendingUp size={18} />
                  <p className="font-semibold">Topic Breakdown</p>
                </div>
                <div className="space-y-3">
                  {Object.entries(performance.topic_breakdown).map(([topic, data]) => (
                    <div key={topic} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{topic}</p>
                        <p className="text-xs text-gray-400">{data.sessions_count} session{data.sessions_count > 1 ? 's' : ''}</p>
                      </div>
                      <p className="text-lg font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                        {data.average_score.toFixed(1)}/10
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Performance