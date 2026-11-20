import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { AuthProvider } from '@/auth'
import { RootErrorBoundary } from '@/components/ui'

export const App: React.FC = () => {
  return (
    <RootErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </RootErrorBoundary>
  )
}

export default App
