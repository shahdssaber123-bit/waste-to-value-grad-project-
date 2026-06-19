import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Printer, Receipt, ClipboardCheck, Truck, Leaf, PackageCheck, BarChart3, Route, Factory, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { platformV1 } from '@/services/platformV1Service';

const reportTypes = [
  { key: 'invoice', title: 'Factory Invoice', icon: Receipt, accent: 'emerald', purpose: 'Official billing after delivery confirmation' },
  { key: 'pickup', title: 'Pickup Receipt', icon: Truck, accent: 'teal', purpose: 'Supplier handoff receipt with driver and truck data' },
  { key: 'quality', title: 'Quality Check Report', icon: ClipboardCheck, accent: 'amber', purpose: 'Accepted/rejected weight, grade and contamination' },
  { key: 'delivery', title: 'Delivery Note', icon: PackageCheck, accent: 'blue', purpose: 'Outbound delivery document for factory receiving' },
  { key: 'contract', title: 'Contract Summary', icon: ShieldCheck, accent: 'slate', purpose: 'Printable agreement overview and SLA terms' },
  { key: 'inventory', title: 'Inventory Report', icon: BarChart3, accent: 'violet', purpose: 'Hub stock, reservations and low stock alerts' },
  { key: 'impact', title: 'Environmental Impact Report', icon: Leaf, accent: 'green', purpose: 'CO₂ saved, landfill avoided and recycled kg' },
  { key: 'trip', title: 'Driver Trip Sheet', icon: Route, accent: 'orange', purpose: 'Daily driver route with task checklist' },
  { key: 'supplier', title: 'Supplier Performance Report', icon: FileText, accent: 'pink', purpose: 'Quality, earnings and rejected percentage' },
  { key: 'factory', title: 'Factory Purchase Summary', icon: Factory, accent: 'cyan', purpose: 'Purchases, invoices, delivered materials and payments' },
];

function currency(value) { return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }

