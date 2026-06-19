import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Recycle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { forgotPassword, resetPassword } from '@/services/authService';

const PATTERN_IMG = 'https://media.base44.com/images/public/69e277b2cca8ad6115f9cd35/e622644fb_generated_5990b155.png';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialToken = searchParams.get('token') || '';
  const [step, setStep] = useState(initialToken ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const fieldError = (name) => errors[name] ? <p className="mt-1.5 text-xs font-semibold text-red-500">{errors[name]}</p> : null;

  const requestReset = async (event) => {
    event.preventDefault();
    const next = {};
    const normalized = email.trim().toLowerCase();
    if (!normalized) next.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) next.email = 'Enter a valid email address.';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      setSubmitting(true);
      setServerError('');
      const response = await forgotPassword({ email: normalized });
      const resetToken = response?.token || response?.data?.token;
      if (resetToken) {
        setToken(resetToken);
        setStep('reset');
      }
      toast.success('Password reset instructions are ready. You can set a new password now.');
    } catch (error) {
      const message = error.message || 'Unable to process password reset.';
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    const next = {};
    if (!token.trim()) next.token = 'Reset token is required.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      setSubmitting(true);
      setServerError('');
      await resetPassword({ token: token.trim(), password });
      toast.success('Password updated successfully. You can sign in now.');
      navigate('/login', { replace: true });
    } catch (error) {
      const message = error.message || 'Unable to reset password.';
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center">
        <img src={PATTERN_IMG} alt="Circular economy pattern" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,30%,8%)]/82 to-[hsl(168,40%,16%)]/72" />
        <div className="relative z-10 p-12 max-w-md">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Recycle className="w-6 h-6 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-white">Waste-to-Value</span>
          </div>
          <h2 className="font-heading text-3xl font-bold text-white mb-4">Reset Your Password</h2>
          <p className="text-white/85 leading-relaxed">Recover access to your dashboard using the local demo authentication service.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-wine flex items-center justify-center">
              <Recycle className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-lg">Waste-to-Value</span>
          </Link>

          {step === 'request' ? (
            <>
              <h1 className="font-heading text-2xl font-bold mb-2">Forgot Password</h1>
              <p className="text-sm text-muted-foreground mb-8">Enter your account email. The demo reset token will be generated locally in your browser.</p>
              <form className="space-y-4 mb-8" onSubmit={requestReset}>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Email Address</Label>
                  <Input type="email" placeholder="your@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); setServerError(''); }} className="h-11 rounded-xl" />
                  {fieldError('email')}
                </div>
                {serverError && <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{serverError}</div>}
                <Button disabled={submitting} type="submit" className="w-full h-11 rounded-xl bg-gradient-primary hover:opacity-90 text-white font-semibold">
                  Send Reset Instructions <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-heading text-2xl font-bold mb-2">Set New Password</h1>
              <p className="text-sm text-muted-foreground mb-8">Use the generated reset token to choose a new password for your local demo account.</p>
              <form className="space-y-4 mb-8" onSubmit={submitReset}>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Reset Token</Label>
                  <Input value={token} onChange={(e) => { setToken(e.target.value); setErrors((prev) => ({ ...prev, token: undefined })); setServerError(''); }} className="h-11 rounded-xl" />
                  {fieldError('token')}
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">New Password</Label>
                  <div className="relative">
                    <Input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); setServerError(''); }} className="h-11 rounded-xl pr-10" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldError('password')}
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirmPassword: undefined })); setServerError(''); }} className="h-11 rounded-xl" />
                  {fieldError('confirmPassword')}
                </div>
                {serverError && <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{serverError}</div>}
                <Button disabled={submitting} type="submit" className="w-full h-11 rounded-xl bg-gradient-primary hover:opacity-90 text-white font-semibold">
                  Update Password <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Remembered your password? <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
