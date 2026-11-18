import React, { useState } from 'react';
import { Building2, Sliders, Database, Info } from 'lucide-react';
import { CompanyProfileForm } from './CompanyProfileForm';
import { SystemPreferencesForm } from './SystemPreferencesForm';
import { BackupRestoreSection } from './BackupRestoreSection';
import { AboutSystemSection } from './AboutSystemSection';

export type SettingsTab = 'company' | 'preferences' | 'backup' | 'about';

interface SettingsViewProps {
  onNotification?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNotification }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'company', label: 'بيانات وهوية المنشأة', icon: <Building2 className="w-4 h-4" /> },
    { id: 'preferences', label: 'تفضيلات التشغيل', icon: <Sliders className="w-4 h-4" /> },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: <Database className="w-4 h-4" /> },
    { id: 'about', label: 'حول المنظومة V2', icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#11243A] text-white shadow-xs border border-[#11243A]'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
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
        {activeTab === 'about' && <AboutSystemSection />}
      </div>
    </div>
  );
};