export default function PrintableReportsPanel() {
  const [records, setRecords] = useState({ users: [], hubs: [], trucks: [], contracts: [], invoices: [], outbound: [], pickups: [], commodities: [] });

  useEffect(() => {
    let cancelled = false;
    async function loadReportsData() {
      const calls = await Promise.allSettled([
        platformV1.users.list(),
        platformV1.hubs.list(),
        platformV1.trucks.list(),
        platformV1.contracts.list(),
        platformV1.invoices.list(),
        platformV1.outbound.list(),
        platformV1.pickups.list(),
        platformV1.commodities.list(),
      ]);
      if (cancelled) return;
      const keys = ['users', 'hubs', 'trucks', 'contracts', 'invoices', 'outbound', 'pickups', 'commodities'];
      const next = { users: [], hubs: [], trucks: [], contracts: [], invoices: [], outbound: [], pickups: [], commodities: [] };
      calls.forEach((result, index) => {
        if (result.status === 'fulfilled') next[keys[index]] = Array.isArray(result.value) ? result.value : (result.value?.data || []);
      });
      setRecords(next);
    }
    loadReportsData();
    return () => { cancelled = true; };
  }, []);

  const factoryInvoices = useMemo(() => records.invoices.filter((i) => i.party_type === 'factory'), [records.invoices]);
  const supplierInvoices = useMemo(() => records.invoices.filter((i) => i.party_type === 'supplier'), [records.invoices]);
  const firstFactoryInvoice = factoryInvoices[0] || {};
  const firstSupplierInvoice = supplierInvoices[0] || {};
  const firstOp = records.pickups[0] || {};
  const firstQa = firstOp.inbound_record || {};
  const totalKg = records.outbound.reduce((s, x) => s + Number(x.quantity_kg || 0), 0) + records.pickups.reduce((s, x) => s + Number(x.estimated_weight || 0), 0);
  const co2 = Math.round(totalKg * 1.7);

  const printReport = (type) => {
    const report = reportTypes.find((r) => r.key === type);
    const rows = {
      invoice: [
        ['Invoice No.', firstFactoryInvoice.id || 'FI-2026-001'], ['Factory', records.users.find((u) => u.role === 'factory' || u.role === 'industry')?.company || 'GreenPack Industries'], ['Material', firstFactoryInvoice.commodity || 'HDPE Plastic'], ['Accepted Weight', `${firstFactoryInvoice.acceptedWeight || 2400} kg`], ['Unit Price', currency(firstFactoryInvoice.unitPrice || 0.88)], ['Total', currency(firstFactoryInvoice.total || 2112)], ['Status', firstFactoryInvoice.status || 'pending'],
      ],
      pickup: [['Pickup ID', firstOp.id || 'OP-001'], ['Supplier', firstOp.supplierName || 'EcoWaste Solutions'], ['Driver', firstOp.driverName || 'Omar Hassan'], ['Truck', records.trucks[0]?.plate || 'ABC-1234'], ['Material', firstOp.material || 'PET Plastic'], ['Expected Weight', `${firstOp.weight || 2500} kg`], ['Current Stage', firstOp.stage || 'Completed']],
      quality: [['Report ID', firstQa.id || 'QA-001'], ['Operation', firstQa.operationId || 'OP-001'], ['Hub', records.hubs[0]?.name || 'Cairo Circular Hub'], ['Accepted Weight', `${firstQa.acceptedWeight || 2380} kg`], ['Rejected Weight', `${firstQa.rejectedWeight || 70} kg`], ['Contamination', `${firstQa.contaminationPct || 2.86}%`], ['Final Grade', 'A']],
      delivery: [['Delivery Note', records.outbound[0]?.deliveryNote || 'DN-001'], ['Factory', records.users.find((u) => u.role === 'factory' || u.role === 'industry')?.company || 'GreenPack Industries'], ['Material', records.outbound[0]?.material || 'HDPE Plastic'], ['Allocated Qty', `${records.outbound[0]?.allocatedQty || 2400} kg`], ['ETA', records.outbound[0]?.eta || 'Tomorrow 11:30'], ['Status', records.outbound[0]?.status || 'en route']],
      contract: [['Contract ID', records.contracts[0]?.id || 'CON-1001'], ['Account Type', records.contracts[0]?.accountType || 'supplier'], ['Status', records.contracts[0]?.status || 'active'], ['Monthly Quantity', `${records.contracts[0]?.monthlyQuantity || 22000} kg`], ['SLA', records.contracts[0]?.slaSchedule || 'Mon/Wed/Fri'], ['Materials', (records.contracts[0]?.materialTypes || ['PET Plastic']).join(', ')]],
      inventory: [['Hub', records.hubs[0]?.name || 'Main Hub'], ['Total Stock', `${totalKg} kg`], ['Reserved Items', records.outbound.filter((d) => ['scheduled','shipped'].includes(String(d.status).toLowerCase())).length], ['Low Stock Alerts', records.hubs.length], ['Batches', records.commodities.length], ['Top Material', records.commodities[0]?.title || 'PET Plastic']],
      impact: [['Recycled Materials', `${totalKg} kg`], ['CO₂ Saved', `${co2} kg CO₂e`], ['Landfill Avoided', `${Math.round(totalKg * 0.92)} kg`], ['Trees Equivalent', Math.round(co2 / 22)], ['Completed Pickups', records.pickups.filter((o) => o.status === 'completed').length], ['Recovery Rate', '94%']],
      trip: [['Driver', records.users.find((u) => u.employee?.role === 'driver' || u.role === 'driver')?.name || 'Omar Hassan'], ['Truck', records.trucks[0]?.plate || 'ABC-1234'], ['Pickup Address', firstOp.location || 'Industrial Zone'], ['Supplier', firstOp.supplierName || 'EcoWaste Solutions'], ['Checklist', 'Arrived / Collected / Proof Uploaded / Delivered'], ['Emergency Contact', '+20 100 000 0000']],
      supplier: [['Supplier', records.users.find((u) => u.role === 'supplier')?.company || 'EcoWaste Solutions'], ['Completed Pickups', records.pickups.filter((o) => o.status === 'completed').length], ['Total Earnings', currency(firstSupplierInvoice.total || 1404.2)], ['Average Quality', 'A-'], ['Rejected %', '3.4%'], ['Performance Score', '92/100']],
      factory: [['Factory', records.users.find((u) => u.role === 'factory' || u.role === 'industry')?.company || 'GreenPack Industries'], ['Reservations', records.outbound.filter((d) => ['scheduled','shipped'].includes(String(d.status).toLowerCase())).length], ['Deliveries', records.outbound.length], ['Invoice Total', currency(factoryInvoices.reduce((s, x) => s + Number(x.total_amount || x.total || 0), 0))], ['Preferred Material', 'HDPE Plastic'], ['Payment Status', 'Healthy']],
    }[type];

    const html = `<!doctype html><html><head><title>${report.title}</title><style>
      body{font-family:Arial,sans-serif;margin:0;background:#f4faf7;color:#122018}.sheet{max-width:860px;margin:28px auto;background:white;border-radius:24px;padding:34px;box-shadow:0 20px 60px rgba(15,80,55,.15)}
      .brand{display:flex;gap:14px;align-items:center;border-bottom:2px solid #e6f4ed;padding-bottom:20px;margin-bottom:22px}.logo{width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,#10b981,#0f766e,#0f172a);color:white;display:flex;align-items:center;justify-content:center;font-size:28px}.name{font-size:28px;font-weight:900}.tag{font-size:11px;letter-spacing:4px;color:#059669;font-weight:800;text-transform:uppercase}.pill{display:inline-block;background:#dcfce7;color:#166534;padding:7px 12px;border-radius:999px;font-size:12px;font-weight:800;margin-bottom:18px}.title{font-size:30px;font-weight:900;margin:0 0 6px}.sub{color:#64748b;margin:0 0 24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.row{border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#fbfefd}.label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:800}.value{font-size:17px;font-weight:800;margin-top:6px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:40px}.line{border-top:1px solid #94a3b8;padding-top:8px;color:#64748b}.footer{margin-top:28px;border-top:1px solid #e2e8f0;padding-top:14px;font-size:12px;color:#64748b}@media print{body{background:white}.sheet{box-shadow:none;margin:0;max-width:none;border-radius:0}.no-print{display:none}}
    </style></head><body><div class="sheet"><div class="brand"><div class="logo">♻</div><div><div class="name">Waste to Value</div><div class="tag">Circular Economy Platform</div></div></div><span class="pill">Official Printable Document</span><h1 class="title">${report.title}</h1><p class="sub">${report.purpose} · Generated ${new Date().toLocaleString()}</p><div class="grid">${rows.map(([a,b]) => `<div class="row"><div class="label">${a}</div><div class="value">${b}</div></div>`).join('')}</div><div class="sign"><div class="line">Authorized Platform Signature</div><div class="line">Receiver / Client Signature</div></div><div class="footer">This document was generated by Waste to Value platform. Turning waste into verified operational, financial and environmental value.</div><button class="no-print" onclick="window.print()" style="margin-top:20px;padding:12px 18px;border:0;border-radius:12px;background:#059669;color:white;font-weight:800">Print Now</button></div><script>setTimeout(()=>window.print(),300)</script></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5 text-emerald-600" /> Printable Business Documents</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">These printable reports make the platform look like a real operating system: invoices, pickup receipts, quality reports, delivery notes, contracts, inventory, impact, trip sheets, supplier performance and factory purchase summaries.</p></CardContent>
        </Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Ready Documents</p><p className="text-4xl font-black text-emerald-600">10</p><p className="text-xs text-muted-foreground">Each one includes branding, signatures and print layout.</p></CardContent></Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.key} className="group border-border/70 transition-all hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><report.icon className="h-5 w-5" /></div>
                <Badge variant="outline">Printable</Badge>
              </div>
              <div><h3 className="font-heading text-base font-bold">{report.title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.purpose}</p></div>
              <Button onClick={() => printReport(report.key)} className="w-full rounded-xl bg-gradient-primary text-white"><Printer className="mr-2 h-4 w-4" /> Print / Export</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
