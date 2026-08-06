import { useState, useEffect } from 'react';
import PosTerminal from './PosTerminal';
import Dashboard from './Dashboard';
import ManageInventory from './ManageInventory';
import { ShoppingBag, LayoutDashboard, Settings } from 'lucide-react';

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

  useEffect(() => {
    localStorage.setItem('nazim_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('nazim_orders', JSON.stringify(orders));
  }, [orders]);

  const handleCompleteOrder = (order) => {
    setOrders((prev) => [order, ...prev]);

    const soldIds = new Set(order.items.map((i) => i.id));

    setInventory((prev) =>
      prev.map((product) =>
        soldIds.has(product.id)
          ? { ...product, usageCount: (product.usageCount || 0) + 1 }
          : product
      )
    );
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