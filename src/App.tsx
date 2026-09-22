import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import OrderStatus from './pages/OrderStatus';
import OrderHistoryPage from './pages/OrderHistoryPage';
import Admin from './pages/Admin';
import POS from './pages/POS';
import { FoldableProvider } from './contexts/FoldableContext';
import { useFoldableSpanning } from './hooks/useFoldableSpanning';

function AppShell() {
  // Hook that detects if the foldable device is spanned across two screens
  // and automatically adds scroll-padding to the main content wrapper
  const { isSpanned, wrapperRef } = useFoldableSpanning<HTMLDivElement>();

  return (
    <div
      ref={wrapperRef}
      className={`app-shell min-h-screen ${isSpanned ? 'duo-unfolded duo-spanning duo-screen-active' : 'duo-folded duo-screen-single'}`}
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/history" element={<OrderHistoryPage />} />
        <Route path="/order/:id" element={<OrderStatus />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/pos" element={<POS />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <FoldableProvider>
      <AppShell />
    </FoldableProvider>
  );
}

