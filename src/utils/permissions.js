// src/utils/permissions.js
import { supabase } from '../supabase'

export async function loadPermissions() {
  const { data, error } = await supabase.from('role_permissions').select('role, action, allowed')
  if (error) return {}
  const map = {}
  data.forEach(({ role, action, allowed }) => {
    if (!map[role]) map[role] = {}
    map[role][action] = allowed
  })
  return map
}

export function can(permissionsMap, role, action) {
  if (!role || !permissionsMap[role]) return false
  return permissionsMap[role][action] === true
}