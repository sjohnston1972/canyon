import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Canyon colour palette (RGB)
const COLORS = {
  primary: [139, 90, 43] as [number, number, number],
  tertiary: [59, 130, 128] as [number, number, number],
  error: [176, 55, 55] as [number, number, number],
  text: [40, 40, 40] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  bg: [245, 241, 235] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  headerBg: [139, 90, 43] as [number, number, number],
  headerText: [255, 255, 255] as [number, number, number],
  rowAlt: [250, 247, 243] as [number, number, number],
}

export function createPdf(title: string): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  // Title bar
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...COLORS.white)
  doc.text(title.toUpperCase(), 14, 14)
  // Sub line
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  doc.text(`GKC | GC-2027  —  Exported ${dateStr}`, 14, 28)
  doc.setDrawColor(...COLORS.muted)
  doc.line(14, 30, 196, 30)
  return doc
}

export function addSectionHeader(doc: jsPDF, y: number, label: string): number {
  if (y > 260) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.primary)
  doc.text(label.toUpperCase(), 14, y)
  doc.setDrawColor(...COLORS.primary)
  doc.line(14, y + 1.5, 196, y + 1.5)
  return y + 7
}

export function addText(doc: jsPDF, y: number, text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number]; indent?: number }): number {
  if (y > 275) { doc.addPage(); y = 20 }
  const size = opts?.size ?? 9
  const color = opts?.color ?? COLORS.text
  doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...color)
  const x = 14 + (opts?.indent ?? 0)
  const maxWidth = 196 - x
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * (size * 0.4) + 2
}

export function addTable(doc: jsPDF, y: number, headers: string[], rows: string[][]): number {
  if (y > 250) { doc.addPage(); y = 20 }
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: COLORS.text,
      lineColor: [220, 215, 208],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.headerText,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: COLORS.rowAlt,
    },
    theme: 'grid',
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 6
}

export function addKeyValue(doc: jsPDF, y: number, items: { label: string; value: string }[]): number {
  for (const item of items) {
    if (y > 275) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.muted)
    doc.text(item.label.toUpperCase(), 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text(item.value, 60, y)
    y += 5
  }
  return y + 2
}

export function savePdf(doc: jsPDF, filename: string) {
  doc.save(filename)
}
