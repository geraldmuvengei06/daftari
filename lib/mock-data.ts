export interface Customer {
  id: string
  name: string
  phone: string
  createdAt: string
}

export interface Payment {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  amount: number
  type: "credit" | "debit"
  rawText: string
  date: string
  createdAt: string
}

export const customers: Customer[] = [
  { id: "1", name: "Alice Mwangi", phone: "+254712345678", createdAt: "2025-11-01" },
  { id: "2", name: "Bob Ochieng", phone: "+254723456789", createdAt: "2025-11-05" },
  { id: "3", name: "Carol Wanjiku", phone: "+254734567890", createdAt: "2025-11-10" },
  { id: "4", name: "David Kamau", phone: "+254745678901", createdAt: "2025-11-15" },
  { id: "5", name: "Eve Njeri", phone: "+254756789012", createdAt: "2025-12-01" },
  { id: "6", name: "Frank Otieno", phone: "+254767890123", createdAt: "2025-12-10" },
  { id: "7", name: "Grace Akinyi", phone: "+254778901234", createdAt: "2026-01-05" },
  { id: "8", name: "Henry Mutua", phone: "+254789012345", createdAt: "2026-01-15" },
  { id: "9", name: "Irene Wambui", phone: "+254790123456", createdAt: "2026-02-01" },
  { id: "10", name: "James Kiprop", phone: "+254701234567", createdAt: "2026-02-10" },
  { id: "11", name: "Karen Chebet", phone: "+254712345679", createdAt: "2026-02-15" },
  { id: "12", name: "Liam Odhiambo", phone: "+254723456780", createdAt: "2026-02-20" },
]

