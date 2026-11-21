import React from 'react';

// Keep mixed Latin/dimension runs together when html2canvas measures RTL text.
// The visible characters are unchanged; the browser and print view use the same isolation.
const LTR_RUN = new RegExp(
  String.raw`[\p{Script=Latin}0-9٠-٩۰-۹]+(?:[ \t]*[*/×./-]?[ \t]*[\p{Script=Latin}0-9٠-٩۰-۹]+)*`,
  'gu'
);

interface InvoiceProductNameProps {
  name: string;
}

export const InvoiceProductName: React.FC<InvoiceProductNameProps> = ({ name }) => {
  const firstStrong = name.match(/[\p{Script=Arabic}\p{Script=Latin}]/u)?.[0];
  const baseDirection = firstStrong && /\p{Script=Latin}/u.test(firstStrong) ? 'ltr' : 'rtl';
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of name.matchAll(LTR_RUN)) {
    const start = match.index;
    if (start > cursor) parts.push(name.slice(cursor, start));
    parts.push(<bdi dir="ltr" key={start}>{match[0]}</bdi>);
    cursor = start + match[0].length;
  }

  if (cursor < name.length) parts.push(name.slice(cursor));
  return <bdi dir={baseDirection}>{parts}</bdi>;
};
