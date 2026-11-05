import { parseDescription } from "@repo/core";
function Inline({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2,-2)}</strong> : part.startsWith('*') && part.endsWith('*') ? <em key={i}>{part.slice(1,-1)}</em> : part.startsWith('`') && part.endsWith('`') ? <code key={i} className="rounded bg-store-surface px-1">{part.slice(1,-1)}</code> : part)}</>;
}
export default function ProductDescription({ text }: { text: string }) {
  return <section aria-label="Product description" className="mt-14 border-t border-store-line pt-10">
    <h2 className="mb-6 font-heading text-2xl font-semibold">Product details</h2>
    <div className="space-y-5 leading-relaxed text-store-fg">
      {parseDescription(text).map((block, i) => {
        if (block.kind === 'heading') return block.level <= 2 ? <h3 key={i} className="pt-3 text-xl font-semibold"><Inline text={block.text}/></h3> : <h4 key={i} className="pt-2 text-lg font-semibold"><Inline text={block.text}/></h4>;
        if (block.kind === 'code') return <pre key={i} className="overflow-x-auto rounded-media bg-store-surface p-4 text-sm"><code>{block.text}</code></pre>;
        if (block.kind === 'list') { const Tag = block.ordered ? 'ol' : 'ul'; return <Tag key={i} className={`space-y-2 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>{block.items.map((item,j)=><li key={j}><Inline text={item}/></li>)}</Tag>; }
        if (block.kind === 'table') return <div key={i} className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead className="bg-store-surface"><tr>{block.headers.map((cell,j)=><th key={j} scope="col" className="border border-store-line p-3"><Inline text={cell}/></th>)}</tr></thead><tbody>{block.rows.map((row,j)=><tr key={j}>{block.headers.map((_,k)=><td key={k} className="border border-store-line p-3"><Inline text={row[k] ?? ''}/></td>)}</tr>)}</tbody></table></div>;
        return <p key={i} className="whitespace-pre-line"><Inline text={block.text}/></p>;
      })}
    </div>
  </section>;
}
