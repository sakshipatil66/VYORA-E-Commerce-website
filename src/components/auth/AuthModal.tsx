import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, currentUser, authenticateUser } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [identity, setIdentity] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const changeMode = () => {
    setMode((current) => current === 'signin' ? 'signup' : 'signin');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const cleanIdentity = identity.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentity);
    const digits = cleanIdentity.replace(/\D/g, '');

    if (mode === 'signup' && name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (mode === 'signup' && !isEmail && !/^\d{10,15}$/.test(digits)) {
      setError('Enter a valid email address or phone number.');
      return;
    }
    if (mode === 'signin' && !cleanIdentity) {
      setError('Enter your email address or phone number.');
      return;
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authenticateUser(mode, {
        name: name.trim(),
        identity: cleanIdentity,
        email: isEmail ? cleanIdentity : '',
        phone: !isEmail ? digits : '',
        password
      });
      setIdentity('');
      setName('');
      setPassword('');
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (currentUser && event.target === event.currentTarget) setIsAuthModalOpen(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EBE4DD] bg-[#FAF7F5] shadow-2xl"
      >
        <div className="relative bg-[#4A0E17] px-7 pb-7 pt-8 text-white">
          {currentUser && (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              aria-label="Close sign in"
              className="absolute right-4 top-4 rounded-full p-2 text-rose-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B112B] font-serif text-lg font-bold text-[#D4AF37]">V</div>
            <span className="font-serif text-lg font-bold tracking-tight">VYORA</span>
          </div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E4C986]">Your private atelier</p>
          <h2 id="auth-title" className="font-serif text-2xl font-bold">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-rose-100/80">
            {mode === 'signin'
              ? 'Sign in to continue to your saved creations and orders.'
              : 'Join VYORA to save your favourites and manage your orders.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-7">
          {mode === 'signup' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-neutral-700">Full name</span>
              <span className="relative block">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full rounded-lg border border-[#EBE4DD] bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#7A1438] focus:ring-2 focus:ring-[#7A1438]/10"
                />
              </span>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-neutral-700">
              {mode === 'signin' ? 'Email or phone number' : 'Email address or phone number'}
            </span>
            <span className="relative block">
              {identity.includes('@')
                ? <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                : <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />}
              <input
                type="text"
                autoComplete={mode === 'signin' ? 'username' : 'email'}
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                placeholder="name@example.com or phone"
                required
                className="w-full rounded-lg border border-[#EBE4DD] bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#7A1438] focus:ring-2 focus:ring-[#7A1438]/10"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-neutral-700">Password</span>
            <span className="relative block">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="w-full rounded-lg border border-[#EBE4DD] bg-white py-3 pl-10 pr-11 text-sm outline-none transition focus:border-[#7A1438] focus:ring-2 focus:ring-[#7A1438]/10"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5B112B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#430C1F] disabled:cursor-wait disabled:opacity-60"
          >
            <span>{isSubmitting ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : 'Create account'}</span>
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="border-t border-[#EBE4DD] pt-4 text-center text-sm text-neutral-600">
            {mode === 'signin' ? 'New to VYORA?' : 'Already have an account?'}
            <button type="button" onClick={changeMode} className="ml-1 font-semibold text-[#7A1438] hover:underline">
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          <p className="text-center text-[11px] leading-relaxed text-neutral-400">
            Your account is protected with a secure server-side session. Passwords are never stored as plain text.
          </p>
        </form>
      </section>
    </div>
  );
};
