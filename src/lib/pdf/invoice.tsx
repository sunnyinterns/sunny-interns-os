import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1a1918', padding: 48, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  logo: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#c8a96e' },
  entityInfo: { fontSize: 9, color: '#6b7280', textAlign: 'right', lineHeight: 1.5 },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1a1918', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6b7280', marginBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  billTo: { fontSize: 11, color: '#1a1918', lineHeight: 1.6 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f4f4f2', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4 },
  tableHeaderText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  tableRowText: { fontSize: 10, color: '#1a1918' },
  colDesc: { flex: 1 },
  colPrice: { width: 80, textAlign: 'right' },
  colQty: { width: 40, textAlign: 'center' },
  colTotal: { width: 80, textAlign: 'right' },
  totals: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 200, paddingVertical: 3 },
  totalLabel: { fontSize: 10, color: '#6b7280' },
  totalValue: { fontSize: 10, color: '#1a1918', fontFamily: 'Helvetica-Bold' },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', width: 200, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#c8a96e', marginTop: 4 },
  grandTotalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1a1918' },
  grandTotalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#c8a96e' },
  banking: { marginTop: 40, padding: 16, backgroundColor: '#fafaf7', borderRadius: 6, borderWidth: 0.5, borderColor: '#e5e7eb' },
  bankingTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 },
  bankingText: { fontSize: 10, color: '#1a1918', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
  discount: { flexDirection: 'row', justifyContent: 'space-between', width: 200, paddingVertical: 3 },
  discountText: { fontSize: 10, color: '#0d9e75' },
})

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  entity: {
    name: string
    address: string
    vatNumber?: string
    iban?: string
    bic?: string
    bankName?: string
  }
  client: {
    firstName: string
    lastName: string
    email: string
  }
  service: {
    packageName: string
    priceHT: number
    discountPercentage?: number
    vatRate?: number
  }
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const { entity, client, service, invoiceNumber, invoiceDate } = data
  const priceHT = service.priceHT
  const discountAmount = service.discountPercentage ? priceHT * (service.discountPercentage / 100) : 0
  const discountedHT = priceHT - discountAmount
  const vatRate = service.vatRate ?? 0
  const vatAmount = discountedHT * (vatRate / 100)
  const totalTTC = discountedHT + vatAmount

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  return (
    <Document title={`Facture ${invoiceNumber}`} author="Sunny Interns">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Sunny Interns</Text>
          </View>
          <View>
            <Text style={styles.entityInfo}>{entity.name}</Text>
            <Text style={styles.entityInfo}>{entity.address}</Text>
            {entity.vatNumber && <Text style={styles.entityInfo}>TVA : {entity.vatNumber}</Text>}
          </View>
        </View>

        {/* Invoice title */}
        <Text style={styles.title}>Invoice</Text>
        <Text style={styles.subtitle}>#{invoiceNumber} · {invoiceDate}</Text>

        {/* Bill to */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill to</Text>
          <Text style={styles.billTo}>{client.firstName} {client.lastName}</Text>
          <Text style={styles.billTo}>{client.email}</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>Service</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableRowText, styles.colDesc]}>
              Internship placement service in Bali, Indonesia{'\n'}
              {service.packageName}
            </Text>
            <Text style={[styles.tableRowText, styles.colPrice]}>{fmt(priceHT)}</Text>
            <Text style={[styles.tableRowText, styles.colQty]}>1</Text>
            <Text style={[styles.tableRowText, styles.colTotal]}>{fmt(priceHT)}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal (excl. tax)</Text>
            <Text style={styles.totalValue}>{fmt(priceHT)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.discount}>
              <Text style={styles.discountText}>Discount ({service.discountPercentage}%)</Text>
              <Text style={styles.discountText}>-{fmt(discountAmount)}</Text>
            </View>
          )}
          {vatRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT ({vatRate}%)</Text>
              <Text style={styles.totalValue}>{fmt(vatAmount)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{fmt(totalTTC)}</Text>
          </View>
        </View>

        {/* Banking */}
        {entity.iban && (
          <View style={styles.banking}>
            <Text style={styles.bankingTitle}>Payment details</Text>
            {entity.bankName && <Text style={styles.bankingText}>Bank: {entity.bankName}</Text>}
            <Text style={styles.bankingText}>IBAN: {entity.iban}</Text>
            {entity.bic && <Text style={styles.bankingText}>BIC/SWIFT: {entity.bic}</Text>}
          </View>
        )}

        <Text style={styles.footer}>
          {entity.name} · This invoice is due upon receipt. Thank you for your business.
        </Text>
      </Page>
    </Document>
  )
}
