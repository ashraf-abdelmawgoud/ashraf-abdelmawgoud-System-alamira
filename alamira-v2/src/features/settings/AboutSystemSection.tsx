import React from 'react';
import { Info, ShieldCheck, CheckCircle } from 'lucide-react';

export const AboutSystemSection: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[#D9E2EC]">
        <Info className="w-5 h-5 text-[#0F766E]" />
        <div>
          <h3 className="text-sm font-extrabold text-[#11243A]">
            حول منظومة الأميرة ERP V2 المطورة
          </h3>
          <p className="text-xs text-[#64748B]">
            الجيل الثاني من نظام إدارة المبيعات، المخازن، والعمليات التجارية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-white rounded-xl border border-[#D9E2EC] space-y-2">
          <span className="text-[11px] font-bold text-[#64748B] block">إصدار المنظومة الحالية</span>
          <strong className="text-sm text-[#11243A] font-bold block">
            Al-Amira ERP V2.0.0 (Modern React 19 + TypeScript)
          </strong>
          <p className="text-slate-600 leading-relaxed">
            تمت إعادة بناء الواجهات والمنطق المحاسبي وفق أحدث معايير هندسة البرمجيات لتوفير تجربة
            مستخدم فائقة السرعة، استجابة تامة للهواتف، وطباعة معيارية للمستندات.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#D9E2EC] space-y-2">
          <span className="text-[11px] font-bold text-[#64748B] block">حماية البيانات وسلامة النظام</span>
          <div className="flex items-center gap-1.5 text-[#0F766E] font-bold">
            <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
            <span>منظومة سحابية مشفرة ومؤمنة (Enterprise Security)</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            تخضع جميع العمليات لقواعد حماية صارمة على مستوى السجلات (RLS) ومسارات تدقيق غير قابلة للتعديل
            مع تشفير كامل لبيانات النظام.
          </p>
        </div>
      </div>

      <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#D9E2EC]">
        <h4 className="text-xs font-bold text-[#11243A] mb-2">المراحل المنجزة في الإصدار الثاني:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>المرحلة 1: التأسيس المعماري، الهوية الزمردية، ولوحة المؤشرات</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>المرحلة 2: إدارة الأصناف، العملاء، والموردين</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>المرحلة 3A: أذون الاستلام، الصرف، والتسويات الجردية</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>المرحلة 3B: منشئ فواتير المبيعات ودورة حياة الفاتورة</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>المرحلة 3C: طباعة الفواتير A4 وتصدير صور PNG عالية الدقة</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>المرحلة 4: التقارير المتكاملة، التحليلات، تصدير الإكسل، والإعدادات</span>
          </div>
        </div>
      </div>
    </div>
  );
};
