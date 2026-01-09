export function parseCsv(text: string): string[][] {
  if (text.length > 200_000) throw new Error('CSV exceeds 200 KB limit')
  text = text.replace(/^\uFEFF/, '')
  const rows: string[][] = [], row: string[] = []
  let field = '', quoted = false, closed = false
  const pushField = () => { row.push(field); field = ''; closed = false }
  const pushRow = () => { pushField(); if (row.some(value => value.trim() !== '')) rows.push([...row]); row.length = 0 }
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i+1] === '"') { field += '"'; i++ }
      else if (char === '"') { quoted = false; closed = true }
      else field += char
    } else if (char === '"') {
      if (field || closed) throw new Error('Unexpected quote in CSV field')
      quoted = true
    } else if (char === ',') pushField()
    else if (char === '\n' || char === '\r') { if (char === '\r' && text[i+1] === '\n') i++; pushRow() }
    else { if (closed && char.trim()) throw new Error('Characters after closing quote'); if (!closed) field += char }
  }
  if (quoted) throw new Error('Unterminated quoted CSV field')
  if (field || row.length || closed) pushRow()
  if (!rows.length) throw new Error('CSV is empty')
  return rows
}
export function csvCell(value: unknown): string {
  let text = String(value ?? '')
  // Neutralize spreadsheet formula execution, including leading whitespace.
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r]/.test(text)) text = "'" + text
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"','""') + '"' : text
}
export function writeCsv(headers: string[], rows: unknown[][]): string {
  return [headers,...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
