import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsView } from '../features/settings/SettingsView';
import { CompanyProfileForm } from '../features/settings/CompanyProfileForm';
import { SystemPreferencesForm } from '../features/settings/SystemPreferencesForm';
import { BackupRestoreSection } from '../features/settings/BackupRestoreSection';
import { OFFICIAL_COMPANY_PROFILE_DEFAULT, DEFAULT_PREFERENCES } from '../features/settings/types';

describe('Settings & Configuration Feature', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Company Profile Form', () => {
    it('renders official default company profile correctly', () => {
      render(<CompanyProfileForm />);

      expect(screen.getByDisplayValue(OFFICIAL_COMPANY_PROFILE_DEFAULT.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(OFFICIAL_COMPANY_PROFILE_DEFAULT.tax_id)).toBeInTheDocument();
      expect(screen.getByDisplayValue(OFFICIAL_COMPANY_PROFILE_DEFAULT.address)).toBeInTheDocument();
      expect(screen.getByDisplayValue(OFFICIAL_COMPANY_PROFILE_DEFAULT.phone)).toBeInTheDocument();
    });

    it('persists profile edits to localStorage on save', async () => {
      render(<CompanyProfileForm />);

      const phoneInput = screen.getByDisplayValue(OFFICIAL_COMPANY_PROFILE_DEFAULT.phone);
      fireEvent.change(phoneInput, { target: { value: '01099999999' } });

      const saveBtn = screen.getByRole('button', { name: /حفظ إعدادات الهوية/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/تم حفظ البيانات بنجاح/i)).toBeInTheDocument();
      });

      const stored = JSON.parse(localStorage.getItem('alamira_company_profile') || '{}');
      expect(stored.phone).toBe('01099999999');
      expect(stored.name).toBe(OFFICIAL_COMPANY_PROFILE_DEFAULT.name);
    });

    it('resets profile back to official defaults when requested', async () => {
      localStorage.setItem(
        'alamira_company_profile',
        JSON.stringify({ ...OFFICIAL_COMPANY_PROFILE_DEFAULT, name: 'شركة تجريبية' })
      );

      render(<CompanyProfileForm />);
      expect(screen.getByDisplayValue('شركة تجريبية')).toBeInTheDocument();

      const resetBtn = screen.getByRole('button', { name: /استعادة الهوية الرسمية/i });
      fireEvent.click(resetBtn);

      await waitFor(() => {
        expect(screen.getByDisplayValue(OFFICIAL_COMPANY_PROFILE_DEFAULT.name)).toBeInTheDocument();
      });
    });
  });

  describe('System Preferences Form', () => {
    it('loads and renders default preferences', () => {
      render(<SystemPreferencesForm />);

      expect(screen.getByDisplayValue(DEFAULT_PREFERENCES.currencySymbol)).toBeInTheDocument();
      expect(screen.getByDisplayValue(DEFAULT_PREFERENCES.lowStockThreshold.toString())).toBeInTheDocument();
      expect(screen.getByDisplayValue('سداد نقدي فوري (Cash)')).toBeInTheDocument();
    });

    it('updates and persists preferences in localStorage', async () => {
      render(<SystemPreferencesForm />);

      const thresholdInput = screen.getByDisplayValue(DEFAULT_PREFERENCES.lowStockThreshold.toString());
      fireEvent.change(thresholdInput, { target: { value: '10' } });

      const saveBtn = screen.getByRole('button', { name: /حفظ التفضيلات/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/تم حفظ التفضيلات بنجاح/i)).toBeInTheDocument();
      });

      const stored = JSON.parse(localStorage.getItem('alamira_system_preferences') || '{}');
      expect(stored.lowStockThreshold).toBe(10);
    });
  });

  describe('Backup & Snapshot Management', () => {
    it('displays both Excel and JSON export options with clean status card', () => {
      render(<BackupRestoreSection />);

      expect(screen.getByRole('button', { name: /تصدير نسخة إكسل \(Excel\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /استخراج نسخة محلية \(JSON\)/i })).toBeInTheDocument();
      expect(screen.getByText(/توقيت آخر نسخة احتياطية/i)).toBeInTheDocument();
    });

    it('generates a downloadable JSON backup snapshot with metadata', async () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:test-url');
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      const mockNotification = vi.fn();
      render(<BackupRestoreSection onNotification={mockNotification} />);

      const exportBtn = screen.getByRole('button', { name: /استخراج نسخة محلية/i });
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(mockNotification).toHaveBeenCalledWith(
          expect.stringContaining('تم استخراج وتنزيل النسخة الاحتياطية المحلية'),
          'success'
        );
      });

      expect(createObjectURLMock).toHaveBeenCalled();
      const lastBackup = localStorage.getItem('alamira_last_backup_time');
      expect(lastBackup).toBeTruthy();
    });

    it('allows inspecting and validating a backup file without modifying database', async () => {
      render(<BackupRestoreSection />);

      const validBackup = {
        metadata: {
          system: 'Al-Amira ERP V2',
          version: '2.0.0-mock',
          export_date: new Date().toISOString(),
        },
        data: {
          products: [{ id: 'PRD-001', name: 'سلك نحاس' }],
          customers: [{ id: 'CUST-001', name: 'شركة النور' }],
          suppliers: [{ id: 'SUP-001', name: 'السويدي للكابلات' }],
          sales_invoices: [{ id: 'INV-2025-001', total: 5000 }],
        },
      };

      const file = new File([JSON.stringify(validBackup)], 'backup.json', { type: 'application/json' });
      const fileInput = screen.getByLabelText(/اختر ملف JSON للفحص/i);

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/تم فحص الملف بنجاح/i)).toBeInTheDocument();
        expect(screen.getByText(/يتضمن 1 صنف، و1 فاتورة، و1 عميل/i)).toBeInTheDocument();
      });
    });

    it('detects invalid format when inspecting non-conforming JSON file', async () => {
      const mockNotification = vi.fn();
      render(<BackupRestoreSection onNotification={mockNotification} />);

      const invalidBackup = { randomField: 'invalid' };
      const file = new File([JSON.stringify(invalidBackup)], 'invalid.json', { type: 'application/json' });
      const fileInput = screen.getByLabelText(/اختر ملف JSON للفحص/i);

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockNotification).toHaveBeenCalledWith(
          expect.stringContaining('الملف المحدد لا يتطابق مع بنية النسخ الاحتياطي لمنظومة الأميرة'),
          'error'
        );
      });
    });
  });

  describe('Full Settings View Tabs', () => {
    it('switches between profile, preferences, and backup tabs', async () => {
      render(<SettingsView />);

      expect(screen.getByText(/بيانات وهوية المنشأة الرسمية/i)).toBeInTheDocument();

      // Switch to Preferences tab
      const prefsTab = screen.getByRole('button', { name: /تفضيلات التشغيل/i });
      fireEvent.click(prefsTab);
      expect(screen.getByText(/طريقة السداد الافتراضية للفواتير/i)).toBeInTheDocument();

      // Switch to Backup tab
      const backupTab = screen.getByRole('button', { name: /النسخ الاحتياطي/i });
      fireEvent.click(backupTab);
      expect(screen.getByText(/تصدير واستخراج بيانات النظام/i)).toBeInTheDocument();
    });
  });
});
