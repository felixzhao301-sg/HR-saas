// src/components/AttachmentField.jsx
import AttachmentLink from './AttachmentLink'

export default function AttachmentField({ label, existingUrl, existingLabel, onFileChange }) {
  return (
    <div className="col-span-2">
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      {existingUrl && (
        <div className="mb-1">
          <AttachmentLink url={existingUrl} label={existingLabel || '查看現有附件'} />
        </div>
      )}
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={e => onFileChange(e.target.files[0] || null)}
        className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <div className="text-xs text-gray-400 mt-0.5">支援 PDF、JPG、PNG，最大 10MB</div>
    </div>
  )
}