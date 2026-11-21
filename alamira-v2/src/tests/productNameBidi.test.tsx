import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { InvoiceProductName } from '../features/invoices/print/InvoiceProductName';

describe('invoice product name direction', () => {
  it.each([
    ['كيبة2*2*10سم', ['2*2*10']],
    ['زاوية ألومنيوم 2.5×2.5 سم', ['2.5×2.5']],
    ['مواسير PVC 20/25-أبيض', ['PVC 20/25']],
    ['كيبل A-12/3*5 متر', ['A-12/3*5']],
    ['منتج عربي فقط', []],
    ['PVC مواسير 20/25', ['PVC', '20/25']],
  ])('preserves %s while isolating LTR runs', (name, expectedRuns) => {
    const { container } = render(<InvoiceProductName name={name} />);
    expect(container.textContent).toBe(name);
    expect(Array.from(container.querySelectorAll('bdi > bdi[dir="ltr"]'), (node) => node.textContent))
      .toEqual(expectedRuns);
  });

  it('keeps the original first strong script as the name direction', () => {
    const latin = render(<InvoiceProductName name="PVC مواسير" />);
    expect(latin.container.querySelector('bdi')?.dir).toBe('ltr');
    const arabic = render(<InvoiceProductName name="مواسير PVC" />);
    expect(arabic.container.querySelector('bdi')?.dir).toBe('rtl');
  });
});
