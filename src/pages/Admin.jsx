import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/shared/Navbar';
import LivePlatformControlCenter from '@/components/admin/LiveBackendControlCenter';
import GraduationFeaturesPanel from '@/components/admin/GraduationFeaturesPanel';
import PrintableReportsPanel from '@/components/reports/PrintableReportsPanel';
import PlatformV1Panel from '@/components/admin/PlatformV1Panel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Database, Printer, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function Admin() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Please log in as Admin to access this page.</p>
          <Button onClick={() => navigate('/login')} className="bg-gradient-wine text-white">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8 rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-500">Platform control</span>
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Super Admin Dashboard</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Manage live platform records, review operational flows, open profile popups, print documents, and monitor connected platform actions from one professional control center.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <Database className="mx-auto mb-1 h-4 w-4 text-emerald-500" /> Records
              </div>
              <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <Printer className="mx-auto mb-1 h-4 w-4 text-emerald-500" /> Print Docs
              </div>
              <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <Sparkles className="mx-auto mb-1 h-4 w-4 text-emerald-500" /> AI Assistant
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="live" className="space-y-6">
          <TabsList className="bg-muted rounded-xl p-1 flex-wrap h-auto">
            <TabsTrigger value="live" className="rounded-lg text-xs">Live System</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg text-xs">Print Center</TabsTrigger>
            <TabsTrigger value="insights" className="rounded-lg text-xs">Insights</TabsTrigger>
            <TabsTrigger value="api" className="rounded-lg text-xs">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="live"><LivePlatformControlCenter /></TabsContent>
          <TabsContent value="reports"><PrintableReportsPanel /></TabsContent>
          <TabsContent value="insights"><GraduationFeaturesPanel /></TabsContent>
          <TabsContent value="api">
            <Card><CardContent className="p-4"><PlatformV1Panel /></CardContent></Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
