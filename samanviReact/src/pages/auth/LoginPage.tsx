import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Phone, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const [step, setStep] = useState<'phone' | 'login'>('phone')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSendOtp = async () => {
    if (!phone.trim()) { toast.error('Enter your phone number'); return }
    setLoading(true)
    try {
      const res = await authService.getOtp({ number: phone })
      if (res.status === 200) {
        toast.success('Phone verified! Enter your password.')
        setStep('login')
      } else {
        toast.error(res.message ?? 'Phone number not found')
      }
    } catch {
      toast.error('Server error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!password.trim()) { toast.error('Enter your password'); return }
    setLoading(true)
    try {
      const res = await authService.login({ phone, usr_pwd: password, rememberme: rememberMe })
      if (res) {
        toast.success(`Welcome back, ${res.user?.name}!`)
        navigate('/dashboard')
      }
    } catch {
      toast.error('Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#2563EB]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#7C3AED]/20 rounded-full blur-[120px]" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-[#14B8A6]/10 rounded-full blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md mx-4 relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-[28px] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/30 border border-white/10">
            <span className="font-black text-4xl text-white">S</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Samanvi Travels</h1>
          <p className="text-slate-400 mt-1 font-medium">Enterprise Operations Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-[0_32px_64px_rgb(0,0,0,0.4)]">
          <h2 className="text-white font-bold text-xl mb-1">
            {step === 'phone' ? 'Sign In' : 'Enter Password'}
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            {step === 'phone'
              ? 'Enter your registered mobile number to continue'
              : `Signing in as ${phone}`}
          </p>

          <div className="space-y-5">
            {/* Phone field - always visible */}
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={step === 'login'}
                onKeyDown={(e) => e.key === 'Enter' && step === 'phone' && handleSendOtp()}
                className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/60 focus:border-[#2563EB] transition-all text-sm font-medium disabled:opacity-50"
              />
            </div>

            <AnimatePresence>
              {step === 'login' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative overflow-hidden"
                >
                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      autoFocus
                      className="w-full h-12 pl-12 pr-12 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/60 focus:border-[#2563EB] transition-all text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {step === 'login' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded"
                />
                <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>
            )}

            <button
              onClick={step === 'phone' ? handleSendOtp : handleLogin}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {step === 'phone' ? 'Verify Phone' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {step === 'login' && (
              <button
                onClick={() => { setStep('phone'); setPassword('') }}
                className="w-full text-slate-400 hover:text-white text-sm transition-colors py-1"
              >
                ← Use different number
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2024 Samanvi Travels · Enterprise ERP
        </p>
      </motion.div>
    </div>
  )
}
