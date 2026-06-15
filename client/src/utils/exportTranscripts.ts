import type { TranscriptItem } from '../hooks/useTranslator';

export type ExportFormat = 'md' | 'txt' | 'json';

export const EXPORT_FORMATS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'md', label: 'Markdown (.md)' },
  { value: 'txt', label: 'Văn bản (.txt)' },
  { value: 'json', label: 'JSON (.json)' },
];

const code = (lang: string) => lang.split('-')[0].toUpperCase();

function buildMarkdown(title: string, items: TranscriptItem[]): string {
  let md = `# ${title} - SpeakLink\n`;
  md += `Xuất lúc: ${new Date().toLocaleString('vi-VN')}\n`;
  md += `Tổng số đoạn dịch: ${items.length}\n\n`;
  md += `=========================================================\n\n`;

  items.forEach((item, index) => {
    md += `### [Phần ${items.length - index}] - Lịch: ${item.timestamp}\n`;
    md += `🌐 Hướng dịch: ${item.sourceLang} ➡️ ${item.targetLang}\n\n`;
    md += `**Văn bản gốc (${code(item.sourceLang)}):**\n`;
    md += `${item.originalText}\n\n`;
    md += `**Bản dịch AI (${code(item.targetLang)}):**\n`;
    md += `${item.translatedText}\n\n`;
    md += `---\n\n`;
  });

  return md;
}

function buildText(title: string, items: TranscriptItem[]): string {
  let txt = `${title} - SpeakLink\n`;
  txt += `Xuất lúc: ${new Date().toLocaleString('vi-VN')}\n`;
  txt += `Tổng số đoạn dịch: ${items.length}\n\n`;

  items.forEach((item, index) => {
    txt += `[Phần ${items.length - index}] - ${item.timestamp} - ${item.sourceLang} -> ${item.targetLang}\n`;
    txt += `(${code(item.sourceLang)}) ${item.originalText}\n`;
    txt += `(${code(item.targetLang)}) ${item.translatedText}\n\n`;
  });

  return txt;
}

export function buildExport(
  title: string,
  items: TranscriptItem[],
  format: ExportFormat
): { content: string; mime: string; ext: string } {
  switch (format) {
    case 'txt':
      return { content: buildText(title, items), mime: 'text/plain;charset=utf-8;', ext: 'txt' };
    case 'json':
      return {
        content: JSON.stringify({ title, exportedAt: new Date().toISOString(), transcripts: items }, null, 2),
        mime: 'application/json;charset=utf-8;',
        ext: 'json',
      };
    case 'md':
    default:
      return { content: buildMarkdown(title, items), mime: 'text/markdown;charset=utf-8;', ext: 'md' };
  }
}

export function downloadExport(filenameBase: string, items: TranscriptItem[], format: ExportFormat): void {
  const { content, mime, ext } = buildExport(filenameBase, items, format);
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = filenameBase.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'SpeakLink';
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${safeName}_${dateStr}.${ext}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
