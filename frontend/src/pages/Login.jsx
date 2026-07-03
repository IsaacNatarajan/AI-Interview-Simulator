import { GoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (credentialResponse) => {
    const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/google`, null, {
      params: { token: credentialResponse.credential }
    })
    login(res.data.access_token)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-72 h-72 bg-purple-200 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-100px] right-[-100px] w-72 h-72 bg-orange-200 rounded-full blur-3xl opacity-50" />
      <div className="absolute top-1/3 right-10 w-40 h-40 bg-pink-200 rounded-full blur-3xl opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/80 backdrop-blur-xl border border-white shadow-xl rounded-3xl p-10 max-w-md w-full text-center relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg"
        >
          AI
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">Interview Buddy</h1>
        <p className="text-gray-500 text-sm mb-8">Practice interviews and get instant, friendly feedback ✨</p>

        <div className="flex justify-center">
          <GoogleLogin onSuccess={handleLogin} onError={() => console.log('Login Failed')} theme="outline" size="large" shape="pill" />
        </div>
      </motion.div>
    </div>
  )
}

export default Login