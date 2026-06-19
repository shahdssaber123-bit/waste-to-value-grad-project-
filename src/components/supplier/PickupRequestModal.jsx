import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { platformV1 } from '@/services/platformV1Service';

export default function PickupRequestModal({ open, onClose, onCreated }) {
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({ commodity_id: '', estimated_weight: '', schedule_date: '', location: '', condition: 'Clean', contamination: 0, notes: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    platformV1.supplier.materials().then((items) => {
      setMaterials(Array.isArray(items) ? items : []);
      const first = items?.[0];
      if (first && !form.commodity_id) setForm((f) => ({ ...f, commodity_id: String(first.commodity_id || first.commodity?.id || '') }));
    }).catch(() => setMaterials([]));
  }, [open]);

  const submit = async () => {
    setLoading(true);
    try {
      const selected = materials.find((m) => String(m.commodity_id || m.commodity?.id) === String(form.commodity_id));
      await platformV1.supplier.requestPickup({
        ...form,
        commodity_id: form.commodity_id ? Number(form.commodity_id) : undefined,
        material: selected?.commodity?.title,
        estimated_weight: Number(form.estimated_weight),
        contamination: Number(form.contamination || 0),
      });
      onCreated?.();
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Request Pickup from Database Contract</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Material</Label><Select value={form.commodity_id} onValueChange={(v) => setForm({ ...form, commodity_id: v })}><SelectTrigger><SelectValue placeholder="Select contracted material" /></SelectTrigger><SelectContent>{materials.map((m) => <SelectItem key={m.id} value={String(m.commodity_id || m.commodity?.id)}>{m.commodity?.title || m.material_type || `Material #${m.commodity_id}`}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Weight kg</Label><Input type="number" value={form.estimated_weight} onChange={(e) => setForm({ ...form, estimated_weight: e.target.value })} /></div><div><Label>Date</Label><Input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} /></div></div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Condition</Label><Input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} /></div><div><Label>Contamination %</Label><Input type="number" value={form.contamination} onChange={(e) => setForm({ ...form, contamination: e.target.value })} /></div></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button disabled={loading || !form.estimated_weight || !form.schedule_date} onClick={submit} className="w-full bg-gradient-wine text-white">Submit DB Pickup Request</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
