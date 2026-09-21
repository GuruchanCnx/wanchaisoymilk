import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import OrderStatus from './pages/OrderStatus';
import Admin from './pages/Admin';
import POS from './pages/POS';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order/:id" element={<OrderStatus />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/pos" element={<POS />} />
    </Routes>
  );
}
