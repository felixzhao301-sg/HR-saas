// src/components/AttachmentLink.jsx
export default function AttachmentLink({ url, label }) {
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
      📎 {label || '查看附件'}
    </a>
  )
}