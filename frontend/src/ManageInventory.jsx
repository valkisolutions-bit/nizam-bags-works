import { useState, useRef } from 'react';
import { Plus, Trash2, CheckCircle, Package } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function ManageInventory({ inventory, setInventory }) {
  const [name, setName] = useState('');
  const nameInputRef = useRef(null);

  const handleAddItem = async (e) => {
    e.preventDefault();
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return;

    // Prevent exact duplicates (case-insensitive)
    const isDuplicate = inventory.some(
      (item) => item.name.toUpperCase() === trimmed
    );
    if (isDuplicate) {
      alert(`"${trimmed}" already exists in inventory.`);
      return;
    }

    const tempItem = {
      id: `item-${Date.now()}`,
      name: trimmed,
      usageCount: 0,
    };

    // Update state immediately for zero latency
    setInventory((prev) => [...prev, tempItem]);
    setName('');
    nameInputRef.current?.focus();

    // Persist to backend with graceful fallback
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.product && data.product.id) {
          // Replace temp item id with real DB id
          setInventory((prev) =>
            prev.map((item) =>
              item.name === trimmed ? { ...item, id: String(data.product.id) } : item
            )
          );
        }
      } else {
        console.warn('Backend product insert warning:', res.statusText);
      }
    } catch (err) {
      console.error('Failed to post product to backend:', err.message);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setInventory((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Sort by usageCount desc for display, so most-used items appear at top
  const sortedInventory = [...inventory].sort(
    (a, b) => (b.usageCount || 0) - (a.usageCount || 0)
  );

  return (
    <div className="flex h-full w-full bg-gray-100 p-8 overflow-hidden gap-8">

      {/* Left Column — Add Product Form */}
      <div className="w-80 shrink-0 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
            <Plus size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Add Product</h2>
        </div>

        <form onSubmit={handleAddItem} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Product Name
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SCHOOL BAG"
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase placeholder:normal-case"
            />
            <p className="text-xs text-gray-400 mt-1">
              Saved automatically in UPPERCASE.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-600/30 flex justify-center items-center gap-2"
          >
            <CheckCircle size={20} />
            Add to Inventory
          </button>
        </form>

        {/* Summary */}
        <div className="mt-auto p-6 border-t border-gray-100 text-center">
          <p className="text-4xl font-black text-purple-600">{inventory.length}</p>
          <p className="text-gray-500 font-medium mt-1">Total Products</p>
        </div>
      </div>

      {/* Right Column — Product Table */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Package size={22} className="text-gray-500" />
            <h2 className="text-xl font-bold text-gray-800">Product List</h2>
          </div>
          <span className="text-sm text-gray-400 font-medium">
            Sorted by most used
          </span>
        </div>

        {sortedInventory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Package size={64} className="mb-4 opacity-20" />
            <p className="text-xl">No products yet.</p>
            <p className="text-sm mt-1">Use the form to add your first product.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 w-32">Product ID</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 w-24 text-center">Times Sold</th>
                  <th className="px-6 py-4 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedInventory.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 text-sm tracking-wide">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-purple-50 text-purple-700 font-bold text-sm rounded-full w-9 h-9">
                        {item.usageCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete product"
                        className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
