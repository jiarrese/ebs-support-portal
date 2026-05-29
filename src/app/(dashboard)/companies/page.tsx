import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import type { Company } from '@/lib/types'

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'consultant') redirect('/tickets')

  const { data: companies } = await supabase
    .from('companies').select('*, ebs_environments(count)').eq('active', true).order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Empresas</h1>
        <Link href="/companies/new" className="btn-primary">+ Nueva empresa</Link>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {(companies ?? []).map((company: any) => (
          <div key={company.id} className="card p-5 flex items-center justify-between">
            <div>
              <h2 className="font-medium text-gray-900">{company.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {company.tax_id && <span className="mr-3">{company.tax_id}</span>}
                {company.ebs_environments?.[0]?.count ?? 0} ambientes
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Tarifa/h</p>
                <p className="font-semibold text-gray-800">{formatCurrency(company.hourly_rate, company.currency)}</p>
              </div>
              <Link href={`/companies/${company.id}`} className="btn-secondary py-1.5 text-xs">
                Editar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
