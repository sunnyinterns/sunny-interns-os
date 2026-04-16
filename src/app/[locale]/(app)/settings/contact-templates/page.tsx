import { redirect } from 'next/navigation'

// Legacy redirect — this page has been replaced by /settings/templates/contracts
export default function ContactTemplatesRedirect({
  params,
}: {
  params: { locale: string }
}) {
  redirect(`/${params.locale}/settings/templates/contracts`)
}
