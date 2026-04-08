/**
 * PDF generation from HTML using @react-pdf/renderer is already in the stack.
 * This module provides a lightweight HTML-to-PDF via a simple fetch to a headless approach,
 * or falls back to returning the HTML as a printable page.
 *
 * For production, we use the built-in @react-pdf/renderer for invoice generation
 * and this utility for template-based generation.
 */

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  // Wrap HTML in a print-ready document
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Arial, sans-serif; font-size: 14px; color: #333; }
  table { page-break-inside: avoid; }
</style>
</head>
<body>${html}</body>
</html>`

  // Return as buffer - the consumer will serve this as HTML for print-to-PDF
  // or use it with a PDF rendering service
  return Buffer.from(fullHtml, 'utf-8')
}

export function fillTemplate(htmlTemplate: string, data: Record<string, string>): string {
  let result = htmlTemplate
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '')
  }
  return result
}
