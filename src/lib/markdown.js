function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(text) {
  return text
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

function splitTableRow(line) {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed.split('|').map((cell) => cell.trim())
}

function isSeparatorRow(line) {
  const cells = splitTableRow(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{1,}:?$/.test(cell))
}

function alignFor(cell) {
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  if (left) return 'left'
  return null
}

function renderTextBlock(raw) {
  const lines = escapeHtml(raw).split('\n')
  const html = []
  const listStack = []

  const openTag = (type) => (type === 'ol' ? '<ol>' : '<ul>')
  const closeTag = (type) => (type === 'ol' ? '</ol>' : '</ul>')

  const closeLists = () => {
    while (listStack.length) {
      html.push('</li>')
      html.push(closeTag(listStack.pop().type))
    }
  }

  const pushListItem = (type, indent, itemText) => {
    if (!listStack.length) {
      listStack.push({ type, indent })
      html.push(openTag(type))
      html.push('<li>')
    } else {
      const top = listStack[listStack.length - 1]
      if (indent > top.indent) {
        listStack.push({ type, indent })
        html.push(openTag(type))
        html.push('<li>')
      } else if (indent === top.indent) {
        if (type !== top.type) {
          html.push('</li>')
          html.push(closeTag(listStack.pop().type))
          listStack.push({ type, indent })
          html.push(openTag(type))
          html.push('<li>')
        } else {
          html.push('</li>')
          html.push('<li>')
        }
      } else {
        while (listStack.length && listStack[listStack.length - 1].indent > indent) {
          html.push('</li>')
          html.push(closeTag(listStack.pop().type))
        }
        const newTop = listStack[listStack.length - 1]
        if (newTop && newTop.type === type && newTop.indent === indent) {
          html.push('</li>')
          html.push('<li>')
        } else {
          if (newTop) {
            html.push('</li>')
            html.push(closeTag(listStack.pop().type))
          }
          listStack.push({ type, indent })
          html.push(openTag(type))
          html.push('<li>')
        }
      }
    }

    const task = itemText.match(/^\[([ xX])\]\s+(.*)/)
    if (task) {
      const checked = task[1].toLowerCase() === 'x'
      html.push(
        `<label class="task-item"><input type="checkbox" disabled ${checked ? 'checked' : ''} />${inline(task[2])}</label>`
      )
    } else {
      html.push(inline(itemText))
    }
  }

  let inBlockquote = false
  const closeBlockquote = () => {
    if (inBlockquote) {
      html.push('</blockquote>')
      inBlockquote = false
    }
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const heading = line.match(/^(#{1,3})\s+(.*)/)
    const ordered = line.match(/^(\s*)\d+\.\s+(.*)/)
    const unordered = line.match(/^(\s*)[-*]\s+(.*)/)
    const quote = line.match(/^&gt;\s?(.*)/)
    const isHr = /^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(line)
    const isTableRow = line.trim().includes('|') && i + 1 < lines.length && isSeparatorRow(lines[i + 1])

    if (isTableRow) {
      closeLists()
      closeBlockquote()
      const headerCells = splitTableRow(line)
      const aligns = splitTableRow(lines[i + 1]).map(alignFor)
      i += 2
      const bodyRows = []
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        bodyRows.push(splitTableRow(lines[i]))
        i += 1
      }
      const th = headerCells
        .map((cell, idx) => `<th${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ''}>${inline(cell)}</th>`)
        .join('')
      const rows = bodyRows
        .map(
          (row) =>
            `<tr>${row
              .map((cell, idx) => `<td${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ''}>${inline(cell)}</td>`)
              .join('')}</tr>`
        )
        .join('')
      html.push(`<table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`)
      continue
    }

    if (isHr) {
      closeLists()
      closeBlockquote()
      html.push('<hr />')
      i += 1
      continue
    }

    if (quote) {
      closeLists()
      if (!inBlockquote) {
        inBlockquote = true
        html.push('<blockquote>')
      }
      html.push(`<p>${inline(quote[1])}</p>`)
      i += 1
      continue
    }
    closeBlockquote()

    if (heading) {
      closeLists()
      const level = heading[1].length + 2
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`)
    } else if (ordered) {
      pushListItem('ol', ordered[1].length, ordered[2])
    } else if (unordered) {
      pushListItem('ul', unordered[1].length, unordered[2])
    } else if (line.trim() === '') {
      closeLists()
    } else {
      closeLists()
      html.push(`<p>${inline(line)}</p>`)
    }
    i += 1
  }
  closeLists()
  closeBlockquote()
  return html.join('')
}

// Splits on fenced code blocks first so multi-line code never gets
// mangled by the line-oriented heading/list parser below.
export function renderMarkdown(source) {
  const parts = source.split(/```([\s\S]*?)```/g)
  return parts
    .map((part, i) =>
      i % 2 === 1 ? `<pre><code>${escapeHtml(part.trim())}</code></pre>` : renderTextBlock(part)
    )
    .join('')
}
