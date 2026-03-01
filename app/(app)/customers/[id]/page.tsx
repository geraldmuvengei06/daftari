import { notFound } from 'next/navigation'
import { getCustomerPageData } from '@/lib/actions'
import { CustomerDetail } from './customer-detail'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getCustomerPageData(id)
  if (!data) notFound()
  return <CustomerDetail id={id} initialData={data} />
}
