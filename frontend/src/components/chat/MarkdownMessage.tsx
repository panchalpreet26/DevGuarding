import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/chat/CodeBlock';

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="prose-chat text-sm leading-relaxed text-foreground/95">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h3 className="mb-2 mt-4 font-display text-base font-semibold first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-4 font-display text-base font-semibold first:mt-0">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h4>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const text = String(children).replace(/\n$/, '');
            const match = /language-(\w+)/.exec(className ?? '');
            const isBlock = Boolean(match) || text.includes('\n');

            if (isBlock) {
              return <CodeBlock language={match?.[1]} code={text} />;
            }

            return (
              <code
                className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[12px] text-primary"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
