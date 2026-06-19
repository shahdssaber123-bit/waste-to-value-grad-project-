import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Home from '@/pages/Home';
import SignIn from '@/pages/SignIn';
import ForgotPassword from '@/pages/ForgotPassword';
import Register from '@/pages/Register';
import Supplier from '@/pages/Supplier';
import Admin from '@/pages/Admin';
import Industry from '@/pages/Industry';
import Driver from '@/pages/Driver';
import HubManager from '@/pages/HubManager';
import Operations from '@/pages/Operations';
import React, { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import FloatingAiChat from '@/components/ai/FloatingAiChat';
import { getFriendlyError } from '@/lib/friendlyErrors';
import ProtectedRoute from '@/components/ProtectedRoute';

const ApiEventToaster = () => {
  const { toast } = useToast();

  useEffect(() => {
    const onError = (event) => {
      const friendly = getFriendlyError(event.detail);
      toast({
        title: friendly.title,
        description: friendly.description,
        variant: 'destructive',
      });
    };
    window.addEventListener('wtv-api-error', onError);
    return () => window.removeEventListener('wtv-api-error', onError);
  }, [toast]);

  return null;
};


const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<SignIn />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/signup" element={<Register />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute allowedRoles={["supplier"]} unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/supplier" element={<Supplier />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["admin"]} unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/admin" element={<Admin />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/operation" element={<Operations />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["industry"]} unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/industry" element={<Industry />} />
        <Route path="/factory" element={<Industry />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["driver"]} unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/driver" element={<Driver />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["hub_manager"]} unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/hub-manager" element={<HubManager />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="wtv-theme-preference">
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <ApiEventToaster />
          <FloatingAiChat />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
