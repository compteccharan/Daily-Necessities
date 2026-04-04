export function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

export function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDateLabel(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatPaymentMethod(method) {
  switch (method) {
    case 'card':
      return 'Card'
    case 'upi':
      return 'UPI'
    case 'cod':
    default:
      return 'Cash on Delivery'
  }
}

export function formatPaymentStatus(status) {
  switch (status) {
    case 'paid_demo':
      return 'Paid (Demo)'
    case 'pay_on_delivery':
      return 'Pay on Delivery'
    default:
      return status ? status.replace(/_/g, ' ') : '-'
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function imageSrc(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  if (path.startsWith('/Daily-Necessities/')) return path
  return `/Daily-Necessities/${path.replace(/^\.?\//, '')}`
}
