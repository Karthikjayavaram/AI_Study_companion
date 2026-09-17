import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Pre-process content to remove any artifacts
  const cleanContent = React.useMemo(() => {
    if (!content) return '';
    return content
      // Clean up escaped markdown
      .replace(/\\\*/g, '*')
      .replace(/\\_/g, '_')
      .replace(/\\`/g, '`')
      // Clean up rogue "svg" or "**svg" preceding words (e.g. svgSupporting -> Supporting)
      .replace(/\b(svg)([A-Z])/g, '$2')
      .replace(/\*\*(svg)([A-Z])/gi, '**$2')
      .trim();
  }, [content]);

  // Split content into blocks (code blocks vs text blocks)
  const blocks = React.useMemo(() => {
    const rawBlocks: Array<{ type: 'code' | 'text'; lang?: string; content: string }> = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
      if (match.index > lastIndex) {
        rawBlocks.push({
          type: 'text',
          content: cleanContent.slice(lastIndex, match.index),
        });
      }
      rawBlocks.push({
        type: 'code',
        lang: match[1] || 'plaintext',
        content: match[2].trimEnd(),
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < cleanContent.length) {
      rawBlocks.push({
        type: 'text',
        content: cleanContent.slice(lastIndex),
      });
    }

    return rawBlocks;
  }, [cleanContent]);

  return (
    <div className={`space-y-2 text-slate-200 leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.lang} code={block.content} />;
        }
        return <TextBlock key={idx} rawText={block.content} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TextBlock: React.FC<{ rawText: string }> = ({ rawText }) => {
  const lines = rawText.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 space-y-1 list-disc list-inside text-slate-200">
          {currentList.items.map((it, i) => (
            <li key={i} className="text-sm">
              <InlineText text={it} />
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`ol-${elements.length}`} className="my-2 space-y-1 list-decimal list-inside text-slate-200">
          {currentList.items.map((it, i) => (
            <li key={i} className="text-sm">
              <InlineText text={it} />
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      return;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList();
      elements.push(<hr key={index} className="my-3 border-slate-800" />);
      return;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={index} className="text-sm font-bold text-indigo-300 mt-2.5 mb-1 tracking-tight">
          <InlineText text={trimmed.slice(5)} />
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-base font-bold text-white mt-3 mb-1 tracking-tight">
          <InlineText text={trimmed.slice(4)} />
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={index} className="text-lg font-extrabold text-white mt-4 mb-1.5 tracking-tight border-b border-slate-800/80 pb-1">
          <InlineText text={trimmed.slice(3)} />
        </h2>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={index} className="text-xl font-extrabold text-white mt-4 mb-2 tracking-tight">
          <InlineText text={trimmed.slice(2)} />
        </h1>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={index} className="border-l-2 border-indigo-500/80 bg-indigo-950/20 px-3 py-1.5 my-2 text-xs italic text-indigo-200 rounded-r-lg">
          <InlineText text={trimmed.slice(2)} />
        </blockquote>
      );
      return;
    }

    // Bullet list items
    const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    // Numbered list items
    const numberMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numberMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberMatch[1]);
      return;
    }

    // Standard paragraph line
    flushList();
    elements.push(
      <p key={index} className="text-sm leading-relaxed my-1.5 text-slate-200">
        <InlineText text={line} />
      </p>
    );
  });

  flushList();

  return <>{elements}</>;
};

// Formats inline elements: **bold**, *italic*, `code`
const InlineText: React.FC<{ text: string }> = ({ text }) => {
  // Tokenize text into inline parts
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|`.*?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800/80 text-indigo-300 font-mono text-xs border border-slate-700/60">
          {token.slice(1, -1)}
        </code>
      );
    } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      parts.push(
        <em key={match.index} className="italic text-slate-200">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      parts.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
};
