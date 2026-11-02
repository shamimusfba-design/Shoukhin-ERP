import React, { useState } from 'react';
import {
  User as UserIcon,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Smartphone,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  loginAdminWithEmail,
  requestAdminAccess,
  sendPasswordReset,
  OWNER_EMAIL,
} from '../firebase';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginPageProps {
  onInstantOwnerLogin: () => void;
  onGoogleLogin: () => void;
  showToast: (msg: string) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
  darkMode: boolean;
  setDarkMode: (fn: (prev: boolean) => boolean) => void;
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onInstantOwnerLogin,
  onGoogleLogin,
  showToast,
  busy,
  setBusy,
  darkMode,
  setDarkMode,
}) => {
  const [view, setView] = useState<'signin' | 'request' | 'submitted'>('signin');

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Request Access Form State (Collects ONLY: full name, email, password, confirm password)
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqConfirmPassword, setReqConfirmPassword] = useState('');
  const [showReqPass, setShowReqPass] = useState(false);

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [statusAlert, setStatusAlert] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusAlert(null);
    if (!email.trim()) {
      showToast('Please enter your email.');
      return;
    }
    if (!password) {
      showToast('Please enter your password.');
      return;
    }

    setBusy(true);
    try {
      await loginAdminWithEmail(email, password);
      showToast('Signed in successfully.');
    } catch (err: any) {
      console.warn('Sign-in error:', err);
      const msg = err?.message || 'Sign in failed.';
      setStatusAlert(msg);
      showToast(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusAlert(null);
    if (!reqName.trim()) {
      showToast('Please enter your full name.');
      return;
    }
    if (!reqEmail.trim()) {
      showToast('Please enter your email address.');
      return;
    }
    if (reqPassword.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }
    if (reqPassword !== reqConfirmPassword) {
      showToast('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const res = await requestAdminAccess(reqName, reqEmail, reqPassword);
      if (res.isBootstrapped) {
        showToast('Initial Admin established! Entering workspace…');
      } else {
        setView('submitted');
        showToast('Admin access request submitted successfully.');
      }
    } catch (err: any) {
      console.warn('Request error:', err);
      if (err?.code === 'auth/email-already-in-use') {
        setStatusAlert('This email is already registered. If you already have an account, please sign in.');
      } else {
        setStatusAlert(err?.message || 'Could not submit request. Please try again.');
      }
      showToast(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('Please enter your email address.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(forgotEmail);
      setForgotSent(true);
      showToast('Password reset link sent to your email.');
    } catch (err: any) {
      showToast(err?.message || 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Background Image Layer with Blur */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-700 scale-105 pointer-events-none filter blur-[3px]"
        style={{
          backgroundImage: "url('/login-bg.jpg')",
        }}
      />

      {/* Gentle Overlay for contrast */}
      <div className="fixed inset-0 z-0 bg-slate-900/25 dark:bg-slate-950/70 pointer-events-none" />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen justify-between">
        {/* Top Minimal Utility Header */}
        <header className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Shoukhin Home Decor Logo"
              className="w-10 h-10 object-contain rounded-xl bg-white/90 p-1 shadow-sm"
            />
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-tight text-white drop-shadow-md">
                Shoukhin Home Decor
              </span>
              <span className="text-[11px] text-white/80 block drop-shadow-xs">
                Live the place you love
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/40 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer shadow-sm hover:bg-white transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </header>

        {/* Main Section */}
        <main className="flex-1 flex items-center justify-center lg:justify-end px-4 sm:px-8 lg:px-20 py-8">
          <div className="w-full max-w-[460px]">
            {/* The Floating Workspace Card */}
            <div className="rounded-[32px] bg-[#fdfcf9]/95 dark:bg-slate-900/95 backdrop-blur-2xl p-7 sm:p-10 shadow-2xl shadow-black/20 border border-white/80 dark:border-slate-800">
              
              {/* Top ERP Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-7 rounded-full bg-[#0e4d34]" />
                <div>
                  <div className="text-xs font-extrabold tracking-wider text-slate-800 dark:text-slate-100 uppercase font-mono">
                    SHOUKHIN ERP
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Enterprise Resource Planning
                  </div>
                </div>
              </div>

              {/* Status Notice Alert */}
              {statusAlert && (
                <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="leading-relaxed">{statusAlert}</div>
                </div>
              )}

              {/* View 1: SIGN IN */}
              {view === 'signin' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl sm:text-[34px] font-bold font-serif text-slate-900 dark:text-white tracking-tight leading-tight">
                      Sign in to your<br />workspace
                    </h1>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Email
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <UserIcon className="w-4 h-4" />
                        </span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotSent(false);
                            setForgotEmail(email);
                            setShowForgotModal(true);
                          }}
                          className="text-xs font-semibold text-[#0e4d34] dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full h-12 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full h-12 rounded-xl bg-[#0e4d34] hover:bg-[#083624] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer mt-2"
                    >
                      <span>{busy ? 'Verifying access…' : 'Sign in'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Request Admin Access Link */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusAlert(null);
                        setView('request');
                      }}
                      className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <span>New user? </span>
                      <span className="font-bold text-[#0e4d34] dark:text-emerald-400 hover:underline">
                        Request admin access
                      </span>
                    </button>
                  </div>

                  {/* Instant Owner Access Shortcut */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={onInstantOwnerLogin}
                      className="w-full py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Instant Primary Admin Login</span>
                      <span className="font-mono text-[10px] text-emerald-600/80">({OWNER_EMAIL})</span>
                    </button>
                  </div>

                  {/* Bottom Notice */}
                  <div className="space-y-4 pt-1">
                    <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
                      Account access requires admin approval.
                    </p>

                    <div className="flex items-center justify-center gap-3">
                      <div className="h-px bg-slate-200 dark:border-slate-800 w-12" />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
                        Authorized personnel only
                      </span>
                      <div className="h-px bg-slate-200 dark:border-slate-800 w-12" />
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: REQUEST ADMIN ACCESS */}
              {view === 'request' && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold font-serif text-slate-900 dark:text-white tracking-tight leading-tight">
                      Request admin access
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Collects only your name and email. An active workspace Admin must approve your request before access is granted.
                    </p>
                  </div>

                  <form onSubmit={handleRequestSubmit} className="space-y-3.5">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Full name
                      </label>
                      <input
                        type="text"
                        required
                        value={reqName}
                        onChange={(e) => setReqName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={reqEmail}
                        onChange={(e) => setReqEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Password (min 6 characters)
                      </label>
                      <div className="relative">
                        <input
                          type={showReqPass ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={reqPassword}
                          onChange={(e) => setReqPassword(e.target.value)}
                          placeholder="Create a password"
                          className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowReqPass(!showReqPass)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {showReqPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Confirm password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={reqConfirmPassword}
                        onChange={(e) => setReqConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full h-12 rounded-xl bg-[#0e4d34] hover:bg-[#083624] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer mt-4"
                    >
                      <span>{busy ? 'Submitting request…' : 'Submit admin access request'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Back to Sign In Link */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusAlert(null);
                        setView('signin');
                      }}
                      className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <span>Already have access? </span>
                      <span className="font-bold text-[#0e4d34] dark:text-emerald-400 hover:underline">
                        Sign in
                      </span>
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 pt-2">
                    Account access requires admin approval.
                  </p>
                </div>
              )}

              {/* View 3: REQUEST SUBMITTED SUCCESS */}
              {view === 'submitted' && (
                <div className="text-center space-y-5 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                      Request Submitted
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-2">
                      Your request for Admin access has been recorded. It will remain in <strong>Pending</strong> status until an existing workspace Admin approves it.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-left text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="font-semibold text-slate-700 dark:text-slate-200">What happens next:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Workspace Admins can view your application in Settings → Admin Access.</li>
                      <li>Protected ERP records remain inaccessible until approved.</li>
                      <li>Once approved, you will have standard Admin access using your credentials.</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStatusAlert(null);
                      setView('signin');
                    }}
                    className="w-full h-11 rounded-xl bg-[#0e4d34] hover:bg-[#083624] text-white font-semibold text-xs transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}

            </div>
          </div>
        </main>

        {/* Minimal Footer */}
        <footer className="px-6 py-4 flex flex-wrap justify-between items-center gap-3 text-[11px] text-white/80 drop-shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Shoukhin Home Decor</span>
            <span>·</span>
            <span>"Live the place you love"</span>
          </div>
          <div className="font-mono">
            <span>erp.shoukhinhd.com</span>
          </div>
        </footer>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reset Password
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSent ? (
              <div className="space-y-4 text-center py-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Password reset link has been dispatched to <strong>{forgotEmail}</strong>. Please check your inbox or spam folder.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full h-10 rounded-xl bg-[#0e4d34] text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your registered Admin email address and we will send you a secure link to reset your password.
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-11 rounded-xl bg-[#0e4d34] text-white text-xs font-semibold hover:bg-[#083624] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'Sending…' : 'Send password reset link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
