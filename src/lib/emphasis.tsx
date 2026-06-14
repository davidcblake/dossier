import { Fragment, type ReactNode } from "react";

/**
 * Render the lightweight Markdown the synthesis prompt emits inside summaries
 * and recommended steps — **bold** for key dates/names, *italic* for asides.
 * We parse to React nodes (never dangerouslySetInnerHTML) so model output can
 * never inject markup. Anything that isn't a clean pair is left as plain text.
 */
const TOKEN = /\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g;

export function Emphasis({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-(--color-ink)">
          {m[1]}
        </strong>
      );
    } else {
      nodes.push(<em key={key++}>{m[2] ?? m[3]}</em>);
    }
    last = TOKEN.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));

  return <Fragment>{nodes}</Fragment>;
}
