import React, { useState } from 'react'
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/auth'
import { AppLogo } from '@/components/ui'

export const LoginModal: React.FC = () => {
  const { login, authError, clearAuthError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setLocalError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setLocalError('يرجى إدخال البريد الإلكتروني')
      return
    }
    if (!password) {
      setLocalError('يرجى إدخال كلمة المرور')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await login(trimmedEmail, password)
      if (!res.success && res.error) {
        setLocalError(res.error)
      }
    } catch {
      setLocalError('تعذر الاتصال بخادم تسجيل الدخول. يرجى التحقق من الشبكة.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayedError = localError || authError

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto font-cairo"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right">
        {/* Header Banner */}
        <div className="bg-[#11243A] px-6 py-7 text-white text-center relative">
          <div className="mx-auto inline-flex items-center justify-center bg-white px-5 py-2.5 rounded-xl shadow-md border border-slate-200/80 mb-3.5">
            <AppLogo size="lg" className="h-9 sm:h-11 w-auto" />
          </div>
          <h1 className="text-xl font-bold">الأميرة للتوريدات والتجارة العامة</h1>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            تسجيل الدخول الموحد — منظومة إدارة المبيعات والمخازن V2
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {displayedError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{displayedError}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              البريد الإلكتروني المعتمد
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (displayedError) {
                    clearAuthError()
                    setLocalError(null)
                  }
                }}
                disabled={isSubmitting}
                dir="ltr"
                placeholder="name@company.com"
                className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#11243A] focus:border-transparent transition-all disabled:bg-slate-50"
                autoComplete="email"
                required
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (displayedError) {
                    clearAuthError()
                    setLocalError(null)
                  }
                }}
                disabled={isSubmitting}
                dir="ltr"
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#11243A] focus:border-transparent transition-all disabled:bg-slate-50"
                autoComplete="current-password"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#11243A] hover:bg-[#1E3A5F] text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ التحقق وتأكيد الجلسة...</span>
                </>
              ) : (
                <span>دخول النظام</span>
              )}
            </button>
          </div>

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-500">
              الدخول مقصور فقط على الحسابات المسجلة بقائمة المستخدمين المعتمدين (Authorized Users)
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
