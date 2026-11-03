import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AuthModalMode } from '../../types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    registerUser,
    loginUser,
    sendPasswordResetCode,
    resetPasswordWithCode
  } = useStore();

  // Shared & Sign-In / Sign-Up state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot / Reset Password state
  const [resetCode, setResetCode] = useState('');
  const [generatedDispatchCode, setGeneratedDispatchCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Feedback & submission state
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear transient errors when switching modes or opening modal
  useEffect(() => {
    setErrorMsg('');
    if (authModalMode !== 'reset' && authModalMode !== 'signin') {
      setInfoMsg('');
    }
    if (authModalMode !== 'reset') {
      setGeneratedDispatchCode(null);
    }
  }, [authModalMode, isAuthModalOpen]);

  // Escape key closes modal
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthModalOpen, setIsAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const switchMode = (nextMode: AuthModalMode) => {
    setErrorMsg('');
    setInfoMsg('');
    setPassword('');
    setConfirmPassword('');
    setAuthModalMode(nextMode);
  };

  const validatePasswordRules = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
      return 'Password must contain at least one letter and one number.';
    }
    return null;
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginUser(cleanEmail, password);
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in. Please verify your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanName = fullName.trim();
    if (cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10 || !/^[6-9]\d{9}$/.test(phoneDigits)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const pwdRuleErr = validatePasswordRules(password);
    if (pwdRuleErr) {
      setErrorMsg(pwdRuleErr);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser({
        name: cleanName,
        email: cleanEmail,
        phone: phoneDigits,
        password,
        confirmPassword
      });
      setFullName('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to create your account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorMsg('Please enter the email address associated with your account.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendPasswordResetCode(cleanEmail);
      setGeneratedDispatchCode(res.verificationCode);
      setResetCode(res.verificationCode);
      setInfoMsg(
        `Verification code generated for ${res.email} (valid for ${res.expiresInMinutes} minutes).`
      );
      setAuthModalMode('reset');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not generate a reset code for this email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    if (!resetCode.trim() || resetCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit password reset verification code.');
      return;
    }

    const pwdRuleErr = validatePasswordRules(newPassword);
    if (pwdRuleErr) {
      setErrorMsg(pwdRuleErr);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const msg = await resetPasswordWithCode({
        email: cleanEmail,
        code: resetCode.trim(),
        newPassword,
        confirmPassword: confirmNewPassword
      });
      setNewPassword('');
      setConfirmNewPassword('');
      setResetCode('');
      setGeneratedDispatchCode(null);
      setPassword('');
      setInfoMsg(msg);
      setAuthModalMode('signin');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired reset code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerTitle =
    authModalMode === 'signin'
      ? 'Sign In to VYORA'
      : authModalMode === 'signup'
      ? 'Create Customer Account'
      : authModalMode === 'forgot'
      ? 'Forgot Your Password?'
      : 'Set Your New Password';

  const headerSubtitle =
    authModalMode === 'signin'
      ? 'Sign in with your registered email and password to access your personal orders, wishlist, and loyalty rewards.'
      : authModalMode === 'signup'
      ? 'Register your personal account to unlock 500 welcome loyalty points, saved addresses, and live order tracking.'
      : authModalMode === 'forgot'
      ? 'Enter your registered email address to receive a 6-digit verification code.'
      : 'Verify your 6-digit reset code and choose a strong new password for your account.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vyora-auth-heading"
        className="w-full max-w-md bg-[#FAF7F5] rounded-2xl border border-[#E5D9CE] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Modal Luxury Header */}
        <div className="bg-gradient-to-r from-[#380811] via-[#4A0E17] to-[#5B112B] text-white px-5 sm:px-6 py-5 relative shrink-0">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            aria-label="Close authentication modal"
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-rose-200 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md bg-[#380811] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-serif text-sm font-bold">
              V
            </div>
            <span className="font-serif text-base font-bold tracking-[0.08em] text-white">
              VYORA
            </span>
          </div>

          <h3 id="vyora-auth-heading" className="typo-h2 text-white pr-8">
            {headerTitle}
          </h3>
          <p className="typo-body-sm text-rose-100/85 mt-1.5">{headerSubtitle}</p>

          {/* Sign In / Register Mode Switch Tabs */}
          {(authModalMode === 'signin' || authModalMode === 'signup') && (
            <div className="grid grid-cols-2 gap-1.5 bg-[#2A050C]/70 p-1 rounded-xl mt-4 border border-white/10">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`min-h-10 py-2 typo-btn-sm rounded-lg transition-colors cursor-pointer ${
                  authModalMode === 'signin'
                    ? 'bg-[#FAF7F5] text-[#4A0E17] shadow-2xs'
                    : 'text-rose-100/80 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`min-h-10 py-2 typo-btn-sm rounded-lg transition-colors cursor-pointer ${
                  authModalMode === 'signup'
                    ? 'bg-[#FAF7F5] text-[#4A0E17] shadow-2xs'
                    : 'text-rose-100/80 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 typo-body-sm text-rose-900"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success / Info Banner */}
          {infoMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 typo-body-sm text-emerald-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
              {generatedDispatchCode && authModalMode === 'reset' && (
                <div className="ml-6 pt-1 flex items-center justify-between bg-white px-3.5 py-2 rounded-lg border border-emerald-200">
                  <span className="typo-meta text-neutral-600">Verification Code:</span>
                  <span className="typo-tabular font-bold text-base tracking-widest text-[#4A0E17]">
                    {generatedDispatchCode}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* VIEW 1: CUSTOMER LOGIN                                           */}
          {/* ================================================================ */}
          {authModalMode === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="signin-email"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="typo-input bg-white pl-9"
                  />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="signin-password"
                    className="typo-label text-neutral-800"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="typo-btn-sm text-[#7A1438] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="typo-input bg-white pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="w-8 h-8 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-[#4A0E17] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full py-3 px-4 typo-btn text-white bg-[#4A0E17] hover:bg-[#380811] disabled:bg-neutral-400 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>{isSubmitting ? 'Signing In...' : 'Sign In Securely'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4 text-[#D4AF37]" />}
              </button>

              <div className="text-center pt-2.5 border-t border-[#ECE2D8]">
                <p className="typo-body-sm text-neutral-600">
                  New to VYORA?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="typo-btn-sm text-[#7A1438] hover:underline cursor-pointer"
                  >
                    Create a new customer account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* VIEW 2: CUSTOMER REGISTRATION                                    */}
          {/* ================================================================ */}
          {authModalMode === 'signup' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
              <div>
                <label
                  htmlFor="signup-name"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="typo-input bg-white pl-9"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="typo-input bg-white pl-9"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-phone"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  Phone Number *
                </label>
                <div className="flex rounded-[0.625rem] overflow-hidden border border-[#DFD2C5] focus-within:border-[#7A1438] bg-white">
                  <span className="bg-[#F3ECE7] text-[#4A0E17] typo-btn-sm typo-tabular px-3 flex items-center border-r border-[#DFD2C5] gap-1 shrink-0">
                    <Phone className="w-3.5 h-3.5 text-[#7A1438]" />
                    <span>+91</span>
                  </span>
                  <input
                    id="signup-phone"
                    type="tel"
                    autoComplete="tel-national"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2.5 typo-input-bare typo-tabular bg-white focus:outline-none text-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters with letters & numbers"
                    className="typo-input bg-white pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="w-8 h-8 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-[#4A0E17] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="typo-input bg-white pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                    className="w-8 h-8 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-[#4A0E17] cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full py-3 px-4 typo-btn text-white bg-[#4A0E17] hover:bg-[#380811] disabled:bg-neutral-400 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>{isSubmitting ? 'Creating Your Account...' : 'Create Customer Account'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4 text-[#D4AF37]" />}
              </button>

              <div className="text-center pt-2.5 border-t border-[#ECE2D8]">
                <p className="typo-body-sm text-neutral-600">
                  Already have a VYORA account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="typo-btn-sm text-[#7A1438] hover:underline cursor-pointer"
                  >
                    Sign in instead
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* VIEW 3: FORGOT PASSWORD                                          */}
          {/* ================================================================ */}
          {authModalMode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="forgot-email"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="typo-input bg-white pl-9"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full py-3 px-4 typo-btn text-white bg-[#4A0E17] hover:bg-[#380811] disabled:bg-neutral-400 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                <span>{isSubmitting ? 'Generating Code...' : 'Send 6-Digit Reset Code'}</span>
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#ECE2D8] typo-btn-sm">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-[#4A0E17] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-[#7A1438] hover:underline cursor-pointer"
                >
                  Already have a code?
                </button>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* VIEW 4: RESET PASSWORD                                           */}
          {/* ================================================================ */}
          {authModalMode === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5" noValidate>
              <div>
                <label
                  htmlFor="reset-email"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  Registered Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="typo-input bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-code"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  6-Digit Verification Code
                </label>
                <input
                  id="reset-code"
                  type="text"
                  required
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="typo-input bg-white typo-tabular tracking-widest font-bold"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-new-password"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters (letters & numbers)"
                    className="typo-input bg-white pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    className="w-8 h-8 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-[#4A0E17] cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reset-confirm-password"
                  className="typo-label text-neutral-800 block mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="typo-input bg-white pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                    aria-label={
                      showConfirmNewPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                    className="w-8 h-8 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-[#4A0E17] cursor-pointer"
                  >
                    {showConfirmNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full py-3 px-4 typo-btn text-white bg-[#4A0E17] hover:bg-[#380811] disabled:bg-neutral-400 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isSubmitting ? 'Updating Password...' : 'Reset Password'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4 text-[#D4AF37]" />}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#ECE2D8] typo-btn-sm">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-neutral-600 hover:text-[#4A0E17] cursor-pointer"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-[#7A1438] hover:underline cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Encrypted Session Assurance Footer */}
          <div className="pt-2 flex items-center justify-center gap-1.5 typo-meta text-neutral-500 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Encrypted password hashing · Private per-customer vault</span>
          </div>
        </div>
      </div>
    </div>
  );
};
