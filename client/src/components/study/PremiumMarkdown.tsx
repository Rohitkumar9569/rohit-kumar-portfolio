import type { ReactNode } from 'react';

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

const isHeading = (line: string) => /^#{1,4}\s+/.test(line);
const isListItem = (line: string) => /^(\s*[-*]\s+|\s*\d+\.\s+)/.test(line);
const isQuote = (line: string) => /^\s*>\s?/.test(line);
const isTableLine = (line: string) => /^\s*\|.+\|\s*$/.test(line);
const isTableSeparator = (line: string) =>
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

const splitTableLine = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const shouldStopParagraph = (line: string, nextLine = '') =>
  !line.trim() ||
  isHeading(line) ||
  isListItem(line) ||
  isQuote(line) ||
  (isTableLine(line) && isTableSeparator(nextLine));

const parseMarkdown = (content: string): MarkdownBlock[] => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isHeading(line)) {
      const marker = trimmed.match(/^#{1,4}/)?.[0] || '##';
      blocks.push({
        type: 'heading',
        level: Math.min(marker.length, 4),
        text: trimmed.replace(/^#{1,4}\s+/, ''),
      });
      index += 1;
      continue;
    }

    if (isTableLine(line) && isTableSeparator(lines[index + 1] || '')) {
      const headers = splitTableLine(line);
      index += 2;
      const rows: string[][] = [];

      while (index < lines.length && isTableLine(lines[index])) {
        rows.push(splitTableLine(lines[index]));
        index += 1;
      }

      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (isListItem(line)) {
      const items: string[] = [];
      while (index < lines.length && isListItem(lines[index])) {
        items.push(lines[index].replace(/^(\s*[-*]\s+|\s*\d+\.\s+)/, '').trim());
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (isQuote(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && isQuote(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, '').trim());
        index += 1;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && !shouldStopParagraph(lines[index], lines[index + 1] || '')) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
};

const renderInline = (text: string): ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${part}-${index}`} className="font-black text-slate-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${part}-${index}`} className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-bold text-blue-700 dark:bg-slate-800 dark:text-cyan-200">
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
};

const getQuoteTone = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes('common mistake')) return 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100';
  if (lower.includes('pyq')) return 'border-slate-300 bg-slate-100 text-slate-950 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-100';
  return 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100';
};

interface PremiumMarkdownProps {
  content: string;
}

const PremiumMarkdown = ({ content }: PremiumMarkdownProps) => {
  const blocks = parseMarkdown(content);

  return (
    <div className="study-premium-markdown space-y-5 text-slate-700 dark:text-slate-300">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const className = block.level <= 2
            ? 'pt-2 text-2xl font-black tracking-normal text-slate-950 dark:text-white'
            : 'pt-1 text-lg font-black tracking-normal text-slate-950 dark:text-white';
          const HeadingTag = (`h${Math.min(block.level, 4)}` as keyof JSX.IntrinsicElements);
          return <HeadingTag key={`${block.text}-${index}`} className={className}>{renderInline(block.text)}</HeadingTag>;
        }

        if (block.type === 'table') {
          return (
            <div key={`table-${index}`} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <table className="min-w-[560px] w-full border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    {block.headers.map((header) => (
                      <th key={header} className="px-4 py-3 font-black">{renderInline(header)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${row.join('-')}-${rowIndex}`} className="border-t border-slate-100 dark:border-slate-800">
                      {block.headers.map((header, cellIndex) => (
                        <td key={`${header}-${cellIndex}`} className="px-4 py-3 align-top leading-6 text-slate-700 dark:text-slate-300">
                          {renderInline(row[cellIndex] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={`list-${index}`} className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              {block.items.map((item) => (
                <li key={item} className="flex gap-3 leading-7">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600 dark:bg-cyan-300" aria-hidden="true" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'quote') {
          return (
            <aside key={`quote-${index}`} className={['rounded-2xl border-l-4 px-4 py-3 text-sm font-bold leading-7 shadow-sm', getQuoteTone(block.text)].join(' ')}>
              {renderInline(block.text)}
            </aside>
          );
        }

        return (
          <p key={`${block.text}-${index}`} className="text-base leading-8">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
};

export default PremiumMarkdown;
