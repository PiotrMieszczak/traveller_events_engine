import CampaignView from './CampaignView'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ role?: string }>
}

export default async function CampaignPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { role: roleParam } = await searchParams
  const role = roleParam === 'player' ? 'player' : 'referee'
  return <CampaignView campaignId={id} role={role} />
}
