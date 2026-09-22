import { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Link2, Heading2, Quote, Eraser } from 'lucide-react';

export default function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const btn = (label: string, onClick: () => void, Icon: any) => (
    <button type="button" onClick={onClick} title={label} className="h-9 w-9 rounded-lg hover:bg-forest/10 flex items-center justify-center text-forest">
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="rounded-xl border-2 border-forest/15 bg-cream-soft overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-forest/10 bg-cream px-2 py-1">
        {btn('Bold', () => exec('bold'), Bold)}
        {btn('Italic', () => exec('italic'), Italic)}
        {btn('Heading', () => exec('formatBlock', 'H2'), Heading2)}
        {btn('Quote', () => exec('formatBlock', 'BLOCKQUOTE'), Quote)}
        {btn('Bullet list', () => exec('insertUnorderedList'), List)}
        {btn('Numbered list', () => exec('insertOrderedList'), ListOrdered)}
        {btn('Link', () => {
          const url = prompt('URL');
          if (url) exec('createLink', url);
        }, Link2)}
        {btn('Clear formatting', () => exec('removeFormat'), Eraser)}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder || ''}
        className="rte-content min-h-[140px] px-4 py-3 focus:outline-none text-ink empty:before:content-[attr(data-placeholder)] empty:before:text-ink-muted/60"
      />
    </div>
  );
}
