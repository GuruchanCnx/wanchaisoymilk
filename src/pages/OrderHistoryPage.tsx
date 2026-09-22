import { useLang } from '../contexts/LanguageContext';
import Nav, { DesktopSideActions } from '../components/Nav';
import OrderHistory from '../components/OrderHistory';
import OnlineBadge from '../components/OnlineBadge';

export default function OrderHistoryPage() {
  const { lang } = useLang();

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <OnlineBadge />
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <OrderHistory />
      </main>
      <DesktopSideActions />
    </div>
  );
}
