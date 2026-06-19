import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/shared/Navbar';
import StatCard from '@/components/shared/StatCard';
import PaginatedList from '@/components/shared/PaginatedList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CheckCircle2, Clock, Send, RefreshCw, FileText, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { platformV1 } from '@/services/platformV1Service';
import { useToast } from '@/components/ui/use-toast';
import { getFriendlyError } from '@/lib/friendlyErrors';

function statusClass(status = '') {
  const s = String(status).toLowerCase();
  if (['completed', 'processing', 'quality_checked', 'active'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['scheduled', 'in_progress', 'requested'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['cancelled', 'rejected', 'terminated'].includes(s)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

const SYSTEM_COMMODITIES = [
  { id: 1, title: 'PET Plastic' }, { id: 2, title: 'HDPE Plastic' }, { id: 3, title: 'Cardboard' },
  { id: 4, title: 'Aluminum' }, { id: 5, title: 'Glass' }, { id: 6, title: 'Mixed Paper' },
  { id: 7, title: 'Organic Waste' }, { id: 8, title: 'LDPE Film' }, { id: 9, title: 'PP Plastic' },
  { id: 10, title: 'PVC Plastic' }, { id: 11, title: 'Mixed Plastic' }, { id: 12, title: 'Office Paper' },
  { id: 13, title: 'Newspaper' }, { id: 14, title: 'Steel Cans' }, { id: 15, title: 'Copper Scrap' },
  { id: 16, title: 'Glass Clear' }, { id: 17, title: 'Glass Mixed' }, { id: 18, title: 'Textile Waste' },
  { id: 19, title: 'Wood Pallets' }, { id: 20, title: 'Food Waste' }, { id: 21, title: 'Used Cooking Oil' },
  { id: 22, title: 'E-Waste Small Devices' }, { id: 23, title: 'Battery Scrap' }, { id: 24, title: 'Rubber Waste' },
  { id: 25, title: 'Tire Shreds' }, { id: 26, title: 'Construction Plastic' }, { id: 27, title: 'Agricultural Film' },
  { id: 28, title: 'Carton Drink Packs' }, { id: 29, title: 'Metal Bottle Caps' }, { id: 30, title: 'Foam Packaging' },
  { id: 31, title: 'Compostable Bags' }, { id: 32, title: 'Mixed Recyclables' },
];

export default function Supplier() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [allCommodities, setAllCommodities] = useState(SYSTEM_COMMODITIES);
  const [pickups, setPickups] = useState([]);
  const [showPickup, setShowPickup] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ commodity_id: '', estimated_weight: '', schedule_date: '', location: '', condition: '', contamination: '', notes: '' });

  const canAccess = currentUser && currentUser.role === 'supplier';

  async function loadSupplierData() {
    if (!canAccess) return;
    setLoading(true);
    try {
      const [materialsRes, pickupsRes, commoditiesRes] = await Promise.allSettled([
        platformV1.supplier.materials(),
        platformV1.supplier.pickups(),
        platformV1.marketplace.materials(),
      ]);
      if (materialsRes.status === 'fulfilled') setMaterials(Array.isArray(materialsRes.value) ? materialsRes.value : []);
      if (pickupsRes.status === 'fulfilled') setPickups(Array.isArray(pickupsRes.value) ? pickupsRes.value : []);
      if (commoditiesRes.status === 'fulfilled') {
        const raw = Array.isArray(commoditiesRes.value) ? commoditiesRes.value : [];
        // Deduplicate marketplace items by commodity_id and extract id+title
        const seen = new Set();
        const deduped = [];
        for (const item of raw) {
          const cid = item.commodity_id || item.id;
          if (!seen.has(cid)) { seen.add(cid); deduped.push({ id: cid, title: item.material || item.title || `Material #${cid}` }); }
        }
        // Merge with system fallback list so we never miss any
        const mergedMap = new Map(SYSTEM_COMMODITIES.map(c => [c.id, c]));
        deduped.forEach(c => mergedMap.set(Number(c.id) || c.id, c));
        setAllCommodities([...mergedMap.values()].sort((a, b) => String(a.title).localeCompare(String(b.title))));
      }
    } catch (error) {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive', duration: 4000 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSupplierData(); }, [currentUser?.platformId]);

  const totals = useMemo(() => {
    const active = pickups.filter(p => ['scheduled', 'in_progress'].includes(String(p.status).toLowerCase())).length;
    const completed = pickups.filter(p => ['completed', 'processing'].includes(String(p.status).toLowerCase())).length;
    const kg = pickups.reduce((s, p) => s + Number(p.estimated_weight || 0), 0);
    return { active, completed, kg };
  }, [pickups]);

  async function submitPickup() {
    try {
      await platformV1.supplier.requestPickup({
        commodity_id: form.commodity_id ? Number(form.commodity_id) : undefined,
        material: allCommodities.find(m => String(m.id) === String(form.commodity_id))?.title
          || materials.find(m => String(m.commodity_id || m.commodity?.id) === String(form.commodity_id))?.commodity?.title,
        estimated_weight: Number(form.estimated_weight),
        schedule_date: form.schedule_date,
        location: form.location,
        condition: form.condition,
        contamination: form.contamination ? Number(form.contamination) : undefined,
        notes: form.notes,
      });
      toast({ title: 'Pickup request sent', description: 'Operations can now see and process your request.', duration: 4000 });
      setShowPickup(false);
      setForm({ commodity_id: '', estimated_weight: '', schedule_date: '', location: '', condition: '', contamination: '', notes: '' });
      await loadSupplierData();
    } catch (error) {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive', duration: 4000 });
    }
  }

  async function sendMessage() {
    try {
      await platformV1.supplier.messageAdmin(message);
      toast({ title: 'Message sent', description: 'The operations team can review your message.', duration: 4000 });
      setMessage('');
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
          <p className="text-muted-foreground mb-4">Please log in as Supplier to access this page.</p>
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
            <h1 className="font-heading text-2xl font-bold">Supplier Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live pickup requests, contracts, quality feedback, and messages.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSupplierData} disabled={loading}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
            <Button onClick={() => setShowPickup(true)} className="bg-gradient-wine text-white"><Send className="w-4 h-4 mr-2" /> New Pickup Request</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="My Materials" value={materials.length} icon={Package} />
          <StatCard title="Active Pickups" value={totals.active} icon={Clock} />
          <StatCard title="Completed" value={totals.completed} icon={CheckCircle2} />
          <StatCard title="Total Scheduled Kg" value={`${totals.kg.toLocaleString()}kg`} icon={Truck} />
        </div>

        <Tabs defaultValue="pickups" className="space-y-4">
          <TabsList className="bg-muted rounded-xl p-1 flex-wrap h-auto">
            <TabsTrigger value="pickups" className="rounded-lg text-xs">Live Pickups</TabsTrigger>
            <TabsTrigger value="materials" className="rounded-lg text-xs">My Contracted Materials</TabsTrigger>
            <TabsTrigger value="messages" className="rounded-lg text-xs">Message Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="pickups">
            <Card>
              <CardHeader><CardTitle className="text-base">Saved pickup requests</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <PaginatedList items={pickups} empty={<p className="text-sm text-muted-foreground">No pickup requests yet. Create your first request.</p>}>
                  {(p) => (
                  <div key={p.id} className="rounded-xl border border-border/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">Pickup #{p.id} · {p.contract?.commodity?.title || 'Material'}</p>
                      <p className="text-xs text-muted-foreground">Hub: {p.hub?.location || 'Pending hub'} · Date: {p.schedule_date?.slice(0, 10)} · Weight: {Number(p.estimated_weight || 0).toLocaleString()}kg</p>
                    </div>
                    <Badge className={statusClass(p.status)}>{p.status}</Badge>
                  </div>
                  )}
                </PaginatedList>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <PaginatedList items={materials} className="grid md:grid-cols-2 gap-4" empty={<Card className="p-8 text-center text-sm text-muted-foreground">No contracted materials yet.</Card>}>
              {(contract) => (
                <Card key={contract.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{contract.commodity?.title || contract.material_type || `Material #${contract.commodity_id}`}</p>
                        <p className="text-xs text-muted-foreground mt-1">Contract #{contract.id} · status: {contract.status}</p>
                        <p className="text-xs text-muted-foreground">Current price: ${contract.commodity?.current_price?.price || contract.price_per_unit || '—'}</p>
                      </div>
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </PaginatedList>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardContent className="p-5 space-y-3">
                <Label>Send message to operations</Label>
                <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write any issue, pickup note, or material update..." />
                <Button onClick={sendMessage} disabled={!message.trim()} className="bg-gradient-wine text-white"><MessageSquare className="w-4 h-4 mr-2" /> Send Message</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPickup} onOpenChange={setShowPickup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Pickup Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Material *</Label>
              <Select value={form.commodity_id} onValueChange={(v) => setForm({ ...form, commodity_id: v })}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select material type" /></SelectTrigger>
                <SelectContent>
                  {allCommodities.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Estimated quantity (kg) *</Label><Input type="number" value={form.estimated_weight} onChange={(e) => setForm({ ...form, estimated_weight: e.target.value })} /></div>
              <div><Label className="text-xs">Pickup date *</Label><Input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Condition</Label><Input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} placeholder="Clean / Mixed / Wet" /></div>
              <div><Label className="text-xs">Contamination %</Label><Input type="number" value={form.contamination} onChange={(e) => setForm({ ...form, contamination: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Pickup address" /></div>
            <div><Label className="text-xs">Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={submitPickup} disabled={loading} className="w-full bg-gradient-wine text-white"><Send className="w-4 h-4 mr-2" /> Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
