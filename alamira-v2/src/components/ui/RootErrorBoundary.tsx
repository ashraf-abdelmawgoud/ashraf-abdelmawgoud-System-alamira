import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, LogOut, ShieldCheck } from 'lucide-react'
import { AppLogo } from './AppLogo'

export interface RootErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
}

export interface RootErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[RootErrorBoundary] Uncaught application exception:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReload = (): void => {
    try {
      // Clear one-time reload flags to allow fresh execution
      sessionStorage.removeItem('alamira_stale_asset_reload')
    } catch {
      // ignore storage errors
    }
    window.location.reload()
  }

  handleSafeSignOutAndReset = (): void => {
    try {
      // Safely purge Supabase session tokens if corrupted
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          localStorage.removeItem(key)
        }
      }
      // Reset only application reload guards without wiping unrelated session storage
      sessionStorage.removeItem('alamira_stale_asset_reload')
    } catch (e) {
      console.warn('Storage purge error:', e)
    }
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'حدث خطأ تقني غير محدد في بيئة التشغيل'

      return (
        <div
          className="min-h-screen w-full flex items-center justify-center bg-[#F5F7FA] p-4 font-cairo text-[#11243A]"
          dir="rtl"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-right">
            {/* Header with Brand Identity */}
            <div className="bg-[#11243A] px-6 py-6 text-white text-center">
              <div className="mx-auto inline-flex items-center justify-center bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-200/80 mb-3">
                <AppLogo size="md" className="h-8 w-auto" />
              </div>
              <h1 className="text-lg font-bold">الأميرة للتوريدات والتجارة العامة</h1>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                منظومة إدارة المبيعات والمخازن V2
              </p>
            </div>

            {/* Error Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed space-y-1">
                  <div className="font-bold text-sm text-[#11243A]">
                    {this.props.fallbackTitle || 'حدث خطأ أثناء تشغيل الواجهة'}
                  </div>
                  <p className="text-slate-600">
                    {this.props.fallbackMessage ||
                      'تم عزل الخطأ بأمان لحماية بياناتك المحفوظة. يرجى الضغط على زر إعادة التحميل لمتابعة العمل.'}
                  </p>
                </div>
              </div>

              {/* Technical Message Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 overflow-x-auto text-left" dir="ltr">
                <span className="text-rose-600 font-bold">[Error]</span> {errorMessage}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#11243A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة تحميل المنظومة</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleSafeSignOutAndReset}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  title="إعادة تعيين الجلسة وإزالة الرموز المعطوبة بأمان"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>تسجيل خروج وإعادة الدخول</span>
                </button>
              </div>

              {/* Security & Data Integrity Assurance */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>بيانات الفواتير والمخزون محفوظة بأمان في قاعدة البيانات السحابية.</span>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
