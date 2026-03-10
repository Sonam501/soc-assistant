import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export type Operator = {
  id: string
  operator_id: string
  name: string
  role: 'operator' | 'team_lead'
  created_at: string
}

export type Report = {
  id: string
  operator_id: string
  operator_name: string
  mode: 'remote_guarding' | 'scan'
  raw_notes: string
  generated_report: string
  created_at: string
}

export type Draft = {
  id: string
  operator_id: string
  mode: string
  raw_notes: string
  generated_report: string
  checklist: object
  updated_at: string
}