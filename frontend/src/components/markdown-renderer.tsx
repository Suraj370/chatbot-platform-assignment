import Markdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <Markdown
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          return inline ? (
            <code
              className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          ) : (
            <code
              className={`${className} block p-3 rounded-lg text-sm overflow-x-auto`}
              {...props}
            >
              {children}
            </code>
          )
        },
        pre({ children, ...props }: any) {
          return (
            <pre
              className="bg-gray-900 rounded-lg overflow-hidden my-3"
              {...props}
            >
              {children}
            </pre>
          )
        },
        p({ children, ...props }: any) {
          return (
            <p className="mb-2 last:mb-0" {...props}>
              {children}
            </p>
          )
        },
        ul({ children, ...props }: any) {
          return (
            <ul className="list-disc list-inside mb-2 space-y-1" {...props}>
              {children}
            </ul>
          )
        },
        ol({ children, ...props }: any) {
          return (
            <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>
              {children}
            </ol>
          )
        },
        h1({ children, ...props }: any) {
          return (
            <h1 className="text-2xl font-bold mb-2 mt-4" {...props}>
              {children}
            </h1>
          )
        },
        h2({ children, ...props }: any) {
          return (
            <h2 className="text-xl font-bold mb-2 mt-3" {...props}>
              {children}
            </h2>
          )
        },
        h3({ children, ...props }: any) {
          return (
            <h3 className="text-lg font-bold mb-2 mt-2" {...props}>
              {children}
            </h3>
          )
        },
        blockquote({ children, ...props }: any) {
          return (
            <blockquote
              className="border-l-4 border-gray-300 pl-4 italic my-2"
              {...props}
            >
              {children}
            </blockquote>
          )
        },
        a({ children, ...props }: any) {
          return (
            <a
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          )
        },
      }}
    >
      {content}
    </Markdown>
  )
}
