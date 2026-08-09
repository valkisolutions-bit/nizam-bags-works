import { useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';

export default function Receipt({ order, onClose }) {
  useEffect(() => {
    // Optional: auto-print when receipt is shown
    // window.print();
  }, []);

  if (!order) return null;

  const dateStr = new Date(order.date).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  return (
    <div className="absolute inset-0 bg-gray-100 flex flex-col items-center py-10 z-50 overflow-y-auto print:bg-white print:py-0 print:block">

      {/* Non-printable controls */}
      <div className="no-print w-full max-w-[300px] flex gap-2 mb-4">
        <button
          onClick={onClose}
          className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-lg font-bold text-gray-700 shadow-sm"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg font-bold shadow-sm"
        >
          <Printer size={18} /> Print Bill
        </button>
      </div>

      {/* The Printable Receipt (80mm is approx 300px) */}
      <div className="receipt-container bg-white p-4 w-[300px] text-black font-mono text-sm mx-auto">

        {/* Header */}
        {/* Header */}
        <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
          <h1
            className="font-bold mb-2"
            style={{
              fontFamily: "DSArabic",
              fontSize: "38px",
              lineHeight: "1.1"
            }}
          >
            Nizam Bag Works
          </h1>

          <p className="text-xs">No.50 SV Nagar, Redhills Road, Ambattur, Chennai - 53</p>
          <p className="text-xs">Ph: 044-26581630 / 9841398633</p>
          <p className="text-xs">GSTIN: 33AXEPA4674K1ZI</p>
          <p className="text-xs">Email: nizambags1@gmail.com</p>
        </div>

        {/* Info */}
        <div className="mb-4 text-xs flex justify-between">
          <div>
            <p>Date: {dateStr.split(',')[0]}</p>
            <p>Time: {dateStr.split(',')[1]}</p>
          </div>
          <div className="text-right">
            <p>Inv: {order.id}</p>
            <p>Pay: {order.paymentMethod}</p>
          </div>
        </div>

        {/* Items Header */}
        <div className="grid grid-cols-12 border-y border-dashed border-gray-400 py-1 mb-2 font-bold text-xs">
          <div className="col-span-1">Sn</div>
          <div className="col-span-4">Item</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-3 text-right">₹/Unit</div>
          <div className="col-span-3 text-right">Amt</div>
        </div>

        {/* Items List */}
        <div className="mb-4 space-y-1">
          {order.items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 text-xs items-start">
              <div className="col-span-1">{index + 1}</div>
              <div className="col-span-4 pr-1 leading-tight break-words">{item.name}</div>
              <div className="col-span-1 text-center">{item.qty}</div>
              <div className="col-span-3 text-right">₹{Number(item.price).toFixed(2)}</div>
              <div className="col-span-3 text-right">₹{(item.price * item.qty).toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-₹{order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-gray-800 mt-1 pt-1">
            <span>TOTAL:</span>
            <span>₹{order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs mt-6 border-t border-dashed border-gray-400 pt-4">
          <p className="font-bold mb-1">Thank you for shopping!</p>
          <p>Return Policy: No exchange after 3 days.</p>
        </div>
      </div>

    </div>
  );
}
