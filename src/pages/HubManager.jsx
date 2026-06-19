import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/shared/Navbar';
import PaginatedList from '@/components/shared/PaginatedList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, PackageCheck, Warehouse, Scale, Cuboid, CheckCircle2, Boxes, Factory, Truck, FileText, AlertTriangle, ShieldCheck, Search, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { platformV1 } from '@/services/platformV1Service';
import { useToast } from '@/components/ui/use-toast';
import { getFriendlyError } from '@/lib/friendlyErrors';

function statusClass(status = '') {
  const s = String(status).toLowerCase();
  if (['completed', 'baled', 'quality_checked', 'delivered', 'confirmed', 'paid', 'matched', 'scheduled'].includes(s)) return 'bg-emerald-500/10 text-emerald-200 border-emerald-400/30';
  if (['received', 'processing', 'pending', 'requested', 'shipped', 'weighted_tier1', 'sorting', 'sorted', 'weighted_tier2'].includes(s)) return 'bg-amber-500/10 text-amber-200 border-amber-400/30';
  if (['rejected', 'cancelled', 'overdue', 'open'].includes(s)) return 'bg-red-500/10 text-red-200 border-red-400/30';
  return 'bg-slate-500/10 text-slate-200 border-slate-400/30';
}

function EmptyState({ children }) {
  return <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

function MiniStat({ icon: Icon, label, value, sub }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black text-main">{value}</p>
        {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function HubManager() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('receive');
  const [queue, setQueue] = useState({ completed_pickups: [], inbound_records: [], inventory: [], factory_requests: [], outbound_deliveries: [], invoices: [], alerts: [], problem_reports: [], stats: {}, hub: null });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [qaErrors, setQaErrors] = useState({});
  const [qaForm, setQaForm] = useState({ tier1_weight: '', rejected_weight: '', tier2_weight: '', quality_score: 'A', sorter_names: '' });

  const canAccess = currentUser && currentUser.role === 'hub_manager';

  async function loadHubData() {
    if (!canAccess) return;
    setLoading(true);
    try {
      const data = await platformV1.hub.receivingQueue({ per_page: 150 });
      setQueue({ completed_pickups: [], inbound_records: [], inventory: [], factory_requests: [], outbound_deliveries: [], invoices: [], alerts: [], problem_reports: [], stats: {}, hub: null, ...(data || {}) });
      toast({ title: 'Hub workspace refreshed', description: 'Receiving, QA, inventory, requests, outbound, invoices and alerts are synced.', duration: 2500 });
    } catch (error) {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive', duration: 4000 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHubData(); }, [currentUser?.platformId]);

  const contaminationRatio = useMemo(() => {
    const tier1 = Number(qaForm.tier1_weight || 0);
    const rejected = Number(qaForm.rejected_weight || 0);
    if (!tier1) return 0;
    return Math.min(1, Math.max(0, rejected / tier1));
  }, [qaForm]);

  const completedPickups = queue.completed_pickups || [];
  const inboundRecords = queue.inbound_records || [];
  const inventory = queue.inventory || [];
  const factoryRequests = queue.factory_requests || [];
  const outboundDeliveries = queue.outbound_deliveries || [];
  const invoices = queue.invoices || [];
  const alerts = queue.alerts || [];
  const stats = queue.stats || {};
  const totalAccepted = Number(stats.accepted_kg || inboundRecords.reduce((s, r) => s + Number(r.accepted_weight || 0), 0));
  const thresholdProgress = Math.min(100, (totalAccepted / 50000) * 100);

  function validateQa() {
    const next = {};
    const tier1 = Number(qaForm.tier1_weight);
    const rejected = Number(qaForm.rejected_weight);
    const tier2 = Number(qaForm.tier2_weight);
    if (!Number.isFinite(tier1) || tier1 <= 0) next.tier1_weight = 'Tier 1 weight must be greater than 0.';
    if (!Number.isFinite(rejected) || rejected < 0) next.rejected_weight = 'Rejected weight cannot be negative.';
    if (Number.isFinite(tier1) && Number.isFinite(rejected) && rejected > tier1) next.rejected_weight = 'Rejected weight cannot exceed Tier 1 weight.';
    if (!Number.isFinite(tier2) || tier2 <= 0) next.tier2_weight = 'Tier 2 accepted weight must be greater than 0.';
    if (Number.isFinite(tier1) && Number.isFinite(tier2) && tier2 > tier1) next.tier2_weight = 'Accepted weight cannot exceed Tier 1 weight.';
    setQaErrors(next);
    return Object.keys(next).length === 0;
  }

  async function runAction(title, action) {
    try {
      await action();
      toast({ title, description: 'Hub workflow updated and synced with the platform.', duration: 3500 });
      setSelectedRecord(null);
      await loadHubData();
    } catch (error) {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive', duration: 4000 });
    }
  }

  async function receivePickup(pickupId) {
    await runAction('Inbound record created', () => platformV1.hub.createInbound({ pickup_id: pickupId }));
  }

  async function inspectPickup(pickupId) {
    try {
      const result = await platformV1.hub.inspectPickup(pickupId);
      setInspectData(result);
      toast({ title: 'Inspection loaded', description: `Pickup #${pickupId} details ready for review.`, duration: 3000 });
    } catch (error) {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive', duration: 4000 });
    }
  }

  async function stepInboundStatus(recordId, status, extra = {}) {
    await runAction(`Status → ${status}`, () => platformV1.hub.updateInboundStatus(recordId, { status, ...extra }));
  }

  async function submitQuality() {
    if (!selectedRecord) return;
    if (!validateQa()) {
      toast({ title: 'Fix QA validation errors', description: 'Please review the red validation messages before saving.', variant: 'destructive', duration: 3500 });
      return;
    }
    await runAction('Quality check recorded', () => platformV1.hub.quality(selectedRecord.id, {
      tier1_weight: Number(qaForm.tier1_weight),
      tier2_weight: Number(qaForm.tier2_weight),
      contamination_ratio: contaminationRatio,
    }));
  }

  async function submitBale(record) {
    await runAction('Bale created and inventory updated', () => platformV1.hub.bale(record.id, { quality_score: qaForm.quality_score || 'A' }));
  }

  const tabs = [
    { id: 'receive', label: 'Receive', icon: PackageCheck },
    { id: 'qa', label: 'QA & Bales', icon: Cuboid },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'requests', label: 'Factory Requests', icon: Factory },
    { id: 'outbound', label: 'Outbound & Invoices', icon: Truck },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Please log in as Hub Manager to access this page.</p>
          <Button onClick={() => navigate('/login')} className="bg-gradient-wine text-white">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-black text-main">Hub Operations Center</h1>
            <p className="text-sm text-muted-foreground">Receiving, QA, bales, inventory, factory matching, outbound flow, invoices and alerts in one synced hub workspace.</p>
          </div>
          <Button variant="outline" onClick={loadHubData} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
          <MiniStat icon={PackageCheck} label="Ready to Receive" value={stats.ready_to_receive ?? completedPickups.length} />
          <MiniStat icon={Scale} label="Pending QA/Bale" value={stats.pending_qa_bale ?? 0} />
          <MiniStat icon={ShieldCheck} label="Completed Inbound" value={stats.completed_inbound ?? 0} />
          <MiniStat icon={Boxes} label="Inventory Kg" value={`${Number(stats.inventory_kg || 0).toLocaleString()} kg`} />
          <MiniStat icon={Factory} label="Factory Requests" value={stats.factory_requests ?? factoryRequests.length} />
          <MiniStat icon={AlertTriangle} label="Open Alerts" value={stats.open_alerts ?? alerts.length} />
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
              <span>Accepted material progress toward 50-ton shipment readiness</span>
              <span>{totalAccepted.toLocaleString()} kg</span>
            </div>
            <Progress className="mt-3" value={thresholdProgress} />
          </CardContent>
        </Card>

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-card/70 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted/60 hover:text-main'}`}><Icon className="h-3.5 w-3.5" />{tab.label}</button>;
          })}
        </div>

        {activeTab === 'receive' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackageCheck className="h-4 w-4" /> Completed pickups waiting for receiving</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <PaginatedList items={completedPickups} empty={<EmptyState>No completed driver pickups waiting for receiving.</EmptyState>}>
                {(p) => (
                  <div key={p.id} className="rounded-2xl border border-border/60 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-sm">Pickup #{p.id} · {p.contract?.commodity?.title || 'Material'}</p>
                        <p className="text-xs text-muted-foreground">Supplier: {p.supplier?.user ? `${p.supplier.user.fname} ${p.supplier.user.lname}` : `#${p.supplier_user_id}`} · Location: {p.supplier_location?.location_name || p.supplierLocation?.location_name || 'Main supplier location'} · {Number(p.estimated_weight || 0).toLocaleString()}kg</p>
                        {p.delivered_to_hub_id && p.delivered_to_hub_id !== p.hub_id && (
                          <p className="text-xs text-amber-400 font-medium mt-1">⚠ Driver delivered to this hub (originally assigned: {p.hub?.location || `Hub #${p.hub_id}`})</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => inspectPickup(p.id)}><Search className="mr-1 h-3 w-3" /> Inspect</Button>
                        <Button size="sm" onClick={() => receivePickup(p.id)} className="bg-gradient-primary text-white"><Warehouse className="mr-1 h-3 w-3" /> Receive</Button>
                      </div>
                    </div>
                  </div>
                )}
              </PaginatedList>
            </CardContent>
          </Card>
        )}

        {activeTab === 'qa' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Cuboid className="h-4 w-4" /> Inbound Processing Pipeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <PaginatedList items={inboundRecords} empty={<EmptyState>No inbound records yet. Receive a completed pickup first.</EmptyState>}>
                {(r) => {
                  const st = String(r.status).toLowerCase();
                  return (
                  <div key={r.id} className="rounded-2xl border border-border/60 p-4 space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-sm">Inbound #{r.id} · {r.pickup?.contract?.commodity?.title || 'Material'}</p>
                        <p className="text-xs text-muted-foreground">Pickup #{r.pickup_id} · Accepted: {Number(r.accepted_weight || 0).toLocaleString()}kg · Bales: {r.bale_cubes?.length || r.baleCubes?.length || 0}</p>
                        {r.supplier_invoice_number && <p className="text-xs text-emerald-400 mt-1">Invoice: {r.supplier_invoice_number} · {Number(r.pricing_total_amount || 0).toLocaleString()} EGP</p>}
                        {r.inspected_by && <p className="text-xs text-muted-foreground">Inspected by: #{r.inspected_by_hub_manager_id}</p>}
                      </div>
                      <Badge className={statusClass(r.status)}>{r.status}</Badge>
                    </div>
                    {/* Stage progress bar */}
                    <div className="flex items-center gap-1 text-[10px] font-semibold">
                      {['received','weighted_tier1','sorting','sorted','weighted_tier2','baled'].map((stage, i, arr) => (
                        <React.Fragment key={stage}>
                          <span className={`px-2 py-0.5 rounded ${st === stage ? 'bg-primary text-primary-foreground' : arr.indexOf(st) > i ? 'bg-emerald-500/20 text-emerald-300' : 'bg-muted text-muted-foreground'}`}>{stage.replace('_',' ')}</span>
                          {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {st === 'received' && <Button size="sm" variant="outline" onClick={() => stepInboundStatus(r.id, 'weighted_tier1', { tier1_weight: Number(r.pickup?.estimated_weight || 0) })}><Scale className="mr-1 h-3 w-3" /> Weigh Tier 1</Button>}
                      {st === 'weighted_tier1' && <Button size="sm" variant="outline" onClick={() => stepInboundStatus(r.id, 'sorting', { sorter_names: '' })}><ArrowRight className="mr-1 h-3 w-3" /> Start Sorting</Button>}
                      {st === 'sorting' && <Button size="sm" variant="outline" onClick={() => stepInboundStatus(r.id, 'sorted')}><CheckCircle2 className="mr-1 h-3 w-3" /> Sorting Complete</Button>}
                      {st === 'sorted' && <Button size="sm" variant="outline" onClick={() => { setSelectedRecord(r); setQaErrors({}); }}><Scale className="mr-1 h-3 w-3" /> Weigh Tier 2 + QA</Button>}
                      {st === 'weighted_tier2' && <Button size="sm" onClick={() => submitBale(r)} className="bg-emerald-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> Create Bale + Update Stock</Button>}
                      {/* Legacy support */}
                      {st === 'quality_checked' && <Button size="sm" onClick={() => submitBale(r)} className="bg-emerald-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> Create Bale + Update Stock</Button>}
                      {!['baled','completed','rejected'].includes(st) && <Button size="sm" variant="destructive" onClick={() => stepInboundStatus(r.id, 'rejected')}>Reject</Button>}
                    </div>
                  </div>
                  );
                }}
              </PaginatedList>
            </CardContent>
          </Card>
        )}

        {activeTab === 'inventory' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Boxes className="h-4 w-4" /> Hub Inventory</CardTitle></CardHeader>
            <CardContent>
              <PaginatedList items={inventory} empty={<EmptyState>No inventory rows yet. Create bales from accepted inbound records to increase stock.</EmptyState>}>
                {(item) => <div key={`${item.hub_id}-${item.commodity_id}`} className="grid gap-3 rounded-2xl border border-border/60 p-4 md:grid-cols-4"><strong>{item.commodity?.title || `Commodity #${item.commodity_id}`}</strong><span>{Number(item.current_inventory_total || 0).toLocaleString()} kg available</span><span>{Number(item.reserved_inventory_total || 0).toLocaleString()} kg reserved</span><Badge className={Number(item.current_inventory_total || 0) > 0 ? statusClass('completed') : statusClass('pending')}>{Number(item.current_inventory_total || 0) > 0 ? 'stock ready' : 'empty'}</Badge></div>}
              </PaginatedList>
            </CardContent>
          </Card>
        )}

        {activeTab === 'requests' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Factory className="h-4 w-4" /> Factory Material Requests</CardTitle></CardHeader>
            <CardContent>
              <PaginatedList items={factoryRequests} empty={<EmptyState>No factory requests are waiting on this hub right now.</EmptyState>}>
                {(r) => <div key={r.id} className="grid gap-3 rounded-2xl border border-border/60 p-4 md:grid-cols-5"><strong>Request #{r.id}</strong><span>{r.factory_name || `Factory #${r.factory_user_id}`}</span><span>{r.material || `Commodity #${r.commodity_id}`}</span><span>{Number(r.quantity_kg || 0).toLocaleString()} kg</span><Badge className={statusClass(r.status)}>{r.status}</Badge></div>}
              </PaginatedList>
            </CardContent>
          </Card>
        )}

        {activeTab === 'outbound' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4" /> Outbound Deliveries</CardTitle></CardHeader>
              <CardContent>
                <PaginatedList items={outboundDeliveries} empty={<EmptyState>No outbound deliveries connected to this hub yet.</EmptyState>}>
                  {(d) => <div key={d.id} className="rounded-2xl border border-border/60 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-sm">Delivery #{d.id} · {d.commodity?.title || 'Material'}</p><p className="text-xs text-muted-foreground">{Number(d.quantity_kg || 0).toLocaleString()} kg · {d.contract?.factory?.user ? `${d.contract.factory.user.fname} ${d.contract.factory.user.lname}` : 'Factory delivery'}</p></div><Badge className={statusClass(d.status)}>{d.status}</Badge></div></div>}
                </PaginatedList>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Hub-linked Invoices</CardTitle></CardHeader>
              <CardContent>
                <PaginatedList items={invoices} empty={<EmptyState>No invoices generated for this hub's outbound flow yet.</EmptyState>}>
                  {(inv) => <div key={inv.id} className="rounded-2xl border border-border/60 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-sm">{inv.invoice_number || `Invoice #${inv.id}`}</p><p className="text-xs text-muted-foreground">{Number(inv.total_amount || 0).toLocaleString()} EGP · Due {inv.due_date || '—'}</p></div><Badge className={statusClass(inv.status)}>{inv.status}</Badge></div></div>}
                </PaginatedList>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'alerts' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> Operational Alerts & Problem Reports</CardTitle></CardHeader>
            <CardContent>
              <PaginatedList items={alerts} empty={<EmptyState>No open alerts. Hub operations are currently stable.</EmptyState>}>
                {(a) => <div key={a.id} className="rounded-2xl border border-border/60 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-sm">{a.problem_type || 'Hub alert'} · Pickup #{a.pickup_id}</p><p className="text-xs text-muted-foreground">{a.description || 'No description'} {a.driver_name ? `· Driver: ${a.driver_name}` : ''}</p></div><Badge className={statusClass(a.status)}>{a.status}</Badge></div></div>}
              </PaginatedList>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Quality Check — Inbound #{selectedRecord?.id}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Input type="number" placeholder="Tier 1 weight (kg)" value={qaForm.tier1_weight} onChange={(e) => { setQaForm({ ...qaForm, tier1_weight: e.target.value }); setQaErrors((p) => ({ ...p, tier1_weight: undefined })); }} />{qaErrors.tier1_weight && <p className="mt-1 text-xs font-semibold text-red-500">{qaErrors.tier1_weight}</p>}</div>
            <div><Input type="number" placeholder="Rejected / contaminated weight (kg)" value={qaForm.rejected_weight} onChange={(e) => { setQaForm({ ...qaForm, rejected_weight: e.target.value }); setQaErrors((p) => ({ ...p, rejected_weight: undefined })); }} />{qaErrors.rejected_weight && <p className="mt-1 text-xs font-semibold text-red-500">{qaErrors.rejected_weight}</p>}</div>
            <div><Input type="number" placeholder="Tier 2 accepted weight (kg)" value={qaForm.tier2_weight} onChange={(e) => { setQaForm({ ...qaForm, tier2_weight: e.target.value }); setQaErrors((p) => ({ ...p, tier2_weight: undefined })); }} />{qaErrors.tier2_weight && <p className="mt-1 text-xs font-semibold text-red-500">{qaErrors.tier2_weight}</p>}</div>
            <Select value={qaForm.quality_score} onValueChange={(v) => setQaForm({ ...qaForm, quality_score: v })}>
              <SelectTrigger><SelectValue placeholder="Quality grade" /></SelectTrigger>
              <SelectContent><SelectItem value="A">Grade A</SelectItem><SelectItem value="B">Grade B</SelectItem><SelectItem value="C">Grade C</SelectItem><SelectItem value="reject">Reject</SelectItem></SelectContent>
            </Select>
            <div className="rounded-xl border border-border/60 p-3"><p className="text-sm">Contamination: <strong>{(contaminationRatio * 100).toFixed(2)}%</strong></p><p className="mt-1 text-xs text-muted-foreground">Accepted weight: {Number(qaForm.tier2_weight || 0).toLocaleString()} kg</p></div>
            <Button className="w-full rounded-xl bg-gradient-primary text-white" onClick={submitQuality}>Save Quality Check</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspection Dialog */}
      <Dialog open={!!inspectData} onOpenChange={() => setInspectData(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Inspect Pickup #{inspectData?.pickup?.id}</DialogTitle></DialogHeader>
          {inspectData && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Material:</span> <strong>{inspectData.pickup?.contract?.commodity?.title || '—'}</strong></div>
                <div><span className="text-muted-foreground">Weight:</span> <strong>{Number(inspectData.pickup?.estimated_weight || 0).toLocaleString()} kg</strong></div>
                <div><span className="text-muted-foreground">Driver:</span> <strong>{inspectData.pickup?.driver?.user ? `${inspectData.pickup.driver.user.fname} ${inspectData.pickup.driver.user.lname}` : '—'}</strong></div>
                <div><span className="text-muted-foreground">Supplier:</span> <strong>{inspectData.pickup?.supplier?.user ? `${inspectData.pickup.supplier.user.fname} ${inspectData.pickup.supplier.user.lname}` : '—'}</strong></div>
                <div><span className="text-muted-foreground">Assigned Hub:</span> <strong>{inspectData.pickup?.hub?.location || '—'}</strong></div>
                <div><span className="text-muted-foreground">Delivered to:</span> <strong>{inspectData.delivered_to_hub?.location || inspectData.pickup?.hub?.location || 'Same hub'}</strong></div>
              </div>
              {inspectData.pickup?.proof_note && (
                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-xs font-semibold mb-1">Driver Proof Note</p>
                  <p className="text-xs text-muted-foreground">{inspectData.pickup.proof_note}</p>
                </div>
              )}
              {inspectData.pickup?.photos?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1">Load Photos ({inspectData.pickup.photos.length})</p>
                  <div className="flex gap-2 flex-wrap">
                    {inspectData.pickup.photos.map((ph) => (
                      <Badge key={ph.id} variant="outline" className="text-xs">Photo #{ph.id}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3">
                <p className="text-xs text-emerald-300">Inspected at: {inspectData.inspected_at} · By manager #{inspectData.inspected_by}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
