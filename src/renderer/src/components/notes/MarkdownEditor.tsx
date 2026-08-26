// src/renderer/src/components/notes/MarkdownEditor.tsx
import { useState, useRef } from 'react'
import { Bold, Italic, Link, CheckSquare, Eye, Edit3, Heading, AlertTriangle } from 'lucide-react'

// Simple helper to parse bold, italic, inline-code and wiki links in text block
interface MarkdownRendererProps {
  content: string
  onWikiLinkClick?: (title: string) => void
  onToggleCheckbox?: (lineIndex: number, checked: boolean) => void
}

export function MarkdownRenderer({ content, onWikiLinkClick, onToggleCheckbox }: MarkdownRendererProps) {
  const lines = content.split('\n')
  let inCodeBlock = false
  let codeBlockLines: string[] = []

  const renderedElements: React.ReactNode[] = []

  const parseInlineElements = (text: string, lineKey: string): React.ReactNode[] => {
    // 1. Parse custom [[Wiki Links]]
    const wikiRegex = /\[\[(.*?)\]\]/g
    const wikiMatches: string[] = []
    let wikiText = text
    let wikiIdx = 0
    wikiText = wikiText.replace(wikiRegex, (_, title) => {
      wikiMatches.push(title)
      return `___WIKILINK_MARKER_${wikiIdx++}___`
    })

    // 2. Parse inline code: `code`
    const codeRegex = /`(.*?)`/g
    const codeMatches: string[] = []
    let codeText = wikiText
    let codeIdx = 0
    codeText = codeText.replace(codeRegex, (_, code) => {
      codeMatches.push(code)
      return `___INLINECODE_MARKER_${codeIdx++}___`
    })

    // 3. Parse bold: **bold**
    const boldRegex = /\*\*(.*?)\*\*/g
    const boldMatches: string[] = []
    let boldText = codeText
    let boldIdx = 0
    boldText = boldText.replace(boldRegex, (_, b) => {
      boldMatches.push(b)
      return `___BOLD_MARKER_${boldIdx++}___`
    })

    // 4. Parse italic: *italic*
    const italicRegex = /\*(.*?)\*/g
    const italicMatches: string[] = []
    let italicText = boldText
    let italicIdx = 0
    italicText = italicText.replace(italicRegex, (_, i) => {
      italicMatches.push(i)
      return `___ITALIC_MARKER_${italicIdx++}___`
    })

    // 5. Parse links: [Text](Url)
    const linkRegex = /\[(.*?)\]\((.*?)\)/g
    const linkMatches: { txt: string; url: string }[] = []
    let linkText = italicText
    let linkIdx = 0
    linkText = linkText.replace(linkRegex, (_, txt, url) => {
      linkMatches.push({ txt, url })
      return `___LINK_MARKER_${linkIdx++}___`
    })

    const tokenRegex = /(___WIKILINK_MARKER_\d+___|___INLINECODE_MARKER_\d+___|___BOLD_MARKER_\d+___|___ITALIC_MARKER_\d+___|___LINK_MARKER_\d+___)/g
    const parts = linkText.split(tokenRegex)

    return parts.map((part, index) => {
      if (part.startsWith('___WIKILINK_MARKER_')) {
        const idx = parseInt(part.replace('___WIKILINK_MARKER_', '').replace('___', ''), 10)
        const title = wikiMatches[idx]
        return (
          <span
            key={`${lineKey}-wiki-${index}`}
            onClick={(e) => {
              e.stopPropagation()
              onWikiLinkClick?.(title)
            }}
            className="cursor-pointer font-semibold text-indigo-400 hover:text-indigo-300 hover:underline inline-block px-1.5 py-0.5 border border-indigo-500/25 rounded bg-indigo-500/10 mx-0.5 text-xs transition duration-150"
          >
            [[{title}]]
          </span>
        )
      }
      if (part.startsWith('___INLINECODE_MARKER_')) {
        const idx = parseInt(part.replace('___INLINECODE_MARKER_', '').replace('___', ''), 10)
        return (
          <code key={`${lineKey}-code-${index}`} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/50 font-mono text-xs text-amber-400">
            {codeMatches[idx]}
          </code>
        )
      }
      if (part.startsWith('___BOLD_MARKER_')) {
        const idx = parseInt(part.replace('___BOLD_MARKER_', '').replace('___', ''), 10)
        return <strong key={`${lineKey}-bold-${index}`} className="font-bold text-slate-100">{boldMatches[idx]}</strong>
      }
      if (part.startsWith('___ITALIC_MARKER_')) {
        const idx = parseInt(part.replace('___ITALIC_MARKER_', '').replace('___', ''), 10)
        return <em key={`${lineKey}-italic-${index}`} className="italic text-slate-200">{italicMatches[idx]}</em>
      }
      if (part.startsWith('___LINK_MARKER_')) {
        const idx = parseInt(part.replace('___LINK_MARKER_', '').replace('___', ''), 10)
        const l = linkMatches[idx]
        return (
          <span
            key={`${lineKey}-link-${index}`}
            onClick={(e) => {
              e.stopPropagation()
              window.open(l.url, '_blank')
            }}
            className="cursor-pointer text-indigo-400 hover:text-indigo-300 hover:underline transition font-medium"
          >
            {l.txt}
          </span>
        )
      }
      return part
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false
        const codeText = codeBlockLines.join('\n')
        renderedElements.push(
          <pre key={`codeblock-${i}`} className="p-3.5 rounded-lg bg-black/55 font-mono text-xs overflow-auto border border-slate-800/80 text-orange-200 my-2.5">
            <code>{codeText}</code>
          </pre>
        )
        codeBlockLines = []
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    if (line.startsWith('# ')) {
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold text-slate-100 mt-4 mb-2 tracking-tight border-b border-slate-800 pb-1">
          {parseInlineElements(line.substring(2), `h1-${i}`)}
        </h1>
      )
      continue
    }
    if (line.startsWith('## ')) {
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-lg font-semibold text-slate-200 mt-3.5 mb-1.5 tracking-tight">
          {parseInlineElements(line.substring(3), `h2-${i}`)}
        </h2>
      )
      continue
    }
    if (line.startsWith('### ')) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-300 mt-3 mb-1">
          {parseInlineElements(line.substring(4), `h3-${i}`)}
        </h3>
      )
      continue
    }

    // Checkbox parsing
    const todoMatch = line.match(/^([-\*\+]\s+\[([ xX])\]\s+)(.*)/)
    if (todoMatch) {
      const isChecked = todoMatch[2].toLowerCase() === 'x'
      const checkText = todoMatch[3]
      const lineIndex = i

      renderedElements.push(
        <div key={`todo-${i}`} className="flex items-start gap-2.5 py-1 pl-1 group">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onToggleCheckbox?.(lineIndex, e.target.checked)}
            className="w-4.5 h-4.5 mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500/40 cursor-pointer"
          />
          <span className={`text-sm select-text leading-relaxed ${isChecked ? 'line-through text-slate-500' : 'text-slate-350'}`}>
            {parseInlineElements(checkText, `todo-text-${i}`)}
          </span>
        </div>
      )
      continue
    }

    if (line.match(/^([-\*\+]\s+)(.*)/)) {
      const rest = line.replace(/^([-\*\+]\s+)/, '')
      renderedElements.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 py-0.5 text-sm text-slate-350">
          <li className="leading-relaxed">{parseInlineElements(rest, `li-${i}`)}</li>
        </ul>
      )
      continue
    }

    if (!line.trim()) {
      renderedElements.push(<div key={`empty-${i}`} className="h-2.5" />)
      continue
    }

    renderedElements.push(
      <p key={`p-${i}`} className="text-sm text-slate-350 leading-relaxed py-0.5 select-text">
        {parseInlineElements(line, `p-${i}`)}
      </p>
    )
  }

  return <div className="space-y-1 select-text">{renderedElements}</div>
}

