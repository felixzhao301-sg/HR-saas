import { supabase } from '../supabase'

export async function isPlatformAdmin(userId) {
  const { data } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function isPlatformStaff(userId) {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'platform_staff')
    .maybeSingle()
  return !!data
}