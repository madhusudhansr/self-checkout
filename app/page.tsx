'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

type Product = {
  id: string;
  name: string;
  price: number;
};

export default function Home() {
  const [cart, setCart] = useState<Product[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
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
      if (!isScanning && scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner. ", error);
        });
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    if (decodedText === lastScanned) return; // Debounce same scan
    setLastScanned(decodedText);

    // Stop scanning temporarily after success to avoid double addition
    // Ideally we'd pause, but for now we just handle it via lastScanned check
    // or we can allow continuous scanning.

    try {
      const res = await fetch(`/api/get-product?id=${decodedText}`);
      if (res.ok) {
        const product = await res.json();
        setCart(prev => [...prev, product]);
        // Optional: Audio feedback
        // const audio = new Audio('/beep.mp3'); audio.play();
      } else {
        console.error("Product not found");
        alert("Product not found!");
      }
    } catch (err) {
      console.error("API error", err);
    }
  };

  const onScanFailure = (error: any) => {
    // handle scan failure, usually better to ignore and keep scanning.
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
      setLastScanned(null); // Reset debounce
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
    <div className="min-h-screen bg-neutral-900 text-white font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden bg-black shadow-2xl shadow-indigo-500/20">

        {/* Header */}
        <header className="p-6 flex items-center justify-between z-10 bg-black/80 backdrop-blur-md sticky top-0 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Scan & Go
            </h1>
            <p className="text-xs text-neutral-400">Self-checkout experience</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
            U
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 flex flex-col gap-6 relative z-10">

          {/* Scanner Area */}
          <div className="rounded-2xl overflow-hidden bg-neutral-800 border border-white/10 shadow-inner relative min-h-[300px] flex flex-col items-center justify-center">
            {isScanning ? (
              <div id="reader" className="w-full h-full"></div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-neutral-500">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                  </svg>
                </div>
                <p>Tap 'Scan' to start</p>
              </div>
            )}
          </div>

          <button
            onClick={toggleScanner}
            className={`w-full py-4 rounded-xl font-semibold transition-all active:scale-95 shadow-lg ${isScanning ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-indigo-500/25'}`}
          >
            {isScanning ? 'Stop Scanning' : 'Scan Product'}
          </button>

          {/* Cart List */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm text-neutral-400">
              <span>Current Cart</span>
              <span>{cart.length} items</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-24">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-neutral-600 italic">
                  No items yet. Start scanning!
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx + item.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-lg">
                        🛒
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{item.name}</span>
                        <span className="text-xs text-neutral-400">ID: {item.id}</span>
                      </div>
                    </div>
                    <span className="font-semibold text-emerald-400">${item.price.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        {/* Floating Action / Total Panel */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent z-20">
          <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-end justify-between mb-4">
              <span className="text-neutral-400">Total</span>
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
                ${totalPrice.toFixed(2)}
              </div>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={() => setPaymentStatus('processing')}
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {paymentStatus === 'processing' ? 'Processing...' : 'Checkout & Pay'}
              {paymentStatus !== 'processing' && (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Payment Success Overlay */}
        {paymentStatus === 'completed' && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9.135-9.135" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-neutral-400 mb-8">Your order has been placed.</p>
            <button
              onClick={() => setPaymentStatus('idle')}
              className="px-8 py-3 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
            >
              Start New Scan
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
