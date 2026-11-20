import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  Edit2,
  Power,
  Search,
  AlertCircle,
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  Loader2,
} from 'lucide-react'
import { User, Role } from '@/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/auth'
import { dataService } from '@/services/dataService'
import { isPrimaryAdmin } from '@/auth/rbac'
import { cn } from '@/lib/utils'

interface UserManagementSectionProps {
  onNotification?: (msg: string, type?: 'success' | 'error' | 'info') => void
}

interface UserFormData {
  name: string
  username: string
  email: string
  phone?: string
  password?: string
  confirmPassword?: string
  role: Role
  title: string
  is_active: boolean
}

const INITIAL_FORM: UserFormData = {
  name: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'SALES_OPERATOR',
  title: '',
  is_active: true,
}

export const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  onNotification,
}) => {
  const { currentUser, switchUser, refreshUsers, isMock } = useAuth()
  const [usersList, setUsersList] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState<UserFormData>(INITIAL_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load users from service
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await dataService.getUsers()
      setUsersList(data)
    } catch {
      onNotification?.('فشل تحميل قائمة المستخدمين', 'error')
    } finally {
      setLoading(false)
    }
  }, [onNotification])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleOpenAddModal = () => {
    setEditingUserId(null)
    setFormData(INITIAL_FORM)
    setShowPassword(false)
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (u: User) => {
    setEditingUserId(u.id)
    setFormData({
      name: u.name,
      username: u.username,
      email: u.email || '',
      phone: u.phone || '',
      password: '',
      confirmPassword: '',
      role: u.role,
      title: u.title || '',
      is_active: u.is_active !== false,
    })
    setShowPassword(false)
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const cleanName = formData.name.trim()
    const cleanUsername = formData.username.trim().toLowerCase()
    const cleanEmail = formData.email.trim().toLowerCase()
    const cleanPhone = formData.phone?.trim() || ''

    if (!cleanName) {
      setFormError('يرجى إدخال اسم المستخدم بالكامل')
      return
    }

    if (!cleanUsername) {
      setFormError('يرجى إدخال اسم الدخول (Username)')
      return
    }

    if (!cleanEmail) {
      setFormError('يرجى إدخال البريد الإلكتروني للمستخدم')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('صيغة البريد الإلكتروني غير صالحة (مثال: user@alamira.com)')
      return
    }

    // Creating new user requires explicit administrator-supplied password with strong policy
    if (!editingUserId) {
      const cleanPassword = formData.password?.trim() || ''
      const cleanConfirm = formData.confirmPassword?.trim() || ''

      if (!cleanPassword) {
        setFormError('يرجى إدخال كلمة المرور الأولية لحساب مسؤول المبيعات')
        return
      }

      if (cleanPassword.length < 8) {
        setFormError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل')
        return
      }

      const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(cleanPassword)
      const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(cleanPassword)
      if (!hasLetter || !hasNumberOrSymbol) {
        setFormError('يجب أن تحتوي كلمة المرور على أحرف وأرقام أو رموز لضمان أمان الحساب')
        return
      }

      if (cleanPassword !== cleanConfirm) {
        setFormError('كلمتا المرور غير متطابقتين، يرجى إعادة التأكيد بدقة')
        return
      }
    }

    // Primary admin protection
    if (editingUserId && isPrimaryAdmin(editingUserId)) {
      if (formData.is_active === false) {
        setFormError('لا يمكن تعطيل أو حذف حساب المدير الأساسي.')
        return
      }
      if (formData.role !== 'ADMIN') {
        setFormError('لا يمكن تعديل صلاحيات أو خفض دور حساب المدير الأساسي.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (editingUserId) {
        const isTargetPrimary = isPrimaryAdmin(editingUserId)
        const updated = await dataService.updateUser(
          editingUserId,
          {
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail || undefined,
            role: isTargetPrimary ? 'ADMIN' : formData.role,
            title: formData.title.trim(),
            is_active: isTargetPrimary ? true : formData.is_active,
          },
          currentUser
        )
        onNotification?.(`تم تحديث بيانات المستخدم (${updated.name}) بنجاح`, 'success')
        if (currentUser.id === updated.id) {
          switchUser(updated)
        }
      } else {
        // Direct administrator-created sales operator account via trusted server-side Edge Function
        const created = await dataService.createSalesOperator(
          {
            full_name: cleanName,
            email: cleanEmail,
            password: formData.password?.trim(),
            username: cleanUsername,
            phone: cleanPhone || undefined,
          },
          currentUser
        )
        onNotification?.(`تم إنشاء وتفعيل حساب مسؤول المبيعات (${created.name}) بنجاح بكلمة المرور المحددة`, 'success')
      }

      // Clear password fields immediately from state upon success
      setFormData(INITIAL_FORM)
      setIsModalOpen(false)
      await loadUsers()
      await refreshUsers()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'فشل حفظ بيانات المستخدم')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (targetUser: User) => {
    if (isPrimaryAdmin(targetUser.id)) {
      onNotification?.('لا يمكن تعطيل أو حذف حساب المدير الأساسي.', 'error')
      return
    }

    try {
      const updated = await dataService.toggleUserActive(targetUser.id, currentUser)
      onNotification?.(
        updated.is_active
          ? `تم تفعيل حساب المستخدم (${updated.name}) بنجاح`
          : `تم تعطيل حساب المستخدم (${updated.name}) بنجاح`,
        updated.is_active ? 'success' : 'info'
      )
      await loadUsers()
      await refreshUsers()
      if (currentUser.id === updated.id) {
        switchUser(updated)
      }
    } catch (err: unknown) {
      onNotification?.(
        err instanceof Error ? err.message : 'فشل تغيير حالة المستخدم',
        'error'
      )
    }
  }

  const handleSwitchUser = (targetUser: User) => {
    switchUser(targetUser)
    onNotification?.(
      `تم تبديل المستخدم الحالي إلى: ${targetUser.name} (${targetUser.role === 'ADMIN' ? 'مدير النظام' : 'مسؤول مبيعات'})`,
      'info'
    )
  }

  const filteredUsers = usersList.filter((u) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.title && u.title.toLowerCase().includes(q))
    )
  })

  const isEditingPrimaryAdmin = Boolean(editingUserId && isPrimaryAdmin(editingUserId))

  return (
    <div className="space-y-6">
      {/* 1. Currently Selected User Card */}
      <div className="bg-[#11243A] text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-lg border border-white/20 shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-extrabold text-white">
                  {currentUser.name}
                </span>
                <span className="text-xs text-slate-300 font-mono" dir="ltr">
                  @{currentUser.username}
                </span>
                {currentUser.email && (
                  <span className="text-xs text-slate-300 font-mono" dir="ltr">
                    ({currentUser.email})
                  </span>
                )}
                {isPrimaryAdmin(currentUser.id) ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    المدير الأساسي (محمي)
                  </span>
                ) : currentUser.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    حساب نشط
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <XCircle className="w-3 h-3" />
                    حساب معطل
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                <span>{currentUser.title || (currentUser.role === 'ADMIN' ? 'مدير النظام' : 'مسؤول مبيعات')}</span>
                <span>•</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] font-bold text-slate-200">
                  {currentUser.role === 'ADMIN' ? 'صلاحيات كاملة (Admin)' : 'صلاحيات مبيعات مقيدة (Sales Operator)'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right sm:text-left text-xs text-slate-300/80 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700">
            <p className="font-semibold text-slate-200">المستخدم الحالي في جلسة العمل</p>
            <p className="text-[11px] text-slate-400">
              جميع العمليات وتواقيع الحركات تُسجل باسم وهوية هذا الحساب
            </p>
          </div>
        </div>
      </div>

      {/* 2. Users Management Table & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Action Header & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#11243A] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#11243A]" />
              <span>سجل المستخدمين المصرح لهم</span>
              <span className="text-xs text-slate-500 font-normal">
                ({filteredUsers.length} مستخدم)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة بيانات وحسابات الموظفين، إضافة مسؤولي المبيعات، ومتابعة الصلاحيات وحالة الحسابات
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث بالاسم أو اسم الدخول..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 focus:outline-none focus:border-[#11243A] transition-colors"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة مسؤول مبيعات</span>
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] text-slate-600 border-b border-slate-200/80 font-bold">
              <tr>
                <th className="py-3 px-4">المستخدم</th>
                <th className="py-3 px-4">المسمى الوظيفي</th>
                <th className="py-3 px-4">الدور والصلاحية</th>
                <th className="py-3 px-4">حالة الحساب</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    جاري تحميل المستخدمين...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    لا يوجد مستخدمون مطابقون لمعايير البحث
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = currentUser.id === user.id
                  const isPrimary = isPrimaryAdmin(user.id)
                  const isActive = user.is_active !== false

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        isCurrent && 'bg-slate-50/90 font-medium'
                      )}
                    >
                      {/* Name & Username */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#11243A] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[#11243A]">
                                {user.name}
                              </span>
                              {isPrimary && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
                                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                                  المدير الأساسي
                                </span>
                              )}
                              {isCurrent && !isPrimary && (
                                <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-bold">
                                  الحالي
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
                                @{user.username}
                              </span>
                              {user.email && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[11px] text-slate-600 font-mono" dir="ltr">
                                    {user.email}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 text-slate-700">
                        {user.title || (user.role === 'ADMIN' ? 'مدير عام' : 'مسؤول مبيعات')}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {isPrimary ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-950 border border-amber-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                            المدير الأساسي (محمي)
                          </span>
                        ) : user.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#11243A] border border-slate-300">
                            <ShieldCheck className="w-3 h-3 text-[#11243A]" />
                            مدير النظام (Admin)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <Users className="w-3 h-3 text-slate-600" />
                            مسؤول مبيعات (Sales)
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
                            <XCircle className="w-3 h-3" />
                            معطل
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Switch Account Button (Only in Mock mode for testing) */}
                          {isMock && (
                            <button
                              type="button"
                              onClick={() => handleSwitchUser(user)}
                              disabled={isCurrent}
                              title={isCurrent ? 'هذا هو الحساب المختار حالياً' : `التبديل إلى حساب ${user.name}`}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                                  : 'bg-[#11243A] text-white hover:bg-slate-800'
                              }`}
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span>{isCurrent ? 'مفعل حالياً' : 'تبديل إليه'}</span>
                            </button>
                          )}

                          {/* Edit User Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            title="تعديل بيانات المستخدم والدور"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#11243A] hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            disabled={isPrimary}
                            onClick={() => handleToggleActive(user)}
                            title={
                              isPrimary
                                ? 'لا يمكن تعطيل أو حذف حساب المدير الأساسي.'
                                : isActive
                                  ? 'تعطيل الحساب'
                                  : 'تفعيل الحساب'
                            }
                            className={cn(
                              'p-1.5 rounded-lg transition-colors border',
                              isPrimary
                                ? 'text-slate-300 border-transparent cursor-not-allowed opacity-40'
                                : isActive
                                  ? 'text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200 cursor-pointer'
                                  : 'text-emerald-600 hover:bg-emerald-50 border-transparent hover:border-emerald-200 cursor-pointer'
                            )}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setFormData(INITIAL_FORM)
        }}
        title={
          editingUserId
            ? isEditingPrimaryAdmin
              ? 'تعديل بيانات المدير الأساسي (محمي)'
              : 'تعديل بيانات المستخدم'
            : 'إضافة مسؤول مبيعات جديد'
        }
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-right">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {!editingUserId && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#11243A] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#11243A]">تنبيه إداري: إنشاء الحساب المباشر</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  يتم إنشاء هذا الحساب واعتماده إدارياً بكلمة مرور أولية محددة، دون التحقق المستقل من ملكية البريد الإلكتروني. يُرجى تسليم بيانات الدخول لمسؤول المبيعات بشكل آمن ومطالبته بتغييرها فور تسجيل الدخول الأول.
                </p>
              </div>
            </div>
          )}

          {isEditingPrimaryAdmin && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">حساب المدير الأساسي محمي بالكامل</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  لا يمكن خفض دور هذا الحساب عن (ADMIN) ولا يمكن تعطيله أو حذفه للحفاظ على استمرارية إدارة النظام.
                </p>
              </div>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="user-full-name" className="block text-xs font-bold text-slate-700 mb-1">
              اسم المستخدم بالكامل <span className="text-rose-500">*</span>
            </label>
            <input
              id="user-full-name"
              type="text"
              required
              disabled={isSubmitting}
              placeholder="مثال: حسام فاروق"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#11243A] transition-colors disabled:opacity-50"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="user-username" className="block text-xs font-bold text-slate-700 mb-1">
              اسم الدخول (Username) <span className="text-rose-500">*</span>
            </label>
            <input
              id="user-username"
              type="text"
              required
              disabled={isSubmitting}
              dir="ltr"
              placeholder="مثال: hossam_sales"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left font-mono focus:outline-none focus:border-[#11243A] transition-colors disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              اسم الدخول فريد، يُستخدم لتمييز وتوقيع سجلات العمليات في النظام.
            </p>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="user-email" className="block text-xs font-bold text-slate-700 mb-1">
              البريد الإلكتروني (Email) <span className="text-rose-500">*</span>
            </label>
            <input
              id="user-email"
              type="email"
              required
              disabled={isSubmitting}
              dir="ltr"
              placeholder="مثال: user@alamira.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left font-mono focus:outline-none focus:border-[#11243A] transition-colors disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              معرّف الحساب في نظام المصادقة Supabase.
            </p>
          </div>

          {/* Optional Phone Number */}
          <div>
            <label htmlFor="user-phone" className="block text-xs font-bold text-slate-700 mb-1">
              رقم الهاتف (اختياري)
            </label>
            <input
              id="user-phone"
              type="tel"
              disabled={isSubmitting}
              dir="ltr"
              placeholder="مثال: 01012345678"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left font-mono focus:outline-none focus:border-[#11243A] transition-colors disabled:opacity-50"
            />
          </div>

          {/* Password & Confirm Password (Required when creating a new sales operator) */}
          {!editingUserId && (
            <>
              <div>
                <label htmlFor="user-password" className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور الأولية (Initial Password) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    minLength={8}
                    dir="ltr"
                    placeholder="8 أحرف على الأقل تحتوي أحرفاً وأرقاماً..."
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left font-mono focus:outline-none focus:border-[#11243A] transition-colors pr-9 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  يتم اعتماد كلمة المرور هذه وتأكيد الحساب إدارياً في نظام المصادقة Supabase.
                </p>
              </div>

              <div>
                <label htmlFor="user-confirm-password" className="block text-xs font-bold text-slate-700 mb-1">
                  تأكيد كلمة المرور (Confirm Password) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="user-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  minLength={8}
                  dir="ltr"
                  placeholder="أعد إدخال كلمة المرور للتأكيد..."
                  value={formData.confirmPassword || ''}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left font-mono focus:outline-none focus:border-[#11243A] transition-colors disabled:opacity-50"
                />
              </div>
            </>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الدور والصلاحيات (Role) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={cn(
                  'p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all',
                  formData.role === 'ADMIN'
                    ? 'border-[#11243A] bg-slate-50 ring-1 ring-[#11243A]'
                    : 'border-slate-200 hover:bg-slate-50',
                  (isEditingPrimaryAdmin || !editingUserId) && 'opacity-60 cursor-not-allowed'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#11243A] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#11243A]" />
                    مدير النظام (Admin)
                  </span>
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    disabled={isEditingPrimaryAdmin || !editingUserId}
                    checked={formData.role === 'ADMIN'}
                    onChange={() => setFormData({ ...formData, role: 'ADMIN' })}
                    className="cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-slate-500">
                  صلاحيات كاملة وغير مقيدة: أسعار الشراء، المخازن، التقارير، وإدارة المستخدمين.
                </span>
              </label>

              <label
                className={cn(
                  'p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all',
                  formData.role === 'SALES_OPERATOR'
                    ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-800'
                    : 'border-slate-200 hover:bg-slate-50',
                  isEditingPrimaryAdmin && 'opacity-40 cursor-not-allowed'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-700" />
                    مسؤول مبيعات (Sales)
                  </span>
                  <input
                    type="radio"
                    name="role"
                    value="SALES_OPERATOR"
                    disabled={isEditingPrimaryAdmin}
                    checked={formData.role === 'SALES_OPERATOR'}
                    onChange={() => setFormData({ ...formData, role: 'SALES_OPERATOR' })}
                    className="cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-slate-500">
                  فواتير مبيعات وإضافة عملاء، مع حجب تكاليف الشراء وأرصدة المخزن والموردين.
                </span>
              </label>
            </div>
            {isEditingPrimaryAdmin && (
              <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 inline" />
                دور المدير الأساسي محمي ولا يمكن تغييره.
              </p>
            )}
            {!editingUserId && (
              <p className="text-[10px] text-slate-500 mt-1">
                يتم إنشاء الحسابات الجديدة وتوثيقها كمسؤولي مبيعات (Sales Operators) لربطها بهوية دخول جديدة.
              </p>
            )}
          </div>

          {/* Job Title */}
          <div>
            <label htmlFor="user-title" className="block text-xs font-bold text-slate-700 mb-1">
              المسمى الوظيفي
            </label>
            <input
              id="user-title"
              type="text"
              placeholder="مثال: مسؤول مبيعات قطاع الصعيد"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#11243A] transition-colors"
            />
          </div>

          {/* Active Status */}
          <div className="pt-1">
            <label
              className={cn(
                'flex items-center gap-2',
                isEditingPrimaryAdmin ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              )}
            >
              <input
                type="checkbox"
                disabled={isEditingPrimaryAdmin}
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-[#11243A] rounded border-slate-300 focus:ring-[#11243A] cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">
                الحساب نشط وجاهز للتشغيل
              </span>
            </label>
            {isEditingPrimaryAdmin ? (
              <p className="text-[10px] text-amber-700 mr-6">
                لا يمكن تعطيل حساب المدير الأساسي.
              </p>
            ) : (
              <p className="text-[10px] text-slate-500 mr-6">
                إذا تم إلغاء التفعيل، سيتم حظر المستخدم من تنفيذ أي عمليات بالنظام فوراً.
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsModalOpen(false)
                setFormData(INITIAL_FORM)
              }}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 min-w-[95px] justify-center"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              <span>{isSubmitting ? 'جاري المعالجة...' : editingUserId ? 'حفظ التعديلات' : 'إنشاء الحساب'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
