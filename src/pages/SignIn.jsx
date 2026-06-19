import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Recycle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const PATTERN_IMG = 'https://media.base44.com/images/public/69e277b2cca8ad6115f9cd35/e622644fb_generated_5990b155.png';
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();
  const { login, currentUser, isAuthenticated } = useAuth();

  const routeFor = (role) => ({ supplier: '/supplier', admin: '/admin', industry: '/industry', driver: '/driver', hub_manager: '/hub-manager' }[role] || '/');

  useEffect(() => {
    if (isAuthenticated && currentUser?.role) {
      navigate(routeFor(currentUser.role), { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  const validate = () => {
    const next = {};
    const normalized = email.trim().toLowerCase();
    if (!normalized) next.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const fieldError = (name) => errors[name] ? <p className="mt-1.5 text-xs font-semibold text-red-500">{errors[name]}</p> : null;

  const handleLogin = async (loginEmail, loginPassword = password) => {
    if (!validate()) return;
    try {
      setServerError('');
      setSubmitting(true);
      const normalizedEmail = (loginEmail || email).trim().toLowerCase();
      let user = await login({ email: normalizedEmail, password: loginPassword });

      if (!user?.role) {
        throw new Error('Your account data could not be loaded. Please try again.');
      }

      toast.success(`Welcome back, ${user.name || 'User'}!`);
      navigate(routeFor(user.role), { replace: true });
    } catch (error) {
      console.error(error);
      const message = error.message || 'Unable to sign in. Please check your credentials and try again.';
      setServerError(message);
      if (/password/i.test(message)) setErrors((prev) => ({ ...prev, password: message }));
      if (/not found|email|account/i.test(message)) setErrors((prev) => ({ ...prev, email: message }));
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    await handleLogin();
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
          <h2 className="font-heading text-3xl font-bold text-white mb-4">Welcome Back to the Circular Economy</h2>
          <p className="text-white/85 leading-relaxed">Access your dashboard, manage operations, and track materials across the entire supply chain.</p>
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

          <h1 className="font-heading text-2xl font-bold mb-2">Sign In</h1>
          <p className="text-sm text-muted-foreground mb-8">Enter your secure account credentials to access your assigned dashboard.</p>

          <form className="space-y-4 mb-8" onSubmit={onSubmit}>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Email Address</Label>
              <Input type="email" placeholder="your@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); setServerError(''); }} onBlur={validate} className="h-11 rounded-xl" />
              {fieldError('email')}
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Password</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); setServerError(''); }} onBlur={validate} placeholder="••••••••" className="h-11 rounded-xl pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldError('password')}
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot password?</Link>
            </div>
            {serverError && <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{serverError}</div>}
            <Button disabled={submitting} type="submit" className="w-full h-11 rounded-xl bg-gradient-primary hover:opacity-90 text-white font-semibold" >
              Sign In <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mb-8 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Demo accounts (password: 123456)</p>
            <ul className="mt-2 space-y-1">
              <li>Admin — admin@w2v.com</li>
              <li>Supplier — supplier@w2v.com</li>
              <li>Driver — driver@w2v.com</li>
              <li>Factory — factory@w2v.com</li>
              <li>Hub Manager — hubmanager@w2v.com</li>
            </ul>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-primary font-semibold hover:underline">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
