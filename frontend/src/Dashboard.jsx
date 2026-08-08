import { useState, useEffect, useMemo, useCallback } from 'react';
import { IndianRupee, Banknote, Smartphone, CreditCard, TrendingUp, Calendar as CalendarIcon, Package, Search, RotateCcw } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function Dashboard({ orders: propOrders = [] }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fetchedOrders, setFetchedOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch orders from MySQL backend with date filters
  const fetchOrdersFromBackend = useCallback(async (start = '', end = '') => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/orders`;
      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        const mapped = data.map((o) => ({
          id: o.order_id || `ORD-${o.id}`,
          date: o.order_date || o.date,
          total: Number(o.total_amount !== undefined ? o.total_amount : o.total || 0),
          discount: Number(o.discount || 0),
          paymentMethod: o.payment_method || o.paymentMethod || 'CASH',
          items: (o.items || []).map((i) => ({
            id: String(i.id || i.item_name),
            name: i.item_name || i.name,
            price: Number(i.unit_price || i.price || 0),
            qty: Number(i.quantity || i.qty || 1),
          })),
        }));
        setFetchedOrders(mapped);
      }
    } catch (err) {
      console.warn('Dashboard failed to fetch from backend, using prop fallback:', err.message);
      setFetchedOrders(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchOrdersFromBackend(startDate, endDate);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrdersFromBackend(startDate, endDate);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    fetchOrdersFromBackend('', '');
  };

  // Determine active orders (use fetched MySQL orders if available, else prop fallback)
  const activeOrders = fetchedOrders !== null ? fetchedOrders : propOrders;
  const hasOrders = activeOrders && activeOrders.length > 0;

  const stats = useMemo(() => {
    if (!hasOrders) {
      return {
        totalSales: 0,
        ordersCount: 0,
        cashSales: 0,
        upiSales: 0,
        cardSales: 0,
        isMock: false,
      };
    }

    let total = 0, cash = 0, upi = 0, card = 0;

    activeOrders.forEach((order) => {
      const amt = Number(order.total || 0);
      total += amt;
      const method = (order.paymentMethod || '').toUpperCase();
      if (method === 'CASH') cash += amt;
      if (method === 'UPI') upi += amt;
      if (method === 'CARD') card += amt;
    });

    return {
      totalSales: total,
      ordersCount: activeOrders.length,
      cashSales: cash,
      upiSales: upi,
      cardSales: card,
      isMock: false,
    };
  }, [activeOrders, hasOrders]);

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-100">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header & Date Range Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-800">Business Dashboard</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <CalendarIcon size={16} />
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Date Filter Form */}
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              <Search size={16} />
              {loading ? 'Searching...' : 'Search'}
            </button>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleReset}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl font-bold text-sm flex items-center gap-1 transition-colors"
                title="Reset Date Range"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            )}
          </form>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-purple-900/20 flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <span className="text-purple-100 font-bold uppercase tracking-wider">Total Sales</span>
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>
            <div className="text-6xl font-black">₹{stats.totalSales.toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 text-white shadow-xl shadow-black/20 flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <span className="text-gray-400 font-bold uppercase tracking-wider">Total Orders</span>
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                <Package size={24} className="text-gray-300" />
              </div>
            </div>
            <div className="text-6xl font-black">{stats.ordersCount}</div>
          </div>
        </div>

        {/* Payment Breakdown KPIs */}
        <h2 className="text-xl font-bold text-gray-800 pt-4">Payment Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex gap-4 items-center mb-4">
              <div className="bg-blue-100 p-4 rounded-2xl">
                <Smartphone size={32} className="text-blue-600" />
              </div>
              <span className="text-gray-500 font-bold uppercase">UPI Sales</span>
            </div>
            <div className="text-4xl font-black text-gray-800">₹{stats.upiSales.toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex gap-4 items-center mb-4">
              <div className="bg-emerald-100 p-4 rounded-2xl">
                <Banknote size={32} className="text-emerald-600" />
              </div>
              <span className="text-gray-500 font-bold uppercase">Cash Sales</span>
            </div>
            <div className="text-4xl font-black text-gray-800">₹{stats.cashSales.toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex gap-4 items-center mb-4">
              <div className="bg-orange-100 p-4 rounded-2xl">
                <CreditCard size={32} className="text-orange-600" />
              </div>
              <span className="text-gray-500 font-bold uppercase">Card Sales</span>
            </div>
            <div className="text-4xl font-black text-gray-800">₹{stats.cardSales.toLocaleString('en-IN')}</div>
          </div>

        </div>
        
        {/* Recent Orders Table */}
        {hasOrders ? (
          <div className="mt-8 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Recent Transactions</h2>
              <span className="text-xs font-bold text-gray-400">Showing {Math.min(10, activeOrders.length)} of {activeOrders.length} orders</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Date / Time</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeOrders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm font-bold text-purple-600">{order.id}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {order.date ? new Date(order.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {Array.isArray(order.items) ? order.items.reduce((sum, i) => sum + (i.qty || 1), 0) : 0} items
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.paymentMethod === 'UPI' ? 'bg-blue-100 text-blue-700' :
                          order.paymentMethod === 'CASH' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        ₹{Number(order.total || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-8 bg-white rounded-3xl p-12 text-center text-gray-400 border border-gray-100">
            <Package size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-lg font-bold">No transactions found</p>
            <p className="text-sm mt-1">Try adjusting your date filter or complete a new order in the POS Terminal.</p>
          </div>
        )}
      </div>
    </div>
  );
}
