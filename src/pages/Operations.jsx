import React, { useEffect, useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import PaginatedList from '@/components/shared/PaginatedList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Truck, FileText, Package, Warehouse } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { platformV1 } from '@/services/platformV1Service';
import { useToast } from '@/components/ui/use-toast';
import { getFriendlyError } from '@/lib/friendlyErrors';

function statusClass(status = '') {
  const s = String(status).toLowerCase();
  if (['completed', 'paid', 'available', 'matched'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['scheduled', 'in_progress', 'requested', 'shipped'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['cancelled', 'rejected', 'overdue'].includes(s)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export default function Operations() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ pickups: [], requests: [], outbound: [], invoices: [] });
  const [selected, setSelected] = useState(null);

  const canAccess = currentUser?.role === 'admin';

  async function loadOperations() {
    if (!canAccess) return;
    setLoading(true);
    try {
      const [pickups, requests, outbound, invoices] = await Promise.allSettled([
        platformV1.pickups.list(),
        platformV1.factory.materialRequests(),
        platformV1.outbound.list(),
        platformV1.invoices.list(),
      ]);
      setData({
        pickups: pickups.status === 'fulfilled' ? pickups.value : [],
        requests: requests.status === 'fulfilled' ? (Array.isArray(requests.value) ? requests.value : requests.value?.data || []) : [],
        outbound: outbound.status === 'fulfilled' ? outbound.value : [],
        invoices: invoices.status === 'fulfilled' ? invoices.value : [],
      });
    } catch (error) {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive', duration: 4000 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOperations(); }, [currentUser?.platformId]);

  if (!canAccess) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="mx-auto max-w-4xl px-4 py-20 text-center"><Card><CardContent className="py-12"><h2 className="font-heading text-2xl font-bold">Operations board is for admins</h2><p className="mt-2 text-sm text-muted-foreground">Drivers, suppliers, factories and hub managers have their own live workflow pages.</p></CardContent></Card></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="font-heading text-2xl font-bold">Live Operations Board</h1><p className="text-sm text-muted-foreground">Connected pickup, factory request, delivery and invoice monitoring.</p></div>
          <Button variant="outline" disabled={loading} onClick={loadOperations}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card><CardContent className="p-4"><Truck className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Pickups</p><p className="text-2xl font-bold">{data.pickups.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><Package className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Material Requests</p><p className="text-2xl font-bold">{data.requests.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><Warehouse className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Outbound</p><p className="text-2xl font-bold">{data.outbound.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><FileText className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Invoices</p><p className="text-2xl font-bold">{data.invoices.length}</p></CardContent></Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">Connected pickups</CardTitle></CardHeader><CardContent><PaginatedList items={data.pickups} empty={<p className="text-sm text-muted-foreground">No connected pickups yet.</p>}>{(p) => <div key={p.id} className="rounded-xl border p-4 flex justify-between gap-3"><div><p className="font-semibold text-sm">Pickup #{p.id} · {p.contract?.commodity?.title || 'Material'}</p><p className="text-xs text-muted-foreground">Supplier #{p.supplier_user_id} · Hub: {p.hub?.location || p.hub_id} · {Number(p.estimated_weight || 0).toLocaleString()}kg</p></div><div className="flex gap-2"><Badge className={statusClass(p.status)}>{p.status}</Badge><Button size="sm" variant="outline" onClick={() => setSelected({ title: 'Pickup', item: p })}>Details</Button></div></div>}</PaginatedList></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Factory material requests</CardTitle></CardHeader><CardContent><PaginatedList items={data.requests} empty={<p className="text-sm text-muted-foreground">No factory material requests yet.</p>}>{(r) => <div key={r.id} className="rounded-xl border p-4 flex justify-between gap-3"><div><p className="font-semibold text-sm">Request #{r.id} · {r.material || `#${r.commodity_id}`}</p><p className="text-xs text-muted-foreground">Factory: {r.factory_name || r.factory_user_id} · {Number(r.quantity_kg || 0).toLocaleString()}kg · Hub: {r.matched_hub || 'waiting'}</p></div><Badge className={statusClass(r.status)}>{r.status}</Badge></div>}</PaginatedList></CardContent></Card>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.title} Profile</DialogTitle></DialogHeader><pre className="max-h-[60vh] overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(selected?.item, null, 2)}</pre></DialogContent></Dialog>
    </div>
  );
}
