'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

type Product = {
  id: string;
  name: string;
  price: number;
};

type Mode = 'checkout' | 'add-product';

export default function Home() {
  const [mode, setMode] = useState<Mode>('checkout');

  // Checkout State
  const [cart, setCart] = useState<Product[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed'>('idle');

  // Add Product State
  const [newProductId, setNewProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [addStatus, setAddStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Shared State
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }

    return () => {
      // Cleanup logic if needed
    };
  }, [isScanning, mode]); // Re-init if mode changes? No, handle logic in callback

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    if (decodedText === lastScanned) return;
    setLastScanned(decodedText);

    if (mode === 'checkout') {
      try {
        const res = await fetch(`/api/get-product?id=${decodedText}`);
        if (res.ok) {
          const product = await res.json();
          setCart(prev => [...prev, product]);
        } else {
          alert("Product not found! Switch to 'Add Mode' to add it.");
        }
      } catch (err) {
        console.error("API error", err);
      }
    } else if (mode === 'add-product') {
      setNewProductId(decodedText);
      // Stop scanning automatically for convenience when adding? 
      // Optionally: toggleScanner();
    }
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const toggleScanner = () => {
    if (isScanning) {
      if (scannerRef.current) {
        scannerRef.current.clear().then(() => {
          scannerRef.current = null;
          setIsScanning(false);
        }).catch(err => console.error(err));
      } else {
        setIsScanning(false);
      }
    } else {
      setIsScanning(true);
      setLastScanned(null);
    }
  };

  const handleAddProduct = async () => {
    setAddStatus('saving');
    try {
      const res = await fetch('/api/add-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newProductId,
          name: newProductName,
          price: parseFloat(newProductPrice)
        })
      });

      if (res.ok) {
        setAddStatus('success');
        setNewProductId('');
        setNewProductName('');
        setNewProductPrice('');
        setTimeout(() => setAddStatus('idle'), 2000);
      } else {
        setAddStatus('error');
        const data = await res.json();
        alert(data.error || 'Failed to add');
      }
    } catch (err) {
      setAddStatus('error');
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  const handlePay = () => {
    setPaymentStatus('processing');
    setTimeout(() => {
      setPaymentStatus('completed');
      setCart([]);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden bg-black shadow-2xl">

        {/* Header */}
        <header className="p-6 flex items-center justify-between z-10 bg-black/80 backdrop-blur-md sticky top-0 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Scan & Go
            </h1>
            <p className="text-xs text-neutral-400">
              {mode === 'checkout' ? 'Self-checkout' : 'Admin: Add Product'}
            </p>
          </div>
          <button
            onClick={() => {
              setMode(mode === 'checkout' ? 'add-product' : 'checkout');
              setCart([]); // Clear cart on switch for safety/simplicity
              setIsScanning(false); // Reset scanner logic
              if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
              }
            }}
            className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
          >
            Switch to {mode === 'checkout' ? 'Add' : 'Shop'}
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 flex flex-col gap-6 relative z-10">

          {/* Scanner Area */}
          <div className="rounded-2xl overflow-hidden bg-neutral-800 border border-white/10 shadow-inner relative min-h-[300px] flex flex-col items-center justify-center">
            {isScanning ? (
              <div id="reader" className="w-full h-full"></div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-neutral-500">
                <p>Tap 'Scan' to start</p>
              </div>
            )}
          </div>

          <button
            onClick={toggleScanner}
            className={`w-full py-4 rounded-xl font-semibold transition-all active:scale-95 shadow-lg ${isScanning ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-indigo-600 text-white'}`}
          >
            {isScanning ? 'Stop Scanning' : 'Scan Code'}
          </button>

          {/* MODE: CHECKOUT */}
          {mode === 'checkout' && (
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between text-sm text-neutral-400">
                <span>Cart ({cart.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pb-24">
                {cart.map((item, idx) => (
                  <div key={idx + item.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{item.name}</span>
                      <span className="text-xs text-neutral-400">{item.id}</span>
                    </div>
                    <span className="font-semibold text-emerald-400">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Total & Pay */}
              <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20 max-w-md mx-auto">
                <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 shadow-2xl">
                  <div className="flex justify-between mb-4">
                    <span>Total</span>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <button
                    disabled={cart.length === 0}
                    onClick={handlePay}
                    className="w-full py-3 rounded-xl bg-white text-black font-bold disabled:opacity-50"
                  >
                    {paymentStatus === 'processing' ? 'Processing...' : 'Pay Now'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE: ADD PRODUCT */}
          {mode === 'add-product' && (
            <div className="flex flex-col gap-4 bg-neutral-900/50 p-4 rounded-xl border border-white/5">
              <h2 className="text-lg font-bold">Add New Product</h2>

              <div>
                <label className="text-xs text-neutral-400">Scanned ID</label>
                <input
                  type="text"
                  value={newProductId}
                  onChange={e => setNewProductId(e.target.value)}
                  placeholder="Scan or type ID"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Product Name</label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={e => setNewProductName(e.target.value)}
                  placeholder="e.g. Apple"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Price</label>
                <input
                  type="number"
                  value={newProductPrice}
                  onChange={e => setNewProductPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white"
                />
              </div>

              <button
                onClick={handleAddProduct}
                disabled={!newProductId || !newProductName || !newProductPrice || addStatus === 'saving'}
                className="w-full py-3 mt-2 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"
              >
                {addStatus === 'saving' ? 'Saving...' : 'Save Product'}
              </button>
              {addStatus === 'success' && <p className="text-center text-emerald-400">Saved successfully!</p>}
            </div>
          )}

        </main>

        {/* Payment Success Overlay */}
        {paymentStatus === 'completed' && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Paid!</h2>
            <button
              onClick={() => setPaymentStatus('idle')}
              className="mt-8 px-8 py-3 rounded-full border border-white/20 hover:bg-white/10"
            >
              New Order
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
