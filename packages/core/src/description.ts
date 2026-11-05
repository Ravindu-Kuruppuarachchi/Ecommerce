/** Small, text-only Markdown subset. No HTML execution, embedded scripts or remote media. */
export type DescriptionBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph' | 'code'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
export function parseDescription(source: string): DescriptionBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: DescriptionBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const content: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) content.push(lines[i++]);
      i++; blocks.push({ kind: 'code', text: content.join('\n') }); continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] }); i++; continue; }
    if (line.includes('|') && i+1 < lines.length && cells(lines[i+1]).every(cell => /^:?-{3,}:?$/.test(cell))) {
      const headers = cells(line); const rows: string[][] = []; i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      blocks.push({ kind: 'table', headers, rows }); continue;
    }
    const item = /^(?:([-*])|\d+\.)\s+(.+)$/.exec(line);
    if (item) {
      const ordered = !item[1]; const items: string[] = [];
      while (i < lines.length) {
        const next = /^(?:([-*])|\d+\.)\s+(.+)$/.exec(lines[i]);
        if (!next || !next[1] !== ordered) break;
        items.push(next[2]); i++;
      }
      blocks.push({ kind: 'list', ordered, items }); continue;
    }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|[-*]\s|\d+\.\s)/.test(lines[i]) && !(lines[i].includes('|') && i+1 < lines.length && cells(lines[i+1]).every(cell=>/^:?-{3,}:?$/.test(cell)))) paragraph.push(lines[i++]);
    blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
  }
  return blocks;
}
