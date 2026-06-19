import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/shared/Navbar';
import StatCard from '@/components/shared/StatCard';
import PaginatedList from '@/components/shared/PaginatedList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, MapPin, CheckCircle2, Clock, RefreshCw, Play, Scale, AlertTriangle, Camera } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { platformV1 } from '@/services/platformV1Service';
import { useToast } from '@/components/ui/use-toast';
import { getFriendlyError } from '@/lib/friendlyErrors';

function statusClass(status = '') {
  const s = String(status).toLowerCase();
  if (['completed', 'processing'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['scheduled'].includes(s)) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (['in_progress'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['cancelled', 'rejected'].includes(s)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export default function Driver() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [proof, setProof] = useState({});
  const [availableHubs, setAvailableHubs] = useState([]);

  const activePickups = pickups.filter(p => ['scheduled', 'in_progress'].includes(String(p.status).toLowerCase()));
  const historyPickups = pickups.filter(p => !['scheduled', 'in_progress'].includes(String(p.status).toLowerCase()));

  const canAccess = currentUser && currentUser.role === 'driver';

  async function loadDriverData() {
    if (!canAccess) return;
    setLoading(true);
    try {
      const [data, hubsResponse] = await Promise.all([
        platformV1.driver.pickups(),
        platformV1.driver.availableHubs().catch(() => ({ data: [] })),
      ]);
      setPickups(Array.isArray(data) ? data : []);
      const hubs = hubsResponse?.data || hubsResponse || [];
      setAvailableHubs(Array.isArray(hubs) ? hubs : []);
    } catch (error) {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive', duration: 4000 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDriverData(); }, [currentUser?.platformId]);

  const stats = useMemo(() => ({
    active: pickups.filter(p => ['scheduled', 'in_progress'].includes(String(p.status).toLowerCase())).length,
    completed: pickups.filter(p => ['completed', 'processing'].includes(String(p.status).toLowerCase())).length,
    total: pickups.length,
    kg: pickups.reduce((s, p) => s + Number(p.estimated_weight || 0), 0),
  }), [pickups]);

  function setProofValue(id, patch) {
    setProof((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }

  async function runAction(title, action) {
    try {
      await action();
      toast({ title, description: 'The mission was updated successfully.', duration: 4000 });
      await loadDriverData();
    } catch (error) {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive', duration: 4000 });
    }
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Please log in as Driver to access this page.</p>
          <Button onClick={() => navigate('/login')} className="bg-gradient-wine text-white">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold">Driver Mission Board</h1>
            <p className="text-sm text-muted-foreground">Every action updates the platform and refreshes the live mission list.</p>
          </div>
          <Button variant="outline" onClick={loadDriverData} disabled={loading}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Active Missions" value={stats.active} icon={Clock} />
          <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} />
          <StatCard title="Total Trips" value={stats.total} icon={Truck} />
          <StatCard title="Scheduled Kg" value={`${stats.kg.toLocaleString()}kg`} icon={Scale} />
        </div>

        <Tabs defaultValue="missions" className="space-y-4">
          <TabsList className="bg-muted rounded-xl p-1"><TabsTrigger value="missions" className="rounded-lg text-xs">Live Missions</TabsTrigger><TabsTrigger value="history" className="rounded-lg text-xs">Completed / Processing</TabsTrigger></TabsList>

          <TabsContent value="missions" className="space-y-4">
            <PaginatedList items={activePickups} empty={<Card className="p-12 text-center"><p className="text-muted-foreground">No active missions assigned right now.</p></Card>}>
            {(p) => {
              const local = proof[p.id] || {};
              const assignedHub = p.hub;
              return (
                <Card key={p.id} className="overflow-hidden">
                  <div className="h-1.5 bg-gradient-wine" />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-sm">Pickup #{p.id} · {p.contract?.commodity?.title || 'Material'}</h3>
                        <p className="text-xs text-muted-foreground">Supplier: {p.supplier?.user ? `${p.supplier.user.fname} ${p.supplier.user.lname}` : `supplier #${p.supplier_user_id}`} · {Number(p.estimated_weight || 0).toLocaleString()}kg</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> Hub: {assignedHub?.location || 'assigned hub'} · {p.schedule_date?.slice(0, 10)}</p>
                      </div>
                      <Badge className={statusClass(p.status)}>{p.status}</Badge>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 rounded-xl border border-border/60 p-3">
                      <div><p className="text-xs font-semibold mb-1">Proof note</p><Textarea rows={2} value={local.note || ''} onChange={(e) => setProofValue(p.id, { note: e.target.value })} placeholder="Loaded clean material, supplier signed..." /></div>
                      <div><p className="text-xs font-semibold mb-1">Actual / estimated weight</p><Input type="number" value={local.weight || p.estimated_weight || ''} onChange={(e) => setProofValue(p.id, { weight: e.target.value })} /></div>
                      <div><p className="text-xs font-semibold mb-1">Problem report</p><Textarea rows={2} value={local.problem || ''} onChange={(e) => setProofValue(p.id, { problem: e.target.value })} placeholder="Optional issue" /></div>
                    </div>

                    {/* Hub selection for completion */}
                    {p.status === 'in_progress' && p.departed_to_hub_at && (
                      <div className="rounded-xl border border-border/60 p-3">
                        <p className="text-xs font-semibold mb-2">Deliver to Hub</p>
                        <Select
                          value={String(local.selectedHubId || p.hub_id || '')}
                          onValueChange={(v) => setProofValue(p.id, { selectedHubId: Number(v) })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select delivery hub" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableHubs.map((hub) => (
                              <SelectItem key={hub.id} value={String(hub.id)}>
                                {hub.location || `Hub #${hub.id}`}
                                {hub.id === p.hub_id ? ' (originally assigned)' : ''}
                                {hub.manager?.user ? ` · Mgr: ${hub.manager.user.fname} ${hub.manager.user.lname}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {local.selectedHubId && local.selectedHubId !== p.hub_id && (
                          <p className="mt-1 text-xs text-amber-600 font-medium">⚠ Different from originally assigned hub</p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {p.status === 'scheduled' && <Button size="sm" onClick={() => runAction('Mission started', () => platformV1.driver.start(p.id))} className="bg-gradient-wine text-white"><Play className="w-3 h-3 mr-1" /> Start</Button>}
                      {p.status === 'in_progress' && <Button size="sm" variant="outline" onClick={() => runAction('Weight recorded', () => platformV1.driver.recordWeight(p.id, Number(local.weight || p.estimated_weight || 1)))}><Scale className="w-3 h-3 mr-1" /> Record Weight</Button>}
                      {p.status === 'in_progress' && (
                        <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent">
                          <Camera className="w-3 h-3 mr-1" /> Upload Proof
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) runAction('Proof photo uploaded', () => platformV1.driver.uploadPhoto(p.id, file)); }} />
                        </label>
                      )}
                      {p.status === 'in_progress' && !p.departed_to_hub_at && <Button size="sm" variant="outline" onClick={() => runAction('Departed to hub', () => platformV1.driver.departToHub(p.id))}><Truck className="w-3 h-3 mr-1" /> Depart to Hub</Button>}
                      {p.status === 'in_progress' && <Button size="sm" disabled={!p.departed_to_hub_at} onClick={() => {
                        const selectedHub = local.selectedHubId || p.hub_id;
                        runAction('Pickup completed', () => platformV1.driver.complete(p.id, {
                          proof_note: local.note || 'Driver confirmed delivery to hub with photo proof.',
                          delivered_to_hub_id: selectedHub,
                        }));
                      }} className="bg-emerald-600 text-white"><CheckCircle2 className="w-3 h-3 mr-1" /> Complete at Hub</Button>}
                      {local.problem && <Button size="sm" variant="outline" onClick={() => runAction('Problem reported', () => platformV1.driver.reportProblem(p.id, { problem_type: 'driver_note', description: local.problem }))}><AlertTriangle className="w-3 h-3 mr-1" /> Report Problem</Button>}
                      <Badge variant="outline" className="gap-1"><Camera className="w-3 h-3" /> Photo + note required before completion</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            }}
            </PaginatedList>
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            <PaginatedList items={historyPickups} empty={<Card className="p-12 text-center"><p className="text-muted-foreground">No completed missions yet.</p></Card>}>
              {(p) => <Card key={p.id}><CardContent className="p-4 flex justify-between"><div><p className="font-semibold text-sm">Pickup #{p.id}</p><p className="text-xs text-muted-foreground">{p.contract?.commodity?.title || 'Material'} · {Number(p.estimated_weight || 0).toLocaleString()}kg</p></div><Badge className={statusClass(p.status)}>{p.status}</Badge></CardContent></Card>}
            </PaginatedList>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

