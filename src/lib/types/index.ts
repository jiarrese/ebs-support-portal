export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type TicketStatus   = 'open' | 'in_progress' | 'pending_client' | 'resolved' | 'closed'
export type UserRole       = 'consultant' | 'client'
export type InvoiceStatus  = 'draft' | 'pending' | 'invoiced' | 'paid'
export type EbsEnv         = 'production' | 'development' | 'qa' | 'uat' | 'staging'

export interface Company {
  id: string
  name: string
  slug: string
  tax_id?: string
  hourly_rate: number
  currency: string
  notes?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface EbsEnvironment {
  id: string
  company_id: string
  name: string
  env_type: EbsEnv
  ebs_version?: string
  notes?: string
  active: boolean
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  company_id?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  number: number
  title: string
  description?: string
  company_id: string
  environment_id?: string
  ebs_module?: string
  priority: TicketPriority
  status: TicketStatus
  assigned_to?: string
  reported_by?: string
  resolved_at?: string
  closed_at?: string
  source_ref?: string
  notify_client: boolean
  client_notified_at?: string
  created_at: string
  updated_at: string
}

export interface TicketSummary {
  id: string
  number: number
  title: string
  priority: TicketPriority
  status: TicketStatus
  ebs_module?: string
  created_at: string
  updated_at: string
  company_name: string
  company_slug: string
  environment_name?: string
  env_type?: EbsEnv
  assigned_to_name?: string
  total_hours: number
}

export interface TimeEntry {
  id: string
  ticket_id: string
  consultant_id: string
  description: string
  hours: number
  entry_date: string
  billable: boolean
  created_at: string
}

export interface TicketComment {
  id: string
  ticket_id: string
  author_id: string
  body: string
  internal: boolean
  sent_to_client: boolean
  created_at: string
  updated_at: string
  profiles?: { full_name: string; role: UserRole }
}

export interface TicketAttachment {
  id: string
  ticket_id: string
  uploaded_by: string
  filename: string
  size_bytes: number
  mime_type: string
  storage_path: string
  created_at: string
  profiles?: { full_name: string }
}

export type BillingType = 'hourly' | 'monthly_hours' | 'fixed'

export interface Project {
  id: string
  name: string
  description?: string
  billing_type: BillingType
  monthly_hours?: number
  hourly_rate?: number
  currency: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface ProjectMonthlySummary {
  project_id: string
  project_name: string
  billing_type: BillingType
  budget_hours?: number
  hourly_rate?: number
  currency: string
  month: string
  used_hours: number
  total_amount: number
}

export interface BillingSummary {
  company_id: string
  company_name: string
  hourly_rate: number
  currency: string
  month: string
  total_hours: number
  total_amount: number
}
