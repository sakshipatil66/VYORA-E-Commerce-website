import React, { useState } from 'react';
import { X, ShieldCheck, Phone, ArrowRight, UserCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, loginAsDemoUser, setCurrentUser } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [otp, setOtp] = useState('2026');

  if (!isAuthModalOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    setStep('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsDemoUser('customer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#FAF7F5] rounded-2xl border border-[#EBE4DD] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-[#4A0E17] text-white p-6 relative">
          <button
            onClick={() => setIsAuthModalOpen(false)}
            aria-label="Close modal"
            className="absolute top-4 right-4 text-rose-300 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md bg-[#5B112B] flex items-center justify-center text-[#D4AF37] font-serif text-sm font-bold">
              V
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-white">
              VYORA
            </span>
          </div>

          <h3 className="font-serif text-xl font-bold">
            {mode === 'signin' ? 'Welcome to The Atelier' : 'Create Patron Account'}
          </h3>
          <p className="text-xs text-rose-200/80 mt-1">
            Sign in to access your saved wishlist, orders, and ₹1,250 loyalty rewards.
          </p>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5">
          
          {/* Quick 1-Click Demo Logins for Testing */}
          <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2 text-xs">
            <p className="font-bold text-amber-900 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-700" />
              <span>One-Click Test Accounts</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loginAsDemoUser('customer')}
                className="p-2 bg-white hover:bg-amber-100/60 border border-amber-300 rounded text-left font-medium text-amber-950 transition-colors"
              >
                <span className="block font-bold">Priya Sharma</span>
                <span className="text-[10px] text-neutral-500">Patron (Gold Tier)</span>
              </button>
              <button
                type="button"
                onClick={() => loginAsDemoUser('admin')}
                className="p-2 bg-white hover:bg-amber-100/60 border border-amber-300 rounded text-left font-medium text-amber-950 transition-colors"
              >
                <span className="block font-bold">Devraj Chauhan</span>
                <span className="text-[10px] text-neutral-500">Store Super Admin</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#EBE4DD] w-full" />
            <span className="bg-[#FAF7F5] px-3 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider shrink-0">
              Or Use Mobile OTP
            </span>
            <div className="border-t border-[#EBE4DD] w-full" />
          </div>

          {step === 'input' ? (
            <form onSubmit={handleSendOtp} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Radhika Sen-Gupta"
                    className="w-full text-xs p-2.5 bg-white border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Mobile Number</label>
                <div className="flex">
                  <span className="bg-[#F3ECE7] text-neutral-600 text-xs font-mono font-medium px-3 flex items-center border border-r-0 border-[#EBE4DD] rounded-l-md">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full text-xs p-2.5 bg-white border border-[#EBE4DD] rounded-r-md focus:outline-none focus:border-[#7A1438] font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Continue & Request OTP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3.5">
              <div className="text-center">
                <p className="text-xs text-neutral-600">
                  Enter 4-digit code sent to <strong>+91 {phone}</strong>
                </p>
              </div>

              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-36 text-center text-lg tracking-widest font-mono font-bold p-2 bg-white border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors shadow-xs"
              >
                Verify & Enter Atelier
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="text-xs text-neutral-500 hover:text-black underline"
                >
                  Change Mobile Number
                </button>
              </div>
            </form>
          )}

          <div className="text-center pt-2 border-t border-[#F3ECE7]">
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-xs text-[#7A1438] font-semibold hover:underline"
            >
              {mode === 'signin'
                ? "New to Vyora? Create an account for ₹500 welcome credit"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
