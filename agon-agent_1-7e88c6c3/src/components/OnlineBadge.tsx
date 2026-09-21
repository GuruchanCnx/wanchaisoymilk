import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';

export default function OnlineBadge() {
  const { t } = useLang();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-chili text-cream text-center text-xs py-1.5 flex items-center justify-center gap-2 font-medium">
      <WifiOff className="h-3.5 w-3.5" /> {t.offline}
      <Wifi className="h-3.5 w-3.5 opacity-0" />
    </div>
  );
}
