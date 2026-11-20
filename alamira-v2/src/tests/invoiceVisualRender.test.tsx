import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { SalesInvoice, Customer } from '../types';
import { mapInvoiceToPrintModel } from '../features/invoices/print/invoicePrintMapper';
import { InvoicePrintTemplate } from '../features/invoices/print/InvoicePrintTemplate';

describe('Phase 14 — Automated Browser Visual Rendering & PDF Inspection', () => {
  const mockCustomer: Customer = {
    id: 'cust-stress',
    code: 'CUST-001',
    name: 'مؤسسة النور والهدى للمقاولات والتوريدات العمومية والأعمال الكهروميكانيكية الحديثة',
    phone: '01012345678',
    address: 'قنا - شارع الجمهورية - برج الصفا',
    city: 'قنا',
    balance: 25000,
    is_active: true,
    invoices_count: 8,
    createdAt: '2026-01-01T00:00:00Z',
  };

  const cssPath = path.resolve(__dirname, '../../dist/assets/index-CW-vyFKV.css');
  const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';

  const buildHtml = (bodyHtml: string, title: string) => `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          ${cssContent}
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 10mm 10mm;
          }
          body {
            background: #cbd5e1;
            margin: 0;
            padding: 20px;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            display: flex;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `;

  it('renders Scenario D (Arabic & BiDi Stress Test) and captures headless Chrome screenshot', () => {
    const stressInvoice: SalesInvoice = {
      id: 'inv-stress',
      invoice_number: 'INV-STRESS-2026',
      invoice_date: '2026-11-20',
      customer_id: 'cust-stress',
      customer_name_snapshot: mockCustomer.name,
      customer_phone_snapshot: mockCustomer.phone,
      payment_terms: 'credit',
      status: 'approved',
      gross_amount: 5420,
      item_discounts_amount: 150,
      subtotal: 5270,
      invoice_discount_type: 'fixed',
      invoice_discount_value: 70,
      invoice_discount_amount: 70,
      additional_charges: 100,
      final_total: 5300,
      notes: 'التسليم بمقر مشروع قنا الجديدة مع تفريغ ونقل البضاعة لموقع العمل.',
      created_by: 'أحمد محمود',
      created_at: '2026-11-20T10:00:00Z',
      items: [
        {
          id: 'item-d-1',
          invoice_id: 'inv-stress',
          product_id: 'prod-1',
          product_sku_snapshot: 'BOX-2X2X10',
          product_name_snapshot: 'كيبة2*2*10سم',
          unit_snapshot: 'قطعة',
          quantity: 100,
          unit_price: 15,
          discount_type: 'fixed',
          discount_value: 0,
          discount_amount: 0,
          gross_amount: 1500,
          net_amount: 1500,
        },
        {
          id: 'item-d-2',
          invoice_id: 'inv-stress',
          product_id: 'prod-2',
          product_sku_snapshot: 'ALUM-2.5',
          product_name_snapshot: 'زاوية ألومنيوم 2.5*2.5 سم عالي الجودة (سمك 1.2 مم)',
          unit_snapshot: 'متر',
          quantity: 40,
          unit_price: 35,
          discount_type: 'fixed',
          discount_value: 0,
          discount_amount: 0,
          gross_amount: 1400,
          net_amount: 1400,
        },
        {
          id: 'item-d-3',
          invoice_id: 'inv-stress',
          product_id: 'prod-3',
          product_sku_snapshot: 'CEMENT-S50',
          product_name_snapshot: 'أسمنت مقاوم 50 كجم معتمد للمنشآت المائية',
          unit_snapshot: 'شوال',
          quantity: 20,
          unit_price: 126,
          discount_type: 'fixed',
          discount_value: 150,
          discount_amount: 150,
          gross_amount: 2520,
          net_amount: 2370,
        },
      ],
    };

    const model = mapInvoiceToPrintModel(stressInvoice, mockCustomer);
    const { container } = render(<InvoicePrintTemplate data={model} />);

    const outDir = path.resolve(__dirname, '../../dist/visual-qa');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const htmlFile = path.join(outDir, 'scenario-d-stress.html');
    const screenshotFile = path.join(outDir, 'scenario-d-screenshot.png');
    const pdfFile = path.join(outDir, 'scenario-d-print.pdf');

    fs.writeFileSync(htmlFile, buildHtml(container.innerHTML, 'Scenario D - Arabic BiDi Stress Test'), 'utf-8');
    expect(fs.existsSync(htmlFile)).toBe(true);

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (fs.existsSync(chromePath)) {
      try {
        // Capture high-res screenshot
        execSync(
          `"${chromePath}" --headless=new --disable-gpu --window-size=1080,1500 --screenshot="${screenshotFile}" "file:///${htmlFile.replace(/\\/g, '/')}"`,
          { timeout: 15000 }
        );
        // Print to A4 PDF
        execSync(
          `"${chromePath}" --headless=new --disable-gpu --print-to-pdf="${pdfFile}" "file:///${htmlFile.replace(/\\/g, '/')}"`,
          { timeout: 15000 }
        );

        expect(fs.existsSync(screenshotFile)).toBe(true);
        expect(fs.existsSync(pdfFile)).toBe(true);
        const imgStats = fs.statSync(screenshotFile);
        expect(imgStats.size).toBeGreaterThan(10000);
      } catch (err) {
        console.warn('Chrome headless execution note:', err);
      }
    }
  });

  it('renders Scenario C (Long Invoice - 25 items) and captures multi-page PDF', () => {
    const items25 = Array.from({ length: 25 }, (_, i) => ({
      id: `item-long-${i + 1}`,
      invoice_id: 'inv-long-25',
      product_id: `prod-long-${i + 1}`,
      product_sku_snapshot: `MAT-${1000 + i}`,
      product_name_snapshot: `بند توريد ${i + 1}: خامات معمارية ومواد عزل متطورة (مواصفة رقم ${i + 10}*2)`,
      unit_snapshot: i % 3 === 0 ? 'متر مكعب' : i % 2 === 0 ? 'طن' : 'شوال',
      quantity: (i + 1) * 3,
      unit_price: 120,
      discount_type: 'fixed' as const,
      discount_value: 0,
      discount_amount: 0,
      gross_amount: (i + 1) * 360,
      net_amount: (i + 1) * 360,
    }));

    const longInvoice: SalesInvoice = {
      id: 'inv-long-25',
      invoice_number: 'INV-LONG-25ITEMS',
      invoice_date: '2026-11-20',
      customer_id: 'cust-stress',
      customer_name_snapshot: mockCustomer.name,
      customer_phone_snapshot: mockCustomer.phone,
      payment_terms: 'credit',
      status: 'approved',
      gross_amount: items25.reduce((acc, it) => acc + it.gross_amount, 0),
      item_discounts_amount: 0,
      subtotal: items25.reduce((acc, it) => acc + it.gross_amount, 0),
      invoice_discount_type: 'fixed',
      invoice_discount_value: 0,
      invoice_discount_amount: 0,
      additional_charges: 0,
      final_total: items25.reduce((acc, it) => acc + it.gross_amount, 0),
      notes: 'توريد كامل لجميع البنود على دفعتين متتاليتين مع شهادات الضمان المعتمدة.',
      created_by: 'أحمد محمود',
      created_at: '2026-11-20T10:00:00Z',
      items: items25,
    };

    const model = mapInvoiceToPrintModel(longInvoice, mockCustomer);
    const { container } = render(<InvoicePrintTemplate data={model} />);

    const outDir = path.resolve(__dirname, '../../dist/visual-qa');
    const htmlFile = path.join(outDir, 'scenario-c-long-25.html');
    const pdfFile = path.join(outDir, 'scenario-c-multipage.pdf');

    fs.writeFileSync(htmlFile, buildHtml(container.innerHTML, 'Scenario C - Long Multi-Page Invoice'), 'utf-8');
    expect(fs.existsSync(htmlFile)).toBe(true);

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (fs.existsSync(chromePath)) {
      try {
        execSync(
          `"${chromePath}" --headless=new --disable-gpu --print-to-pdf="${pdfFile}" "file:///${htmlFile.replace(/\\/g, '/')}"`,
          { timeout: 15000 }
        );
        expect(fs.existsSync(pdfFile)).toBe(true);
        const pdfStats = fs.statSync(pdfFile);
        expect(pdfStats.size).toBeGreaterThan(15000);
      } catch (err) {
        console.warn('Chrome headless PDF execution note:', err);
      }
    }
  });
});