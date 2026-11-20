import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShieldAlert, ArrowRight } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Permission } from './rbac'
import { Role } from '@/types'
import { auditLogger } from '@/services/auditLogger'

export interface RoleGuardProps {
  children: React.ReactNode
  requiredPermission?: Permission
  allowedRoles?: Role[]
  fallbackTitle?: string
  fallbackMessage?: string
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredPermission,
  allowedRoles,
  fallbackTitle = 'غير مصرح بالوصول إلى هذه الشاشة',
  fallbackMessage = 'عذراً، هذا القسم مخصص لمدير النظام فقط ولا يملك دورك الحالي صلاحية الوصول إليه.',
}) => {
  const { currentUser, hasPermission } = useAuth()
  const location = useLocation()

  let isAllowed = true

  if (requiredPermission && !hasPermission(requiredPermission)) {
    isAllowed = false
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    isAllowed = false
  }

  useEffect(() => {
    if (!isAllowed) {
      auditLogger.record({
        action: 'ACCESS_DENIED',
        entity_type: 'security_access',
        entity_id: location.pathname,
        entity_name_or_number: fallbackTitle,
        performed_by: currentUser.name,
        performed_by_id: currentUser.id,
        performed_by_role: currentUser.role,
        outcome: 'denied',
        reason: `محاولة وصول غير مصرحة إلى مسار محمي: ${location.pathname} (الصلاحية المطلوبة: ${requiredPermission || 'غير محدد'})`,
        details: {
          path: location.pathname,
          required_permission: requiredPermission,
          user_role: currentUser.role,
        },
      })
    }
  }, [isAllowed, location.pathname, fallbackTitle, currentUser.name, currentUser.id, currentUser.role, requiredPermission])

  if (!isAllowed) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-[#11243A]">{fallbackTitle}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{fallbackMessage}</p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>المستخدم الحالي:</span>
            <span className="font-bold text-[#11243A]">
              {currentUser.name} ({currentUser.role === 'ADMIN' ? 'مدير النظام' : 'مسؤول مبيعات'})
            </span>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#11243A] rounded-lg hover:bg-[#1E3A5F] transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى لوحة التحكم</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
