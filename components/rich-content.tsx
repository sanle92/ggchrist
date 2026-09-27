import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: "\u00a0",
  quot: '"',
};

function decodeHtmlEntities(value: string) {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi,
    (entity, code: string) => {
      if (code[0] !== "#") return namedEntities[code.toLowerCase()] || entity;
      const hexadecimal = code[1]?.toLowerCase() === "x";
      const point = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    },
  );
}

function scopeStyleSheet(css: string) {
  return css
    .replace(/@import[^;]+;/gi, "")
    .replace(/(^|})\s*([^@}{][^{]*)\{/g, (_match, boundary: string, selectorList: string) => {
      const selectors = selectorList
        .split(",")
        .map((selector) => {
          const value = selector.trim();
          if (/^(?:html|body|:root|html\s+body)$/i.test(value)) return "[data-rich-content]";
          return `[data-rich-content] ${value}`;
        })
        .join(", ");
      return `${boundary}\n${selectors} {`;
    });
}

function sanitizeTrustedEditorHtml(value: string) {
  return value
    .replace(/<(script|iframe|object|embed|form|base|link)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed|form|base|link)(?:\s[^>]*)?\/?\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, " $1=\"#\"");
}

function normalizeEditorContent(content: string | null | undefined) {
  let normalized = String(content || "").trim();

  // Accept ordinary HTML, entity-encoded HTML, and copied HTML containing
  // Markdown-style backslashes such as \<h2> and \</h2>.
  normalized = normalized.replace(/\\+(?=<\/?[a-z!])/gi, "");
  for (let pass = 0; pass < 2; pass += 1) {
    if (!/&(?:lt|gt|#x0*3c|#0*60|#x0*3e|#0*62|#x0*20|#0*32);/i.test(normalized)) break;
    normalized = decodeHtmlEntities(normalized);
  }

  const styles = Array.from(normalized.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .join("\n");
  normalized = normalized.replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, "");

  const body = normalized.match(/<body(?:\s[^>]*)?>([\s\S]*?)<\/body>/i);
  if (body) normalized = body[1];

  normalized = normalized
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<head(?:\s[^>]*)?>[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?html(?:\s[^>]*)?>/gi, "")
    .replace(/<\/?body(?:\s[^>]*)?>/gi, "")
    .trim();

  const html = sanitizeTrustedEditorHtml(normalized);
  return {
    html: styles ? `<style>${scopeStyleSheet(styles)}</style>${html}` : html,
    isHtml: /<\/?[a-z][\s\S]*?>/i.test(html),
  };
}

export function RichContent({ content }: { content: string | null | undefined }) {
  const normalized = normalizeEditorContent(content);
  if (normalized.isHtml) {
    return <div data-rich-content dangerouslySetInnerHTML={{ __html: normalized.html }} />;
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
      {normalized.html}
    </ReactMarkdown>
  );
}
