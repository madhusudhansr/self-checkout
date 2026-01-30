'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

type Product = {
  id: string;
  name: string;
  price: number;
  quantity?: number; // Added quantity
};

type Mode = 'checkout' | 'add-product';

export default function Home() {
  const [mode, setMode] = useState<Mode>('checkout');

  // Checkout State
  const [cart, setCart] = useState<Product[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed'>('idle');

  // Quantity Modal State
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [currentScannedProduct, setCurrentScannedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Add Product State
  const [newProductId, setNewProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [addStatus, setAddStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Initialize Scanner
  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      // Use Html5QrcodeScanner with custom config to try and hide default UI if possible or just use it as engine
      // Note: html5-qrcode has strong opinions on UI. For a truly custom UI we'd use Html5Qrcode class, 
      // but sticking to Scanner for stability as per initial success, just styling it via CSS.
      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }

    // Cleanup handled by stopping explicitly in toggle or unmount
    return () => {
      // We rely on manual stop mainly to keep state sync cleanly
    };
  }, [isScanning]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (e) {
        console.error("Failed to clear scanner", e);
      }
    }
    setIsScanning(false);
  };

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    if (decodedText === lastScanned) return;
    setLastScanned(decodedText);

    if (mode === 'checkout') {
      try {
        const res = await fetch(`/api/get-product?id=${decodedText}`);
        if (res.ok) {
          const product = await res.json();

          // PAUSE SCANNING LOGIC:
          // Stop scanner to prevent background scans while modal is open
          await stopScanner();

          setCurrentScannedProduct(product);
          setQuantity(1); // Default to 1
          setShowQuantityModal(true);
        } else {
          // Silently ignore products not found as per user request
          // We just let the scanner continue running until it hits a valid one
          console.log("Product not found, ignoring.");
          // Reset last scanned quickly so they can re-try if it was a mistake or move on
          setTimeout(() => setLastScanned(null), 1000);
        }
      } catch (err) {
        console.error("API error", err);
      }
    } else if (mode === 'add-product') {
      setNewProductId(decodedText);
      await stopScanner(); // Stop after scan for convenience in Add Mode
    }
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const handleConfirmAddToCart = () => {
    if (currentScannedProduct && quantity > 0) {
      const itemToAdd = { ...currentScannedProduct, quantity: quantity, price: currentScannedProduct.price * quantity };
      setCart(prev => [...prev, itemToAdd]);
      setShowQuantityModal(false);
      setCurrentScannedProduct(null);
      setLastScanned(null); // Allow re-scanning same item
      // User MUST tap scan again manually - this is "User Friendly" as it prevents accidental loops
      // Alternatively, we could auto-restart: setIsScanning(true);
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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden bg-neutral-900 shadow-2xl">

        {/* Helper Style for hiding default scanner UI bits we don't like */}
        <style jsx global>{`
            #reader__scan_region img { display: none; }
            #reader__dashboard_section_csr span { display: none; }
            #reader__dashboard_section_swaplink { display: none !important; }
            #reader { border: none !important; }
            video { object-fit: cover; border-radius: 16px; }
        `}</style>

        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between z-20 bg-black/60 backdrop-blur-xl sticky top-0 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <h1 className="text-lg font-bold tracking-tight">Scan & Go</h1>
          </div>
          <button
            onClick={() => setMode(mode === 'checkout' ? 'add-product' : 'checkout')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all active:scale-95 border border-white/5"
          >
            {mode === 'checkout' ? 'Admin Mode' : 'Checkout Mode'}
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 flex flex-col gap-4 relative z-10 overflow-hidden">

          {/* Main Action Area / Scanner */}
          <div className="relative rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl min-h-[350px] flex flex-col items-center justify-center group">

            {/* If scanning, show the reader div, else show the Start UI */}
            {isScanning ? (
              <>
                <div id="reader" className="w-full h-full absolute inset-0 z-0 bg-black"></div>
                {/* Overlay UI for Scanner */}
                <div className="absolute inset-0 z-10 pointer-events-none border-[30px] border-black/50 rounded-3xl">
                  <div className="w-full h-full border-2 border-white/20 rounded-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>
                  </div>
                </div>
                <button
                  onClick={stopScanner}
                  className="absolute bottom-6 bg-red-500/90 text-white px-6 py-2 rounded-full font-bold shadow-lg backdrop-blur-sm z-20 hover:scale-105 transition-transform"
                >
                  Stop Camera
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Ready to Scan</h3>
                <p className="text-neutral-400 text-sm mb-6">Point at any barcode to add to cart</p>
                <button
                  onClick={() => { setIsScanning(true); setLastScanned(null); }}
                  className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors shadow-xl"
                >
                  Tap to Start
                </button>
              </div>
            )}
          </div>

          {/* CHECKOUT LIST */}
          {mode === 'checkout' && (
            <div className="flex-1 flex flex-col gap-4 mt-2">
              <div className="flex-1 overflow-y-auto space-y-2 pb-28">
                {cart.map((item, idx) => (
                  <div key={idx + item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-500">
                        x{item.quantity}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{item.name}</span>
                        <span className="text-xs text-neutral-500">ID: {item.id}</span>
                      </div>
                    </div>
                    <span className="font-semibold text-emerald-400">${item.price.toFixed(2)}</span>
                  </div>
                ))}
                {cart.length === 0 && !isScanning && (
                  <div className="text-center text-neutral-600 mt-10">Cart is empty</div>
                )}
              </div>

              {/* Total Bar */}
              <div className="fixed bottom-4 left-4 right-4 z-30">
                <div className="bg-neutral-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl flex items-center justify-between pl-6">
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Total</span>
                    <span className="text-2xl font-bold text-white">${totalPrice.toFixed(2)}</span>
                  </div>
                  <button
                    disabled={cart.length === 0}
                    onClick={handlePay}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {paymentStatus === 'processing' ? 'Processing...' : 'Pay Now'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADD PRODUCT FORM */}
          {mode === 'add-product' && (
            <div className="flex flex-col gap-4 bg-neutral-800/50 p-6 rounded-3xl border border-white/5 mt-4">
              <h2 className="text-lg font-bold">New Product Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-500 font-bold uppercase ml-1">Scan Code</label>
                  <input
                    type="text"
                    value={newProductId}
                    onChange={e => setNewProductId(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 font-bold uppercase ml-1">Name</label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={e => setNewProductName(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 font-bold uppercase ml-1">Price</label>
                  <input
                    type="number"
                    value={newProductPrice}
                    onChange={e => setNewProductPrice(e.target.value)}
                    step="0.01"
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleAddProduct}
                disabled={!newProductId || !newProductName || !newProductPrice || addStatus === 'saving'}
                className="w-full py-4 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {addStatus === 'saving' ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          )}

        </main>

        {/* QUANTITY MODAL */}
        {showQuantityModal && currentScannedProduct && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full bg-neutral-800 rounded-3xl p-6 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-neutral-400 text-sm">Add to Cart</p>
                  <h3 className="text-2xl font-bold text-white">{currentScannedProduct.name}</h3>
                  <p className="text-emerald-400 font-mono">${currentScannedProduct.price.toFixed(2)} / unit</p>
                </div>
                <button onClick={() => setShowQuantityModal(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-between bg-black/50 rounded-2xl p-2 mb-8">
                <button
                  onClick={() => setQuantity(Math.max(0, quantity - 1))}
                  className="w-14 h-14 rounded-xl bg-neutral-700 flex items-center justify-center text-2xl font-bold active:scale-95 transition-transform"
                >−</button>
                <span className="text-4xl font-bold font-mono tracking-tighter">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(100, quantity + 1))}
                  className="w-14 h-14 rounded-xl bg-white text-black flex items-center justify-center text-2xl font-bold active:scale-95 transition-transform"
                >+</button>
              </div>

              <button
                onClick={handleConfirmAddToCart}
                disabled={quantity === 0}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold text-lg shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
              >
                Add ${(currentScannedProduct.price * quantity).toFixed(2)}
              </button>
            </div>
          </div>
        )}

        {/* PAYMENT SUCCESS */}
        {paymentStatus === 'completed' && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 rounded-full bg-emerald-500 text-black flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9.135-9.135" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-neutral-400 mb-8">Thank you for your purchase.</p>
            <button
              onClick={() => { setPaymentStatus('idle'); setCart([]); }}
              className="px-10 py-4 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform"
            >
              Start New Order
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
