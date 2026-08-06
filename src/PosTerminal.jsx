import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Minus, Trash2, CreditCard, Banknote, Smartphone,
  ReceiptText, ShoppingBag, Search, X,
} from 'lucide-react';
import Receipt from './Receipt';

export default function PosTerminal({ inventory, onCompleteOrder }) {
  // ── Cart State ──────────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);

  // ── Search State ────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef(null);
  const discountInputRef = useRef(null);
  const listRef = useRef(null);

  // ── Price Entry Modal State ─────────────────────────────────────────────
  const [priceModal, setPriceModal] = useState(null); // { id, name } | null
  const [priceInput, setPriceInput] = useState('');
  const priceInputRef = useRef(null);

  // ── Checkout / Receipt State ────────────────────────────────────────────
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // ── Derived: filtered + sorted product list ─────────────────────────────
  const filteredProducts = inventory
    .filter((p) =>
      p.name.toUpperCase().includes(query.trim().toUpperCase())
    )
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

  // Reset highlight when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Keep highlighted row visible
  useEffect(() => {
    if (!listRef.current) return;
    const highlighted = listRef.current.querySelector('[data-highlighted="true"]');
    if (highlighted) highlighted.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  // Auto-focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Auto-focus price input when modal opens
  useEffect(() => {
    if (priceModal) {
      setTimeout(() => priceInputRef.current?.focus(), 50);
    }
  }, [priceModal]);

  // Return focus to search after modal closes
  const returnFocusToSearch = useCallback(() => {
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  // ── Calculations ────────────────────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const finalTotal = Math.max(0, subtotal - Number(discount || 0));

  // ── Global Keyboard Shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKey = (e) => {
      const key = e.key;
      const ctrl = e.ctrlKey;

      // ── F4: Global search override (works everywhere) ──
      if (key === 'F4') {
        e.preventDefault();
        setPriceModal(null);
        setPriceInput('');
        setShowCheckout(false);
        setPaymentMethod(null);
        setAmountReceived('');
        // Note: does NOT clear cart
        setTimeout(() => searchInputRef.current?.focus(), 30);
        return;
      }

      // ── Print receipt screen ──
      if (showReceipt) {
        if (key === 'Enter') { e.preventDefault(); window.print(); }
        return;
      }

      // ── Price entry modal ──
      if (priceModal) return; // handled by its own onKeyDown

      // ── Checkout modal: UPI / CARD sub-screen ──
      if (showCheckout && paymentMethod && paymentMethod !== 'CASH') {
        if (key === 'Enter') {
          e.preventDefault();
          // trigger "YES, Received" — call handleCompleteOrder
          // We call it via the ref to the latest version
          handleCompleteOrderRef.current?.();
        } else if (ctrl && key === 'w') {
          e.preventDefault();
          setPaymentMethod(null);
        } else if (ctrl && key === 'c') {
          e.preventDefault();
          cancelOrderRef.current?.();
        }
        return;
      }

      // ── Checkout modal: CASH sub-screen — Enter handled via input onKeyDown ──
      if (showCheckout && paymentMethod === 'CASH') return;

      // ── Checkout modal: payment selection screen ──
      if (showCheckout && !paymentMethod) {
        if (key === 'F3') { e.preventDefault(); setPaymentMethod('CASH'); }
        else if (key === 'F6') { e.preventDefault(); setPaymentMethod('CARD'); }
        else if (key === 'F7') { e.preventDefault(); setPaymentMethod('UPI'); }
        else if (ctrl && key === 'b') { e.preventDefault(); setShowCheckout(false); }
        return;
      }

      // ── Main POS screen ──
      if (key === 'F1') {
        e.preventDefault();
        if (cart.length > 0) setShowCheckout(true);
      } else if (key === 'F2') {
        e.preventDefault();
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showReceipt, priceModal, showCheckout, paymentMethod, cart.length]);

  // Stable refs — kept up to date every render so the keydown closure never goes stale
  const handleCompleteOrderRef = useRef(null);
  const cancelOrderRef = useRef(null);

  // ── Handlers: Search keyboard navigation ────────────────────────────────
  const handleSearchKeyDown = (e) => {
    if (filteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredProducts[highlightedIndex];
      if (selected) openPriceModal(selected);
    }
  };

  // ── Handlers: Price Modal ────────────────────────────────────────────────
  const openPriceModal = (product) => {
    setPriceModal({ id: product.id, name: product.name });
    setPriceInput('');
  };

  const closePriceModal = () => {
    setPriceModal(null);
    setPriceInput('');
    returnFocusToSearch();
  };

  const handlePriceConfirm = () => {
    const price = Number(priceInput);
    if (!priceModal || !priceInput || price <= 0) return;

    addToCart({ id: priceModal.id, name: priceModal.name, price });
    setQuery('');
    closePriceModal();
  };

  const handlePriceKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePriceConfirm();
    } else if (e.key === 'Escape') {
      closePriceModal();
    }
  };

  // ── Handlers: Cart ───────────────────────────────────────────────────────
  // Group by id+price combo — same product at different price = different line
  const addToCart = ({ id, name, price }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id && Number(i.price) === Number(price));
      if (existing) {
        return prev.map((i) =>
          i.id === id && Number(i.price) === Number(price)
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      // Use a unique cart-line key: id + price
      return [...prev, { id, name, price: Number(price), qty: 1, cartKey: `${id}-${price}` }];
    });
  };

  const updateQty = (cartKey, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartKey === cartKey) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartKey) => {
    setCart((prev) => prev.filter((i) => i.cartKey !== cartKey));
  };

  const cancelOrder = useCallback(() => {
    setCart([]);
    setDiscount(0);
    setShowCheckout(false);
    setPaymentMethod(null);
    setAmountReceived('');
    returnFocusToSearch();
  }, [returnFocusToSearch]);

  // ── Handlers: Complete Order ─────────────────────────────────────────────
  const handleCompleteOrder = useCallback(() => {
    const order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      items: cart.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      subtotal,
      discount: Number(discount || 0),
      total: finalTotal,
      paymentMethod,
    };
    onCompleteOrder(order);
    setLastOrder(order);
    setShowReceipt(true);
    cancelOrder();
  }, [cart, subtotal, discount, finalTotal, paymentMethod, onCompleteOrder, cancelOrder]);

  // Keep stable refs in sync with latest handlers every render
  handleCompleteOrderRef.current = handleCompleteOrder;
  cancelOrderRef.current = cancelOrder;

  // ── Render: Receipt mode ──────────────────────────────────────────────────
  if (showReceipt && lastOrder) {
    return <Receipt order={lastOrder} onClose={() => { setShowReceipt(false); returnFocusToSearch(); }} />;
  }

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* ══════════════════════════════════════════════════════
          LEFT PANEL — Search + Product List (70%)
      ══════════════════════════════════════════════════════ */}
      <div className="w-[70%] flex flex-col overflow-hidden bg-gray-50 border-r border-gray-200">

        {/* Search Bar */}
        <div className="p-4 bg-white shadow-sm shrink-0">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product… (↑↓ to navigate, Enter to select)"
              className="w-full pl-12 pr-10 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 bg-white transition-colors"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 pl-1">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
            {!query && ' — sorted by most purchased'}
          </p>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto" ref={listRef}>
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingBag size={48} className="mb-4 opacity-30" />
              <p className="text-xl font-medium">No products match "{query}"</p>
              <p className="text-sm mt-1">Try a different search term.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredProducts.map((product, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <li
                    key={product.id}
                    data-highlighted={isHighlighted}
                    onClick={() => openPriceModal(product)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-colors select-none ${
                      isHighlighted
                        ? 'bg-purple-50 border-l-4 border-purple-500'
                        : 'bg-white hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank indicator */}
                      <span className={`text-sm font-bold w-6 text-center ${
                        isHighlighted ? 'text-purple-500' : 'text-gray-300'
                      }`}>
                        {index + 1}
                      </span>
                      <span className={`font-bold text-base tracking-wide ${
                        isHighlighted ? 'text-purple-800' : 'text-gray-800'
                      }`}>
                        {product.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {product.usageCount > 0 && (
                        <span className="text-xs bg-purple-100 text-purple-600 font-semibold px-2 py-1 rounded-full">
                          ×{product.usageCount}
                        </span>
                      )}
                      <span className={`text-sm font-medium px-3 py-1 rounded-lg ${
                        isHighlighted
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        Enter price →
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL — Cart / Billing (30%)
      ══════════════════════════════════════════════════════ */}
      <div className="w-[30%] bg-white flex flex-col overflow-hidden shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ReceiptText className="text-purple-600" />
            Current Order
          </h2>
          {cart.length > 0 && (
            <button
              onClick={cancelOrder}
              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
            >
              <Trash2 size={16} /> Clear
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p>Cart is empty</p>
              <p className="text-xs mt-1 text-center">Search and select a product to begin</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.cartKey}
                className="flex flex-col p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800 flex-1 text-sm leading-snug">
                    {item.name}
                  </span>
                  <span className="font-bold text-gray-800 ml-2">
                    ₹{(Number(item.price) * item.qty).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">₹{Number(item.price).toFixed(2)} each</span>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => updateQty(item.cartKey, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm active:bg-gray-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold w-5 text-center text-sm">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.cartKey, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm active:bg-gray-50"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.cartKey)}
                      className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-500 rounded-md shadow-sm ml-1 active:bg-red-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="bg-white border-t border-gray-100 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-gray-500 text-sm">
              <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Discount (₹)</span>
              <input
                ref={discountInputRef}
                type="number"
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                onWheel={(e) => e.target.blur()}
                className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="0"
              />
            </div>
            <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span className="text-purple-600">₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => setShowCheckout(true)}
            disabled={cart.length === 0}
            className="w-full bg-purple-600 text-white font-bold text-lg py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 active:scale-[0.98] transition-all shadow-md shadow-purple-600/20"
          >
            Checkout
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PRICE ENTRY MODAL
      ══════════════════════════════════════════════════════ */}
      {priceModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closePriceModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Modal Header */}
            <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-purple-200 text-xs font-medium uppercase tracking-wider mb-0.5">
                  Enter Price for
                </p>
                <h3 className="text-lg font-black leading-tight">{priceModal.name}</h3>
              </div>
              <button
                onClick={closePriceModal}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                  ₹
                </span>
                <input
                  ref={priceInputRef}
                  type="number"
                  min="1"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onKeyDown={handlePriceKeyDown}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-4 text-3xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-right"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closePriceModal}
                  className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePriceConfirm}
                  disabled={!priceInput || Number(priceInput) <= 0}
                  className="flex-1 py-3 font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add to Cart
                </button>
              </div>
              <p className="text-center text-xs text-gray-400">
                Press <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Enter</kbd> to add &nbsp;·&nbsp;
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd> to cancel
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          CHECKOUT MODAL (unchanged logic)
      ══════════════════════════════════════════════════════ */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-purple-600 text-white flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-bold">Complete Payment</h2>
              <div className="text-right">
                <p className="text-purple-200 text-sm">Total to Pay</p>
                <p className="text-3xl font-bold">₹{finalTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
              {!paymentMethod ? (
                <>
                  <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                    Select Payment Method
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setPaymentMethod('CASH')}
                      className="flex flex-col items-center justify-center gap-4 bg-gray-50 border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 rounded-2xl p-8 transition-all active:scale-95"
                    >
                      <Banknote size={48} className="text-emerald-500" />
                      <span className="font-bold text-xl">CASH</span>
                      <kbd className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">F3</kbd>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('UPI')}
                      className="flex flex-col items-center justify-center gap-4 bg-gray-50 border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 rounded-2xl p-8 transition-all active:scale-95"
                    >
                      <Smartphone size={48} className="text-blue-500" />
                      <span className="font-bold text-xl">UPI</span>
                      <kbd className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">F7</kbd>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('CARD')}
                      className="flex flex-col items-center justify-center gap-4 bg-gray-50 border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 rounded-2xl p-8 transition-all active:scale-95"
                    >
                      <CreditCard size={48} className="text-orange-500" />
                      <span className="font-bold text-xl">CARD</span>
                      <kbd className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">F6</kbd>
                    </button>
                  </div>
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="px-8 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
                    >
                      Back to Cart
                      <kbd className="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded font-mono">Ctrl+B</kbd>
                    </button>
                  </div>
                </>
              ) : paymentMethod === 'CASH' ? (
                <div className="max-w-md mx-auto space-y-6">
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex justify-between items-center border border-emerald-200">
                    <span className="font-bold">Total Amount</span>
                    <span className="text-2xl font-black">₹{finalTotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Amount Received (₹)
                    </label>
                    <input
                      type="number"
                      autoFocus
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && Number(amountReceived) >= finalTotal) {
                          e.preventDefault();
                          handleCompleteOrder();
                        }
                      }}
                      className="w-full text-4xl p-4 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  {Number(amountReceived) >= finalTotal && (
                    <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl text-center space-y-2">
                      <p className="text-purple-600 font-bold uppercase tracking-wider text-sm">
                        Change to Return
                      </p>
                      <p className="text-5xl font-black text-purple-700">
                        ₹{(Number(amountReceived) - finalTotal).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setPaymentMethod(null)}
                      className="flex-1 py-4 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCompleteOrder}
                      disabled={Number(amountReceived) < finalTotal}
                      className="flex-1 py-4 font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Complete Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto text-center space-y-8">
                  <div className="bg-yellow-50 text-yellow-800 p-6 rounded-xl border border-yellow-200">
                    <h3 className="text-2xl font-bold mb-2">
                      Waiting for {paymentMethod} Payment
                    </h3>
                    <p className="text-lg">
                      Please ask customer to pay{' '}
                      <b>₹{finalTotal.toFixed(2)}</b>
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xl font-bold text-gray-800">
                      Have you received the amount?
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={handleCompleteOrder}
                        className="flex-1 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/30 flex flex-col items-center gap-1"
                      >
                        YES, Received
                        <kbd className="bg-emerald-400/60 text-xs px-2 py-0.5 rounded font-mono font-normal">Enter</kbd>
                      </button>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => setPaymentMethod(null)}
                        className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
                      >
                        Wait 2 Mins
                        <kbd className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded font-mono font-normal">Ctrl+W</kbd>
                      </button>
                      <button
                        onClick={cancelOrder}
                        className="flex-1 py-4 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-colors flex flex-col items-center gap-1"
                      >
                        Cancel Order
                        <kbd className="bg-red-200 text-red-500 text-xs px-2 py-0.5 rounded font-mono font-normal">Ctrl+C</kbd>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
