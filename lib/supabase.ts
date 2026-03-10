import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Trip = {
  id: string
  user_id: string
  name: string
  description: string
  start_date: string
  end_date: string
  created_at: string
}

export type Step = {
  id: string
  trip_id: string
  name: string
  latitude: number
  longitude: number
  order_index: number
  created_at: string
}

export type Expense = {
  id: string
  step_id: string
  label: string
  amount: number
  category: string
  created_at: string
}