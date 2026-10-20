import { useLang } from '../contexts/LanguageContext';
import Nav from '../components/Nav';
import OrderHistory from '../components/OrderHistory';
import OnlineBadge from '../components/OnlineBadge';
import AccessibilitySettings from '../components/AccessibilitySettings';

export default function OrderHistoryPage() {
  const { lang } = useLang();

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <OnlineBadge />
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <OrderHistory />
        <div className="mt-8">
          <AccessibilitySettings variant="card" />
        </div>
      </main>
    </div>
  );
}