export const payments: Payment[] = [
  { id: "p1", customerId: "1", customerName: "Alice Mwangi", customerPhone: "+254712345678", amount: 5000, type: "credit", rawText: "SLK4H7R2T0 Confirmed. Ksh5,000.00 received from Alice Mwangi 0712345678 on 25/2/26 at 10:30 AM. New M-PESA balance is Ksh45,000.00.", date: "2026-02-25T10:30:00", createdAt: "2026-02-25T11:05:00" },
  { id: "p2", customerId: "2", customerName: "Bob Ochieng", customerPhone: "+254723456789", amount: 12000, type: "debit", rawText: "RCA3M9K1P5 Confirmed. Ksh12,000.00 sent to Bob Ochieng 0723456789 on 24/2/26 at 2:15 PM. New M-PESA balance is Ksh33,000.00.", date: "2026-02-24T14:15:00", createdAt: "2026-02-24T14:20:00" },
  { id: "p3", customerId: "3", customerName: "Carol Wanjiku", customerPhone: "+254734567890", amount: 3500, type: "credit", rawText: "QBN8T2W4X6 Confirmed. Ksh3,500.00 received from Carol Wanjiku 0734567890 on 23/2/26 at 9:00 AM. New M-PESA balance is Ksh48,500.00.", date: "2026-02-23T09:00:00", createdAt: "2026-02-23T09:45:00" },
  { id: "p4", customerId: "1", customerName: "Alice Mwangi", customerPhone: "+254712345678", amount: 2000, type: "credit", rawText: "PLM5J8N3V7 Confirmed. Ksh2,000.00 received from Alice Mwangi 0712345678 on 22/2/26 at 4:45 PM. New M-PESA balance is Ksh50,500.00.", date: "2026-02-22T16:45:00", createdAt: "2026-02-22T17:10:00" },
  { id: "p5", customerId: "4", customerName: "David Kamau", customerPhone: "+254745678901", amount: 8000, type: "debit", rawText: "WKD6R1F9H2 Confirmed. Ksh8,000.00 sent to David Kamau 0745678901 on 21/2/26 at 11:00 AM. New M-PESA balance is Ksh42,500.00.", date: "2026-02-21T11:00:00", createdAt: "2026-02-21T11:30:00" },
  { id: "p6", customerId: "5", customerName: "Eve Njeri", customerPhone: "+254756789012", amount: 1500, type: "credit", rawText: "TYH3B5G8L4 Confirmed. Ksh1,500.00 received from Eve Njeri 0756789012 on 20/2/26 at 8:20 AM. New M-PESA balance is Ksh44,000.00.", date: "2026-02-20T08:20:00", createdAt: "2026-02-20T08:55:00" },
  { id: "p7", customerId: "6", customerName: "Frank Otieno", customerPhone: "+254767890123", amount: 20000, type: "debit", rawText: "XNP9C4D7M1 Confirmed. Ksh20,000.00 sent to Frank Otieno 0767890123 on 19/2/26 at 1:30 PM. New M-PESA balance is Ksh24,000.00.", date: "2026-02-19T13:30:00", createdAt: "2026-02-19T14:00:00" },
  { id: "p8", customerId: "7", customerName: "Grace Akinyi", customerPhone: "+254778901234", amount: 4500, type: "credit", rawText: "FGK2A6S0E8 Confirmed. Ksh4,500.00 received from Grace Akinyi 0778901234 on 18/2/26 at 3:10 PM. New M-PESA balance is Ksh28,500.00.", date: "2026-02-18T15:10:00", createdAt: "2026-02-18T15:40:00" },
  { id: "p9", customerId: "2", customerName: "Bob Ochieng", customerPhone: "+254723456789", amount: 6000, type: "credit", rawText: "JVL7Q3U5I9 Confirmed. Ksh6,000.00 received from Bob Ochieng 0723456789 on 17/2/26 at 10:00 AM. New M-PESA balance is Ksh34,500.00.", date: "2026-02-17T10:00:00", createdAt: "2026-02-17T10:25:00" },
  { id: "p10", customerId: "8", customerName: "Henry Mutua", customerPhone: "+254789012345", amount: 15000, type: "debit", rawText: "MZW1P8Y6O3 Confirmed. Ksh15,000.00 sent to Henry Mutua 0789012345 on 16/2/26 at 12:45 PM. New M-PESA balance is Ksh19,500.00.", date: "2026-02-16T12:45:00", createdAt: "2026-02-16T13:15:00" },
  { id: "p11", customerId: "9", customerName: "Irene Wambui", customerPhone: "+254790123456", amount: 7000, type: "credit", rawText: "BHN4K9T2R7 Confirmed. Ksh7,000.00 received from Irene Wambui 0790123456 on 15/2/26 at 9:30 AM. New M-PESA balance is Ksh26,500.00.", date: "2026-02-15T09:30:00", createdAt: "2026-02-15T10:00:00" },
  { id: "p12", customerId: "10", customerName: "James Kiprop", customerPhone: "+254701234567", amount: 3000, type: "credit", rawText: "CSE5L0W8F1 Confirmed. Ksh3,000.00 received from James Kiprop 0701234567 on 14/2/26 at 5:00 PM. New M-PESA balance is Ksh29,500.00.", date: "2026-02-14T17:00:00", createdAt: "2026-02-14T17:30:00" },
]

export function getCustomerById(id: string): Customer | undefined {
  return customers.find((c) => c.id === id)
}

export function getPaymentsByCustomerId(customerId: string): Payment[] {
  return payments.filter((p) => p.customerId === customerId)
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return {
    data: items.slice(start, start + perPage),
    totalPages: Math.ceil(items.length / perPage),
  }
}

export function getCustomerTotals(customerId: string) {
  const customerPayments = getPaymentsByCustomerId(customerId)
  const totalPaid = customerPayments
    .filter((p) => p.type === "credit")
    .reduce((sum, p) => sum + p.amount, 0)
  const totalPaidOut = customerPayments
    .filter((p) => p.type === "debit")
    .reduce((sum, p) => sum + p.amount, 0)
  return { totalPaid, totalPaidOut }
}


export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
