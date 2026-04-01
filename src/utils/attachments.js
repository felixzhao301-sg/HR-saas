// src/utils/attachments.js
import { supabase } from '../supabase'

let XLSX = null

export async function loadXLSX() {
  if (XLSX) return XLSX
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => { XLSX = window.XLSX; resolve(XLSX) }
    document.head.appendChild(script)
  })
}

export async function uploadAttachment(file, folder) {
  if (!file) return null
  const fileExt = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
  const { error } = await supabase.storage
    .from('hr-attachments')
    .upload(fileName, file, { upsert: false })
  if (error) {
    alert('附件上傳失敗：' + error.message)
    return null
  }
  const { data: { publicUrl } } = supabase.storage
    .from('hr-attachments')
    .getPublicUrl(fileName)
  return publicUrl
}