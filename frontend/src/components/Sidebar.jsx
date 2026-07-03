import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Menu, Plus, LogOut, Trash2, BarChart3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

function Sidebar({ isOpen, setIsOpen, sessions, onNewSession, onSelectSession, onSessionDeleted }) {
  const { logout } = useAuth()
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const handleDeleteClick = (e, sessionId) => {
    e.stopPropagation()
    setDeleteConfirmId(sessionId)
  }

  const confirmDelete = async (e, sessionId) => {
    e.stopPropagation()
    try {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/session/${sessionId}`)
      setDeleteConfirmId(null)
      if (onSessionDeleted) onSessionDeleted(sessionId)
    } catch (err) {
      console.log(err)
    }
  }

  const cancelDelete = (e) => {
    e.stopPropagation()
    setDeleteConfirmId(null)
  }

  return (
    <>
      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 bg-white shadow-md rounded-full p-2 hover:bg-gray-50 transition"
        >
          <Menu size={20} className="text-gray-700" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-black/30 z-30"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-72 bg-white/90 backdrop-blur-xl border-r border-gray-200 shadow-lg z-40 flex flex-col"
            >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Interview Buddy</h2>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <button
                onClick={onNewSession}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-xl py-2.5 font-medium shadow-md hover:shadow-lg transition"
              >
                <Plus size={18} /> New Interview
              </button>
              <button
                onClick={() => window.location.href = '/performance'}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-xl py-2.5 font-medium text-sm hover:bg-gray-50 transition"
              >
                <BarChart3 size={16} /> My Performance
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1">
              {sessions.map((s) => (
                <div key={s.session_id} className="relative group">
                  {deleteConfirmId === s.session_id ? (
                    <div className="w-full px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-700 mb-2">Delete this session?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => confirmDelete(e, s.session_id)}
                          className="flex-1 bg-red-500 text-white text-xs py-1.5 rounded-md hover:bg-red-600 transition"
                        >
                          Delete
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="flex-1 bg-gray-200 text-gray-700 text-xs py-1.5 rounded-md hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelectSession(s.session_id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 transition flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.role}</p>
                        <p className="text-xs text-gray-400 truncate">{s.topic}</p>
                      </div>
                      <span
                        onClick={(e) => handleDeleteClick(e, s.session_id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded-md transition shrink-0 ml-2"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 text-gray-500 hover:text-red-500 text-sm transition"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar