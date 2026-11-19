import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  Edit2,
  Power,
  Search,
  AlertCircle,
  UserCheck,
} from 'lucide-react'
import { User, Role } from '@/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/auth'
import { dataService } from '@/services/dataService'

interface UserManagementSectionProps {
  onNotification?: (msg: string, type?: 'success' | 'error' | 'info') => void
}

interface UserFormData {
  name: string
  username: string
  email: string
  role: Role
  title: string
  is_active: boolean
}

const INITIAL_FORM: UserFormData = {
  name: '',
  username: '',
  email: '',
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
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load users from mock service
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
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (u: User) => {
    setEditingUserId(u.id)
    setFormData({
      name: u.name,
      username: u.username,
      email: u.email || '',
      role: u.role,
      title: u.title || '',
      is_active: u.is_active !== false,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const cleanName = formData.name.trim()
    const cleanUsername = formData.username.trim().toLowerCase()
    const cleanEmail = formData.email.trim().toLowerCase()

    if (!cleanName) {
      setFormError('يرجى إدخال اسم المستخدم بالكامل')
      return
    }

    if (!cleanUsername) {
      setFormError('يرجى إدخال اسم الدخول (Username)')
      return
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('صيغة البريد الإلكتروني غير صالحة (مثال: user@alamira.com)')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingUserId) {
        const updated = await dataService.updateUser(
          editingUserId,
          {
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail || undefined,
            role: formData.role,
            title: formData.title.trim(),
            is_active: formData.is_active,
          },
          currentUser
        )
        onNotification?.(`تم تحديث بيانات المستخدم (${updated.name}) بنجاح`, 'success')
        if (currentUser.id === updated.id) {
          switchUser(updated)
        }
      } else {
        const created = await dataService.createUser(
          {
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail || undefined,
            role: formData.role,
            title: formData.title.trim(),
            is_active: formData.is_active,
          },
          currentUser
        )
        onNotification?.(`تمت إضافة المستخدم (${created.name}) بنجاح`, 'success')
      }

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

  return (
    <div className="space-y-6">
      {/* 1. Development Simulation Disclaimer Banner */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-xs">
        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm text-amber-950">
            محاكاة تشغيلية لإدارة المستخدمين والأدوار (Development Simulation Only)
          </p>
          <p className="text-amber-800 leading-relaxed">
            تُستخدم هذه الشاشة لتجربة منظومة الصلاحيات وأدوار الموظفين محلياً (Role-Based Access Control).
            يمكنك إضافة وتعديل مستخدمين تجريبيين، تعطيل الحسابات، وتبديل هوية المستخدم الحالي لفحص استجابة النظام والحواجز الأمنية. التغييرات تحفظ في ذاكرة الجلسة المحلية (Mock Store) وليست مصادقة دخول أمنية إنتاجية.
          </p>
        </div>
      </div>

      {/* 2. Currently Selected Mock User Card */}
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
                  <span className="text-xs text-teal-300 font-mono" dir="ltr">
                    ({currentUser.email})
                  </span>
                )}
                {currentUser.is_active ? (
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
                <span className="text-[#0F766E] bg-emerald-950/80 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-400">
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

      {/* 3. Users Management Table & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Action Header & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#11243A] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F766E]" />
              <span>دليل مستخدمي النظام التجريبيين</span>
              <span className="text-xs text-slate-500 font-normal">
                ({filteredUsers.length} مستخدم)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة بيانات وحسابات الموظفين، تبديل الأدوار، وتفعيل أو تعطيل الصلاحيات
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
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 focus:outline-none focus:border-[#0F766E] transition-colors"
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
              <span>إضافة مستخدم تجريبي</span>
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
                  const isActive = user.is_active !== false

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCurrent ? 'bg-slate-50/90 font-medium' : ''
                      }`}
                    >
                      {/* Name & Username */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#11243A] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#11243A]">
                                {user.name}
                              </span>
                              {isCurrent && (
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
                                  <span className="text-[11px] text-teal-700 font-mono" dir="ltr">
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
                        {user.title || '—'}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {user.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#11243A] border border-slate-300">
                            <ShieldCheck className="w-3 h-3 text-[#0F766E]" />
                            مدير النظام (Admin)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            <Users className="w-3 h-3 text-teal-600" />
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
                          {/* Switch Account Button */}
                          {isMock && (
                            <button
                              type="button"
                              onClick={() => handleSwitchUser(user)}
                              disabled={isCurrent}
                              title={isCurrent ? 'هذا هو الحساب المختار حالياً' : `التبديل إلى حساب ${user.name}`}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                                  : 'bg-[#11243A] text-white hover:bg-[#0F766E]'
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
                            className="p-1 rounded-lg text-slate-600 hover:text-[#11243A] hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            title={isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            className={`p-1 rounded-lg transition-colors cursor-pointer border ${
                              isActive
                                ? 'text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200'
                                : 'text-emerald-600 hover:bg-emerald-50 border-transparent hover:border-emerald-200'
                            }`}
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

      {/* 4. Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUserId ? 'تعديل بيانات المستخدم التجريبي' : 'إضافة مستخدم تجريبي جديد'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-right">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
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
              placeholder="مثال: حسام فاروق"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E] transition-colors"
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
              dir="ltr"
              placeholder="مثال: hossam_sales"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left font-mono focus:outline-none focus:border-[#0F766E] transition-colors"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              اسم الدخول فريد، يُستخدم لتمييز وتوقيع سجلات العمليات في النظام.
            </p>
          </div>

          {/* Email (Administrative Identifier) */}
          <div>
            <label htmlFor="user-email" className="block text-xs font-bold text-slate-700 mb-1">
              البريد الإلكتروني (Email) <span className="text-slate-400 font-normal">(اختياري / معرّف حساب رقمي)</span>
            </label>
            <input
              id="user-email"
              type="email"
              dir="ltr"
              placeholder="مثال: user@alamira.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left font-mono focus:outline-none focus:border-[#0F766E] transition-colors"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              يُستخدم لتوثيق هوية المستخدم وتمهيد ربطه بمصادقة البريد الإلكتروني المشفرة مستقبلاً.
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الدور والصلاحيات (Role) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                  formData.role === 'ADMIN'
                    ? 'border-[#11243A] bg-slate-50 ring-1 ring-[#11243A]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#11243A] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                    مدير النظام (Admin)
                  </span>
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
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
                className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                  formData.role === 'SALES_OPERATOR'
                    ? 'border-[#0F766E] bg-teal-50/50 ring-1 ring-[#0F766E]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-teal-600" />
                    مسؤول مبيعات (Sales)
                  </span>
                  <input
                    type="radio"
                    name="role"
                    value="SALES_OPERATOR"
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
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E] transition-colors"
            />
          </div>

          {/* Active Status */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-[#0F766E] rounded border-slate-300 focus:ring-[#0F766E] cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">
                الحساب نشط وجاهز للتشغيل
              </span>
            </label>
            <p className="text-[10px] text-slate-500 mr-6">
              إذا تم إلغاء التفعيل، سيتم حظر المستخدم من تنفيذ أي عمليات بالنظام فوراً.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{editingUserId ? 'حفظ التعديلات' : 'إضافة المستخدم'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