interface MarkdownEditorProps {
  value: string
  onChange: (val: string) => void
  onWikiLinkClick?: (title: string) => void
  placeholder?: string
}

export function MarkdownEditor({ value, onChange, onWikiLinkClick, placeholder }: MarkdownEditorProps) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Character thresholds (Hard cap of 100,000; Warning at 80,000)
  const charCount = value.length
  const isWarning = charCount >= 80000
  const isOverLimit = charCount >= 100000

  const handleInsertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const replacement = before + (selectedText || '') + after

    const newValue = value.substring(0, start) + replacement + value.substring(end)
    if (newValue.length > 100000) return // Over limit prevention

    onChange(newValue)

    // Reset cursor
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Keyboard shortcuts inside Editor:
    // Ctrl+B -> Bold
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      handleInsertText('**', '**')
    }
    // Ctrl+I -> Italic
    if (e.ctrlKey && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      handleInsertText('*', '*')
    }
    // Ctrl+K -> Insert Link (Wiki [[]] style if Shift is held, standard otherwise)
    if (e.ctrlKey && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      if (e.shiftKey) {
        handleInsertText('[[', ']]')
      } else {
        handleInsertText('[', '](https://)')
      }
    }
  }

  const handleToggleCheckboxInPreview = (lineIndex: number, checked: boolean) => {
    const lines = value.split('\n')
    const line = lines[lineIndex]
    
    // Replace checkbox regex e.g. - [ ] or - [x] to matches
    const newLine = line.replace(/^([-\*\+]\s+\[)(?:[ xX])(\]\s+.*)/, (_, start, end) => {
      return `${start}${checked ? 'x' : ' '}${end}`
    })

    lines[lineIndex] = newLine
    onChange(lines.join('\n'))
  }

  return (
    <div className="flex flex-col border border-slate-800 rounded-lg bg-slate-950 overflow-hidden h-full">
      {/* Header Tabs & Actions */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold cursor-pointer transition ${
              tab === 'edit'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold cursor-pointer transition ${
              tab === 'preview'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>

        {/* Toolbar Buttons (Only in Edit mode) */}
        {tab === 'edit' && (
          <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
            <button
              onClick={() => handleInsertText('### ')}
              className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              title="Heading 3 (###)"
            >
              <Heading className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleInsertText('**', '**')}
              className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleInsertText('*', '*')}
              className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleInsertText('[[', ']]')}
              className="p-1.5 rounded text-indigo-400 hover:bg-slate-800 hover:text-indigo-300 transition text-[10px] font-bold"
              title="Wiki Link (Ctrl+Shift+K)"
            >
              [[]]
            </button>
            <button
              onClick={() => handleInsertText('[', '](url)')}
              className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              title="Standard Link (Ctrl+K)"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleInsertText('- [ ] ')}
              className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              title="Task Checkbox"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Editor or Preview Pane */}
      <div className="flex-1 overflow-auto min-h-[180px] p-4 relative">
        {tab === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              if (e.target.value.length <= 100000) {
                onChange(e.target.value)
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Write markdown notes here... Use [[Wiki Links]] to link to other notes.'}
            className="w-full h-full min-h-[160px] bg-transparent text-slate-200 font-mono text-sm leading-relaxed outline-none resize-none placeholder-slate-600 focus:ring-0 select-text"
          />
        ) : (
          <div className="prose prose-invert max-w-none text-slate-350 select-text h-full">
            {value.trim() ? (
              <MarkdownRenderer
                content={value}
                onWikiLinkClick={onWikiLinkClick}
                onToggleCheckbox={handleToggleCheckboxInPreview}
              />
            ) : (
              <p className="text-sm italic text-slate-600">Nothing to preview...</p>
            )}
          </div>
        )}
      </div>

      {/* Foot Controls & Guardrails info */}
      <div className="border-t border-slate-800 bg-slate-900/40 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          {tab === 'edit' && (
            <span className="font-mono">
              Ctrl+B: Bold  •  Ctrl+I: Italic  •  Ctrl+K: Link  •  Ctrl+Shift+K: Wiki
            </span>
          )}
        </div>
        
        {/* Anti-Bloat Guardrail Status */}
        <div className="flex items-center gap-2">
          {isWarning && (
            <div className={`flex items-center gap-1 ${isOverLimit ? 'text-rose-500' : 'text-amber-500'} animate-pulse font-semibold`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isOverLimit ? 'Characters Cap Reached' : 'Large Note Warning'}</span>
            </div>
          )}
          <span className={`font-mono font-medium ${isOverLimit ? 'text-red-500 font-bold' : isWarning ? 'text-amber-500' : 'text-slate-400'}`}>
            {charCount.toLocaleString()} / 100,000 chars
          </span>
        </div>
      </div>
    </div>
  )
}
