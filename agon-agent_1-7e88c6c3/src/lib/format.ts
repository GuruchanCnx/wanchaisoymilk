export function baht(n: number): string {
  return `฿${n.toLocaleString('en-US')}`;
}

export function shortId(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function timeAgo(iso: string, lang: 'th' | 'en'): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return lang === 'th' ? 'เพิ่งขึ้น' : 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return lang === 'th' ? `${m} นาทีที่แล้ว` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'th' ? `${h} ชม.ที่แล้ว` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return lang === 'th' ? `${d} วันก่อน` : `${d}d ago`;
}
