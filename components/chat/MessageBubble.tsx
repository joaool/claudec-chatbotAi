import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

// Converts CHECK "label" https://url  →  [label](https://url)
function processCheckLinks(text: string): string {
  return text.replace(
    /CHECK\s+"([^"]+)"\s+(https?:\/\/\S+)/g,
    '[$1]($2)'
  );
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-800 rounded-bl-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em:     ({ children }) => <em className="italic">{children}</em>,
                ul:     ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                ol:     ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                li:     ({ children }) => <li>{children}</li>,
                h1:     ({ children }) => <h1 className="text-base font-bold mb-1 mt-2">{children}</h1>,
                h2:     ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2">{children}</h2>,
                h3:     ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                code:   ({ children }) => <code className="bg-black/10 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                pre:    ({ children }) => <pre className="bg-black/10 rounded p-2 text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                a:      ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800">
                    {children}
                  </a>
                ),
              }}
            >
              {processCheckLinks(message.content)}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {message.sources.map((src, i) => (
              <span
                key={i}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100"
              >
                {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
