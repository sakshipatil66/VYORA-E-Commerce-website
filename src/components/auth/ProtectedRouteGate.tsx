import React from 'react';
import { Lock, ShieldAlert, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface ProtectedRouteGateProps {
  targetPage: string;
  title: string;
  description: string;
  requireAdmin?: boolean;
  children: React.ReactNode;
}

export const ProtectedRouteGate: React.FC<ProtectedRouteGateProps> = ({
  targetPage,
  title,
  description,
  requireAdmin = false,
  children
}) => {
  const { currentUser, isAuthLoading, openAuthModal, setActivePage } = useStore();

  if (isAuthLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#7A1438] border-t-transparent animate-spin" />
        <p className="typo-body-sm font-medium text-neutral-500">
          Verifying your authenticated session...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14 sm:py-24">
        <div className="bg-white rounded-2xl border border-[#E5D9CE] shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#380811] via-[#4A0E17] to-[#5B112B] px-6 py-7 text-center text-white space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#D4AF37]">
              <Lock className="w-5 h-5" />
            </div>
            <p className="typo-eyebrow text-[#D4AF37]">
              Protected Customer Area
            </p>
            <h1 className="typo-h2 text-white">{title}</h1>
          </div>

          <div className="p-6 sm:p-8 text-center space-y-5">
            <p className="typo-body text-neutral-600">{description}</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => openAuthModal('signin', targetPage)}
                className="min-h-11 w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#4A0E17] hover:bg-[#380811] text-white typo-btn transition-colors cursor-pointer shadow-xs"
              >
                <LogIn className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Sign In to Your Account</span>
              </button>

              <button
                type="button"
                onClick={() => openAuthModal('signup', targetPage)}
                className="min-h-11 w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#FAF7F5] hover:bg-[#F1E8E0] text-[#4A0E17] border border-[#DFD2C5] typo-btn transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#7A1438] shrink-0" />
                <span>Create Customer Account</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[#F1E8E0]">
              <button
                type="button"
                onClick={() => {
                  setActivePage('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 typo-btn-sm text-neutral-500 hover:text-[#4A0E17] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to VYORA Storefront</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (requireAdmin && currentUser.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto px-4 py-14 sm:py-24">
        <div className="bg-white rounded-2xl border border-[#E5D9CE] p-6 sm:p-8 text-center space-y-4 shadow-md">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="typo-h2 text-neutral-900">
            Administrator Access Required
          </h2>
          <p className="typo-body text-neutral-600">
            Your account (<strong>{currentUser.email}</strong>) is registered as a customer profile and does not have store administrator permissions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActivePage('profile')}
              className="min-h-11 w-full sm:w-auto py-2.5 px-5 rounded-full bg-[#4A0E17] text-white typo-btn cursor-pointer"
            >
              Open My Customer Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActivePage('home')}
              className="min-h-11 w-full sm:w-auto py-2.5 px-5 rounded-full bg-[#FAF7F5] border border-[#DFD2C5] text-neutral-800 typo-btn cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
