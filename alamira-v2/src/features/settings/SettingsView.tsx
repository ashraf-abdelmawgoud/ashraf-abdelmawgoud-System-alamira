import React, { useState } from 'react';
import { Building2, Sliders, Database, Users } from 'lucide-react';
import { CompanyProfileForm } from './CompanyProfileForm';
import { SystemPreferencesForm } from './SystemPreferencesForm';
import { BackupRestoreSection } from './BackupRestoreSection';
import { UserManagementSection } from './UserManagementSection';

export type SettingsTab = 'company' | 'preferences' | 'backup' | 'users';

interface SettingsViewProps {
  onNotification?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  defaultTab?: SettingsTab;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNotification,
  defaultTab = 'company',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  const tabs: { id: SettingsTab; label: string; icon: (isActive: boolean) => React.ReactNode }[] = [
    { id: 'company', label: 'بيانات وهوية المنشأة', icon: (active) => <Building2 className={`w-4 h-4 ${active ? 'text-white' : 'text-[#11243A]'}`} /> },
    { id: 'preferences', label: 'تفضيلات التشغيل', icon: (active) => <Sliders className={`w-4 h-4 ${active ? 'text-white' : 'text-[#64748B]'}`} /> },
    { id: 'backup', label: 'النسخ الاحتياطي واستخراج البيانات', icon: (active) => <Database className={`w-4 h-4 ${active ? 'text-white' : 'text-[#11243A]'}`} /> },
    { id: 'users', label: 'إدارة المستخدمين والصلاحيات', icon: (active) => <Users className={`w-4 h-4 ${active ? 'text-white' : 'text-[#11243A]'}`} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-[#D9E2EC]">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#11243A] text-white shadow-xs border border-[#11243A]'
                  : 'bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 border border-[#D9E2EC]'
              }`}
            >
              {tab.icon(isSelected)}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        {activeTab === 'company' && (
          <CompanyProfileForm
            onSaveNotification={(msg) => onNotification?.(msg, 'success')}
          />
        )}
        {activeTab === 'preferences' && (
          <SystemPreferencesForm
            onSaveNotification={(msg) => onNotification?.(msg, 'success')}
          />
        )}
        {activeTab === 'backup' && (
          <BackupRestoreSection
            onNotification={(msg, type) => onNotification?.(msg, type)}
          />
        )}
        {activeTab === 'users' && (
          <UserManagementSection
            onNotification={(msg, type) => onNotification?.(msg, type)}
          />
        )}
      </div>
    </div>
  );
};
