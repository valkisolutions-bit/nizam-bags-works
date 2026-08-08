import { useState, useEffect } from 'react';
import PosTerminal from './PosTerminal';
import Dashboard from './Dashboard';
import ManageInventory from './ManageInventory';
import { ShoppingBag, LayoutDashboard, Settings } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const SEED_PRODUCTS = [
  'SCHOOL BAG', 'COLLEGE BAG', 'LUNCH BAG', 'BELT', 'M', 'PURSE',
  'TRAVEL BAG', 'TROLLY BAG', 'OFFICE BAG', 'AMERICAN TOURISTER',
  'UPPERCASE', 'SKY BAG', 'WILDCRAFT', 'GENIE', 'GENIUS', 'JUTE BAG',
  'SLING BAG', 'RAINCORT', 'TRACKING BAG', 'TOOLS BAG', 'CASH BAG',
  'GYM BAG', 'UMBRELLA', 'POUCH', 'MILTON WATER BOTTLE', 'SERVICE',
  'MILTON LUNCH BOX', 'ROPE BAG', 'LADIES HAND BAG',
];

function buildSeedInventory() {
  return SEED_PRODUCTS.map((name, i) => ({
    id: `item-${i + 1}`,
    name,
    usageCount: 0,
  }));
}

function App() {
  const [activeTab, setActiveTab] = useState('pos');

  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('nazim_inventory');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return buildSeedInventory();
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('nazim_orders');
    return saved ? JSON.parse(saved) : [];
  });

  // ── Fetch inventory from backend on mount ─────────────────────────────────
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${API_BASE_URL}/products`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((p) => ({
            id: String(p.id),
            name: p.name,
            usageCount: p.times_sold || 0,
          }));
          setInventory(mapped);
        }
      } catch (err) {
        console.warn('Backend unavailable or empty, falling back to local inventory state:', err.message);
      }
    }
    fetchProducts();
  }, []);

  // ── Fetch orders from backend on mount ───────────────────────────────────
  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch(`${API_BASE_URL}/orders`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((o) => ({
            id: o.order_id || `ORD-${o.id}`,
            date: o.order_date || o.date,
            total: Number(o.total_amount || o.total || 0),
            discount: Number(o.discount || 0),
            paymentMethod: o.payment_method || o.paymentMethod || 'CASH',
            items: (o.items || []).map((i) => ({
              id: String(i.id || i.item_name),
              name: i.item_name || i.name,
              price: Number(i.unit_price || i.price || 0),
              qty: Number(i.quantity || i.qty || 1),
            })),
          }));
          setOrders(mapped);
        }
      } catch (err) {
        console.warn('Backend unavailable, falling back to local orders state:', err.message);
      }
    }
    fetchOrders();
  }, []);

  // Synchronize local storage as fallback cache
  useEffect(() => {
    localStorage.setItem('nazim_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('nazim_orders', JSON.stringify(orders));
  }, [orders]);

  // ── Complete Order Handler ────────────────────────────────────────────────
  const handleCompleteOrder = async (order) => {
    // 1. Update React state immediately for instant UI feedback
    setOrders((prev) => [order, ...prev]);

    const soldNames = new Set(order.items.map((i) => i.name.toUpperCase()));

    setInventory((prev) =>
      prev.map((product) =>
        soldNames.has(product.name.toUpperCase())
          ? { ...product, usageCount: (product.usageCount || 0) + 1 }
          : product
      )
    );

    // 2. Persist to MySQL Backend via POST /api/orders with graceful try/catch
    try {
      const payload = {
        order_id: order.id,
        total_amount: order.total,
        discount: Number(order.discount || 0),
        payment_method: order.paymentMethod,
        order_date: order.date,
        items: order.items.map((item) => ({
          item_name: item.name,
          quantity: Number(item.qty || 1),
          unit_price: Number(item.price || 0),
          total_price: Number((item.price || 0) * (item.qty || 1)),
        })),
      };

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('Failed to post order to backend:', res.statusText);
      }
    } catch (err) {
      console.error('Backend connection failed while posting order:', err.message);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100 print:bg-white">

      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 shrink-0 print:hidden z-10">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            Nizam Bags POS
          </h1>
        </div>

        <nav className="flex space-x-2">
          <TabButton
            active={activeTab === 'pos'}
            onClick={() => setActiveTab('pos')}
            icon={<ShoppingBag className="w-5 h-5" />}
            label="POS Terminal"
          />

          <TabButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
          />

          <TabButton
            active={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
            icon={<Settings className="w-5 h-5" />}
            label="Manage Inventory"
          />
        </nav>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'pos' && (
          <PosTerminal
            inventory={inventory}
            onCompleteOrder={handleCompleteOrder}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard orders={orders} />
        )}

        {activeTab === 'inventory' && (
          <ManageInventory
            inventory={inventory}
            setInventory={setInventory}
          />
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-purple-100 text-purple-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default App;