import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { RootErrorBoundary } from './components/ui/RootErrorBoundary'

// Global safety net for unhandled startup errors outside the React tree
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Startup] Global unhandled promise rejection:', event.reason)
})

window.addEventListener('error', (event) => {
  console.error('[Startup] Global uncaught error:', event.error || event.message)
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('Fatal: Failed to locate #root DOM element.')
} else {
  try {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <React.StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </React.StrictMode>
    )

    // Clear stale-asset reload flag upon successful application mount
    try {
      sessionStorage.removeItem('alamira_stale_asset_reload')
    } catch {
      // ignore storage access errors
    }
  } catch (startupError) {
    console.error('Fatal: React initialization failed:', startupError)
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F5F7FA;font-family:sans-serif;direction:rtl;padding:20px;text-align:center;">
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:32px 24px;max-width:440px;width:100%;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);">
          <div style="width:48px;height:48px;border-radius:50%;background:#FEF2F2;color:#DC2626;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px;font-weight:bold;">!</div>
          <h2 style="font-size:18px;font-weight:bold;color:#11243A;margin:0 0 8px;">تعذر بدء تشغيل المنظومة</h2>
          <p style="font-size:13px;color:#64748B;line-height:1.6;margin:0 0 20px;">حدث خطأ غير متوقع أثناء تحميل ملفات التطبيق. يرجى الضغط على زر التحديث لإعادة التشغيل.</p>
          <button onclick="window.location.reload(true);" style="width:100%;background:#11243A;color:#fff;border:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">إعادة تحميل المنظومة</button>
        </div>
      </div>
    `
  }
}
