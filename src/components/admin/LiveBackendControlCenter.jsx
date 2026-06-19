import React, { useEffect, useMemo, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  RefreshCw, UserPlus, Trash2, CheckCircle2, XCircle, PackagePlus,
  Truck, Warehouse, FileText, Plus, Eye, Building2, Send, Printer,
  BadgeDollarSign, Loader2, ChevronLeft, ChevronRight,
  LayoutGrid, Users, ClipboardList, CreditCard, Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { platformV1 } from '@/services/backendV1Service';
import AdminCharts from '@/components/admin/AdminCharts';

const initialState = {
  users: [], applications: [], commodities: [], hubs: [], trucks: [],
  contracts: [], pickups: [], invoices: [], outbound: [], notifications: [],
  materialRequests: [], adminMessages: []
};

const HIDDEN_PROFILE_KEYS = new Set([
  'api_endpoint', 'endpoint', 'route', 'url', 'uri', 'href', 'link',
  'path', 'api_path', 'api_url', 'full_url', 'web_url', 'display_url',
  'password', 'remember_token', 'token', 'access_token', 'refresh_token',
  'secret', 'api_key', 'idempotency_key', 'deleted_at', 'updated_at',
  'email_verified_at', 'pivot', 'laravel_through_key'
]);

function isUnsafeProfileKey(key = '') {
  const normalized = String(key).toLowerCase().trim();

  return (
    HIDDEN_PROFILE_KEYS.has(normalized) ||
    normalized.includes('api') ||
    normalized.includes('endpoint') ||
    normalized.includes('route') ||
    normalized.includes('url') ||
    normalized.includes('uri') ||
    normalized.includes('href') ||
    normalized.includes('link') ||
    normalized.includes('path') ||
    normalized.includes('token') ||
    normalized.includes('password') ||
    normalized.includes('secret') ||
    normalized.includes('key') ||
    normalized.includes('remember')
  );
}

function isSafePrimitive(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== '' &&
    typeof value !== 'object' &&
    typeof value !== 'function'
  );
}

function safeProfileEntries(item = {}) {
  return Object.entries(item || {}).filter(([key, value]) => {
    if (isUnsafeProfileKey(key)) return false;
    if (!isSafePrimitive(value)) return false;
    return true;
  });
}

function formatProfileLabel(key = '') {
  return String(key).replaceAll('_', ' ');
}

function safeErrorMessage(error, fallback = 'Action failed. Please try again.') {
  const raw = String(error?.message || error?.technicalMessage || fallback);

  if (raw.includes('/api/') || raw.includes('http://') || raw.includes('https://')) {
    return fallback;
  }

  return raw
    .replace(/\/api\/[^\s'"]+/g, '')
    .replace(/https?:\/\/[^\s'"]+/g, '')
    .replace(/endpoint|route|url|token|path/gi, 'request')
    .trim() || fallback;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function normalizeSnapshotPayload(snapshot) {
  const root = snapshot?.data?.data || snapshot?.data || snapshot || {};
  const normalized = { ...initialState };
  Object.keys(initialState).forEach(key => {
    normalized[key] = asArray(root[key]);
  });
  return normalized;
}

function normalizeMessage(message = {}) {
  const nested = typeof message.data === 'string'
    ? (() => { try { return JSON.parse(message.data); } catch { return {}; } })()
    : (message.data || {});
  return {
    ...message,
    sender_name: message.sender_name || nested.sender_name || nested.name || message.supplier_name,
    sender_email: message.sender_email || nested.sender_email || nested.email,
    message: message.message || nested.message || nested.question || message.body || message.content,
    status: message.status || (message.replied_at ? 'replied' : 'open'),
  };
}

function valueOf(item, keys, fallback = '—') {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, part) => acc?.[part], item);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function statusClass(status = '') {
  const s = String(status).toLowerCase();
  const successStates = ['active', 'completed', 'confirmed', 'paid', 'converted', 'approved', 'available', 'matched', 'matched_reserved', 'fulfilled', 'delivered'];
  const warningStates = ['pending', 'scheduled', 'draft', 'requested', 'in_progress', 'shipped', 'contacted'];
  const dangerStates = ['rejected', 'cancelled', 'overdue', 'maintenance', 'terminated'];

  if (successStates.includes(s)) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
  if (warningStates.includes(s)) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
  if (dangerStates.includes(s)) return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

// Improved MiniTable with better styling
function MiniTable({ title, description, items = [], columns, actions, empty, icon: Icon = FileText, onProfile, pageSize = 8 }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [items.length, page, totalPages]);

  if (items.length === 0) {
    return (
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            {title}
          </CardTitle>
          {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
        </CardHeader>
        <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <Icon className="h-12 w-12 opacity-30" />
            <p>{empty || 'No records yet.'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {title}
            </CardTitle>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {items.length} record{items.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {columns.map((c) => (
                  <th key={c.label} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleItems.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors duration-150">
                  {columns.map((c) => (
                    <td key={c.label} className="px-4 py-3 align-top text-slate-700 dark:text-slate-300">
                      {c.render ? c.render(item) : valueOf(item, c.keys || [c.key])}
                    </td>
                  ))}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onProfile?.(item, title)}
                        className="h-8 px-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {actions?.(item)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="h-8 gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {safePage + 1} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="h-8 gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function printProfile(title, item) {
  const fields = safeProfileEntries(item || {});
  const html = `<!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#f0fdf4;margin:0;color:#1a2e1f}
          .sheet{max-width:1000px;margin:40px auto;background:white;border-radius:32px;padding:40px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)}
          .brand{display:flex;gap:16px;align-items:center;border-bottom:2px solid #d1fae5;padding-bottom:20px;margin-bottom:28px}
          .logo{width:60px;height:60px;border-radius:20px;background:linear-gradient(135deg,#059669,#0f766e);display:flex;align-items:center;justify-content:center;color:white;font-size:28px}
          .name{font-size:28px;font-weight:800;letter-spacing:-0.5px}
          .tag{font-size:11px;letter-spacing:3px;color:#059669;font-weight:600;margin-top:4px}
          .title{font-size:32px;font-weight:800;margin:0 0 24px;letter-spacing:-0.5px}
          .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
          .row{border:1px solid #e2e8f0;border-radius:20px;padding:16px;background:#fefce8}
          .k{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:1px}
          .v{font-size:15px;font-weight:600;margin-top:8px;color:#0f172a}
          .footer{margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;text-align:center}
          @media print{body{background:white}.sheet{box-shadow:none;margin:0;max-width:none;padding:20px}}
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="brand">
            <div class="logo">♻</div>
            <div>
              <div class="name">Waste to Value</div>
              <div class="tag">CIRCULAR ECONOMY PLATFORM</div>
            </div>
          </div>
          <h1 class="title">${title} Profile</h1>
          <div class="grid">
            ${fields.map(([k, v]) => `<div class="row"><div class="k">${formatProfileLabel(k)}</div><div class="v">${String(v)}</div></div>`).join('')}
          </div>
          <div class="footer">Generated from live platform records • ${new Date().toLocaleString()}</div>
        </div>
        <script>window.print()</script>
      </body>
    </html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

function ProfileDialog({ profile, onClose }) {
  if (!profile) return null;
  const { item, title } = profile;
  const primitive = safeProfileEntries(item || {});

  return (
    <Dialog open={!!profile} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-emerald-600" />
            {title} Profile
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-5 border border-emerald-100 dark:border-emerald-800">
          <p className="font-bold text-lg text-slate-800 dark:text-slate-100">
            {item.company_name || item.factory_name || item.location || item.title || item.material || item.email || item.invoice_number || `#${item.id}`}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detailed record view with all attributes and related data</p>
          <Button className="mt-4 rounded-xl" variant="outline" onClick={() => printProfile(title, item)}>
            <Printer className="mr-2 h-4 w-4" /> Print Record
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 mt-4">
          {primitive.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/50">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{formatProfileLabel(k)}</p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 break-words mt-1">{String(v)}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Form section component for better organization

function uniqueById(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || item.id === undefined || item.id === null) return false;
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function locationLabel(location = {}) {
  return (
    location.label ||
    location.address ||
    location.pickup_address ||
    location.location ||
    location.city ||
    location.area ||
    location.name ||
    `Location #${location.id}`
  );
}

function supplierName(pickup = {}) {
  return (
    pickup.supplier?.company_name ||
    pickup.supplier?.user?.supplier?.company_name ||
    pickup.supplier?.user?.fname && `${pickup.supplier.user.fname} ${pickup.supplier.user.lname || ''}`.trim() ||
    pickup.supplier_name ||
    `Supplier #${pickup.supplier_user_id || pickup.id || ''}`
  );
}

function pickupSavedLocations(pickup = {}, loadedLocations = {}) {
  const fromCache = loadedLocations[pickup.supplier_user_id] || [];
  const nested = [
    ...(pickup.supplier?.locations || []),
    ...(pickup.supplier?.supplier_locations || []),
    ...(pickup.supplier?.user?.locations || []),
    ...(pickup.supplier?.user?.supplier_locations || []),
  ];
  const direct = [pickup.supplierLocation, pickup.supplier_location, pickup.location].filter(Boolean);
  return uniqueById([...fromCache, ...nested, ...direct]);
}

function FormSection({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
        <Plus className="h-4 w-4 text-emerald-600" />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function LivePlatformControlCenter() {
  const [data, setData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [supplierLocations, setSupplierLocations] = useState({});
  const [dispatchDrafts, setDispatchDrafts] = useState({});

  // Form states
  const [userForm, setUserForm] = useState({
    fname: 'New', lname: 'Supplier', email: `supplier${Date.now()}@wastetovalue.local`,
    phone: '+20 100 555 1234', role: 'supplier', employee_role: 'driver',
    company_name: 'New Supplier Company', commodity_id: '', password: 'Waste@2026'
  });
  const [materialForm, setMaterialForm] = useState({ title: 'Textile Waste' });
  const [priceForm, setPriceForm] = useState({ commodity_id: '', price: 4.5 });
  const [hubForm, setHubForm] = useState({ location: 'New Circular Hub', size_sq_meters: 1000, capacity: 50000 });
  const [truckForm, setTruckForm] = useState({ hub_id: '', payload_capacity: 2500, truck_type: 'Box Truck', plate_number: `WTX-${Math.floor(Math.random() * 9000 + 1000)}` });
  const [pickupForm, setPickupForm] = useState({ contract_id: '', hub_id: '', schedule_date: '', estimated_weight: 1000 });
  const [factoryRequestForm, setFactoryRequestForm] = useState({ commodity_id: '', preferred_grade: 'A', quantity_kg: 1200, preferred_delivery_date: '', company_details: 'Admin-created factory request', notes: 'Priority production requirement' });
  const [dispatchForm, setDispatchForm] = useState({ truck_id: '', driver_employee_id: '', supplier_location_id: '' });

  const supplierContracts = useMemo(() => data.contracts.filter(c => c.party_type === 'supplier' && c.status === 'active'), [data.contracts]);
  const drivers = useMemo(() => data.users.filter(u => (u.employee?.role || u.role) === 'driver'), [data.users]);
  const availableTrucks = useMemo(() => data.trucks.filter(t => String(t.status).toLowerCase() === 'available'), [data.trucks]);

  const loadSupplierLocations = useCallback(async (supplierUserId) => {
    if (!supplierUserId || supplierLocations[supplierUserId]) return supplierLocations[supplierUserId] || [];

    try {
      const locations = await platformV1.locations.list('supplier', supplierUserId);
      const normalized = Array.isArray(locations) ? locations : [];
      setSupplierLocations(old => ({ ...old, [supplierUserId]: normalized }));
      return normalized;
    } catch (error) {
      toast.error(safeErrorMessage(error, 'Could not load supplier locations.'));
      setSupplierLocations(old => ({ ...old, [supplierUserId]: [] }));
      return [];
    }
  }, [supplierLocations]);

  const getDispatchDraft = useCallback((pickup) => {
    const saved = dispatchDrafts[pickup.id] || {};
    const locations = pickupSavedLocations(pickup, supplierLocations);
    return {
      driver_employee_id: saved.driver_employee_id || pickup.driver_employee_id || dispatchForm.driver_employee_id || '',
      truck_id: saved.truck_id || pickup.truck_id || dispatchForm.truck_id || '',
      supplier_location_id: saved.supplier_location_id || pickup.supplier_location_id || locations[0]?.id || dispatchForm.supplier_location_id || '',
    };
  }, [dispatchDrafts, dispatchForm, supplierLocations]);

  const updateDispatchDraft = useCallback((pickupId, patch) => {
    setDispatchDrafts(old => ({
      ...old,
      [pickupId]: {
        ...(old[pickupId] || {}),
        ...patch,
      },
    }));
  }, []);


  const chartOperations = useMemo(() => [
    ...data.pickups.map(p => ({ material: p.contract?.commodity?.title || p.material_type || 'Pickup', stage: p.status || 'pickup', estQty: Number(p.estimated_weight || 0), actualQty: Number(p.actual_weight || p.estimated_weight || 0) })),
    ...data.materialRequests.map(r => ({ material: r.material || data.commodities.find(m => Number(m.id) === Number(r.commodity_id))?.title || 'Request', stage: r.status || 'requested', estQty: Number(r.quantity_kg || 0), actualQty: Number(r.quantity_kg || 0) })),
    ...data.outbound.map(d => ({ material: d.commodity?.title || data.commodities.find(m => Number(m.id) === Number(d.commodity_id))?.title || 'Outbound', stage: d.status || 'outbound', estQty: Number(d.quantity_kg || 0), actualQty: Number(d.quantity_kg || 0) })),
  ], [data.pickups, data.materialRequests, data.outbound, data.commodities]);

  const chartInventory = useMemo(() => data.commodities.map((m, idx) => ({
    material: m.title || `Material ${m.id}`,
    weight: data.materialRequests.filter(r => Number(r.commodity_id) === Number(m.id)).reduce((sum, r) => sum + Number(r.quantity_kg || 0), 0) || 1000 + idx * 350,
    purityGrade: idx % 3 === 0 ? 'A' : (idx % 3 === 1 ? 'B' : 'C'),
    dateAdded: new Date(Date.now() - (idx + 2) * 86400000).toISOString(),
    riskDate: new Date(Date.now() + (idx + 5) * 86400000).toISOString(),
  })), [data.commodities, data.materialRequests]);

  const loadAll = useCallback(async (options = {}) => {
    if (!options.quiet) setLoading(true);
    const toastId = toast.loading('Loading platform data...');
    try {
      const snapshot = await platformV1.adminLive.snapshot({ fresh: options.fresh ? 1 : undefined, limit: 200 });
      const next = normalizeSnapshotPayload(snapshot);
      next.adminMessages = next.adminMessages.map(normalizeMessage);
      setData(next);

      const firstCommodity = next.commodities[0]?.id || '';
      const firstHub = next.hubs[0]?.id || '';
      const firstSupplierContract = next.contracts.find(c => c.party_type === 'supplier' && c.status === 'active')?.id || '';
      const firstTruck = next.trucks.find(t => t.status === 'available')?.id || next.trucks[0]?.id || '';
      const firstDriver = next.users.find(u => u.employee?.role === 'driver')?.id || '';

      setUserForm(f => ({ ...f, commodity_id: f.commodity_id || firstCommodity }));
      setTruckForm(f => ({ ...f, hub_id: f.hub_id || firstHub }));
      setPickupForm(f => ({ ...f, contract_id: f.contract_id || firstSupplierContract, hub_id: f.hub_id || firstHub, schedule_date: f.schedule_date || new Date(Date.now() + 86400000).toISOString().slice(0, 16) }));
      setFactoryRequestForm(f => ({ ...f, commodity_id: f.commodity_id || firstCommodity, preferred_delivery_date: f.preferred_delivery_date || new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10) }));
      setPriceForm(f => ({ ...f, commodity_id: f.commodity_id || firstCommodity }));
      setDispatchForm(f => ({ ...f, truck_id: f.truck_id || firstTruck, driver_employee_id: f.driver_employee_id || firstDriver, supplier_location_id: f.supplier_location_id || '' }));

      toast.success('Data loaded successfully', { id: toastId });
    } catch (error) {
      toast.error(safeErrorMessage(error, 'Failed to load platform data'), { id: toastId });
    } finally {
      if (!options.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Locations are loaded only when needed to avoid repeated network loops.


  const runAction = useCallback(async (label, action, confirmText = null) => {
    if (confirmText && !window.confirm(confirmText)) return;

    const loadingId = toast.loading(`${label}...`);
    setActionLoading(prev => ({ ...prev, [label]: true }));

    try {
      const result = await action();
      toast.success(`${label} completed successfully!`, { id: loadingId });
      // Trigger background refresh
      window.dispatchEvent(new CustomEvent('wtv-data-mutated'));
      window.clearTimeout(window.__wtvAdminRefreshTimer);
      window.__wtvAdminRefreshTimer = window.setTimeout(() => loadAll({ quiet: true, fresh: true }), 1000);
      return result;
    } catch (error) {
      toast.error(`${label} failed: ${safeErrorMessage(error, 'Please check the current record status and try again.')}`, { id: loadingId });
      throw error;
    } finally {
      setActionLoading(prev => ({ ...prev, [label]: false }));
    }
  }, [loadAll]);

  // Action handlers using original service methods
  const quickEditUser = useCallback(async (u) => {
    const fname = window.prompt('First name', u.fname || '');
    if (fname === null) return;
    const lname = window.prompt('Last name', u.lname || '');
    if (lname === null) return;
    const email = window.prompt('Email', u.email || '');
    if (email === null) return;
    const companyName = window.prompt('Company / profile name', u.supplier?.company_name || u.factory_profile?.company_name || '');
    await runAction('Edit user', () => platformV1.users.update(u.id, { fname, lname, email, company_name: companyName || undefined }));
  }, [runAction]);

  const createUser = useCallback(async () => {
    const payload = { ...userForm, email: userForm.email || `user${Date.now()}@wastetovalue.local`, password: userForm.password || 'Waste@2026' };
    if (payload.role === 'employee') {
      payload.ssn = `SSN-${Date.now()}`;
      payload.shift = payload.shift || 'morning';
      if (payload.employee_role === 'driver') payload.driver_license_number = `DRV-${Date.now()}`;
    }
    if (payload.role === 'factory') {
      payload.tax_id = `TAX-${Date.now()}`;
      payload.required_commodity = data.commodities.find(c => String(c.id) === String(payload.commodity_id))?.title || 'PET Plastic';
    }
    await platformV1.users.create(payload);
    setUserForm(f => ({ ...f, email: `${f.role}${Date.now()}@wastetovalue.local` }));
  }, [userForm, data.commodities]);

  const createMaterial = useCallback(async () => {
    await platformV1.commodities.create(materialForm);
    setMaterialForm({ title: `New Material ${Date.now().toString().slice(-4)}` });
  }, [materialForm]);

  const setMaterialPrice = useCallback(async () => {
    if (!priceForm.commodity_id) throw new Error('Select a material first.');
    const value = Number(priceForm.price);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Enter a valid positive price.');
    await platformV1.commodities.setPrice(priceForm.commodity_id, value);
    setData(old => ({
      ...old,
      commodities: old.commodities.map(commodity =>
        Number(commodity.id) === Number(priceForm.commodity_id)
          ? { ...commodity, current_price: { ...(typeof commodity.current_price === 'object' && commodity.current_price ? commodity.current_price : {}), price: value } }
          : commodity
      ),
    }));
  }, [priceForm]);

  const createHub = useCallback(() => platformV1.hubs.create(hubForm), [hubForm]);
  const createTruck = useCallback(() => platformV1.trucks.create(truckForm), [truckForm]);
  const createPickup = useCallback(() => platformV1.pickups.create({ ...pickupForm, schedule_date: new Date(pickupForm.schedule_date).toISOString() }), [pickupForm]);
  const createMaterialRequest = useCallback(() => platformV1.factory.createMaterialRequest(factoryRequestForm), [factoryRequestForm]);
  const dispatchPickup = useCallback(async (pickup) => {
    const draft = getDispatchDraft(pickup);

    if (!draft.driver_employee_id) throw new Error('Select driver first.');
    if (!draft.truck_id) throw new Error('Select truck first.');

    let locations = pickupSavedLocations(pickup, supplierLocations);

    if (!locations.length && pickup.supplier_user_id) {
      locations = await loadSupplierLocations(pickup.supplier_user_id);
    }

    let supplierLocationId = draft.supplier_location_id || locations[0]?.id || '';

    if (!supplierLocationId && pickup.supplier_user_id) {
      const fallbackLocation = await platformV1.locations.create('supplier', pickup.supplier_user_id, {
        location_name: `${supplierName(pickup)} Pickup Location`,
        address: pickup.pickup_location || pickup.supplier?.address || pickup.supplier?.company_name || `Supplier #${pickup.supplier_user_id} default pickup address`,
      });

      const createdLocation = fallbackLocation?.data || fallbackLocation;

      if (createdLocation?.id) {
        supplierLocationId = createdLocation.id;
        setSupplierLocations(old => ({
          ...old,
          [pickup.supplier_user_id]: uniqueById([
            ...(old[pickup.supplier_user_id] || []),
            createdLocation,
          ]),
        }));
      }
    }

    if (!supplierLocationId) {
      throw new Error('This supplier has no saved location. Add one location first.');
    }

    const result = await platformV1.pickups.dispatch(pickup.id, {
      driver_employee_id: draft.driver_employee_id,
      truck_id: draft.truck_id,
      supplier_location_id: supplierLocationId,
    });

    setDispatchDrafts(old => {
      const next = { ...old };
      delete next[pickup.id];
      return next;
    });

    return result;
  }, [getDispatchDraft, supplierLocations, loadSupplierLocations]);
  const replyToSupplierMessage = useCallback(async (id) => {
    const reply = replyDrafts[id]?.trim();
    if (!reply) throw new Error('Write a reply first.');
    await platformV1.adminMessages.reply(id, reply);
    setReplyDrafts(old => ({ ...old, [id]: '' }));
    setData(old => ({ ...old, adminMessages: old.adminMessages.filter(m => Number(m.id) !== Number(id)) }));
  }, [replyDrafts]);

  const normalizeApplicationResult = (result, fallbackStatus) => {
    const root = result?.data || result || {};
    const application = root?.application || root?.data?.application || root?.data || root || {};
    const created = root?.created || root?.data?.created || {};
    return { application, created, status: application?.status || fallbackStatus };
  };

  const isLoading = (actionName) => actionLoading[actionName];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 p-5 md:p-6 space-y-6">
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px' } }} />

      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Platform Control Center</h1>
                <p className="text-emerald-100 text-sm mt-1">Manage users, materials, logistics, and operations in real-time</p>
              </div>
            </div>
            <Button
              onClick={() => loadAll({ fresh: true })}
              disabled={loading}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0 shadow-lg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Live Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <AdminCharts operations={chartOperations} inventory={chartInventory} />

      {/* Creation Forms - Improved Layout */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-emerald-600" />
            Quick Actions & Creation Forms
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* User Creation */}
            <FormSection title="Add New User">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First name" value={userForm.fname} onChange={e => setUserForm({ ...userForm, fname: e.target.value })} className="h-9" />
                <Input placeholder="Last name" value={userForm.lname} onChange={e => setUserForm({ ...userForm, lname: e.target.value })} className="h-9" />
                <Input placeholder="Email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="h-9 col-span-2" />
                <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="supplier">Supplier</option><option value="factory">Factory</option><option value="employee">Employee</option>
                </select>
                <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" value={userForm.commodity_id} onChange={e => setUserForm({ ...userForm, commodity_id: e.target.value })}>
                  {data.commodities.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
                <Button onClick={() => runAction('Create user', createUser)} disabled={isLoading('Create user')} className="col-span-2 bg-emerald-600 hover:bg-emerald-700">
                  {isLoading('Create user') ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                  Create User
                </Button>
              </div>
            </FormSection>

            {/* Material & Price */}
            <FormSection title="Materials Management">
              <div className="flex gap-2">
                <Input placeholder="Material name" value={materialForm.title} onChange={e => setMaterialForm({ title: e.target.value })} className="h-9 flex-1" />
                <Button onClick={() => runAction('Create material', createMaterial)} disabled={isLoading('Create material')} variant="outline" className="h-9">
                  {isLoading('Create material') ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4 mr-1" />}
                  Add
                </Button>
              </div>
              <div className="flex gap-2">
                <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm flex-1" value={priceForm.commodity_id} onChange={e => setPriceForm({ ...priceForm, commodity_id: e.target.value })}>
                  {data.commodities.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
                <Input type="number" step="0.01" placeholder="Price $" value={priceForm.price} onChange={e => setPriceForm({ ...priceForm, price: e.target.value })} className="h-9 w-28" />
                <Button onClick={() => runAction('Set price', setMaterialPrice)} disabled={isLoading('Set price')} variant="outline" className="h-9">
                  {isLoading('Set price') ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeDollarSign className="h-4 w-4 mr-1" />}
                  Set
                </Button>
              </div>
            </FormSection>

            {/* Hub & Truck */}
            <FormSection title="Hub & Fleet">
              <div className="flex gap-2">
                <Input placeholder="Hub location" value={hubForm.location} onChange={e => setHubForm({ ...hubForm, location: e.target.value })} className="h-9 flex-1" />
                <Input type="number" placeholder="Capacity kg" value={hubForm.capacity} onChange={e => setHubForm({ ...hubForm, capacity: Number(e.target.value) })} className="h-9 w-28" />
                <Button onClick={() => runAction('Create hub', createHub)} disabled={isLoading('Create hub')} variant="outline" className="h-9">
                  {isLoading('Create hub') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Warehouse className="h-4 w-4 mr-1" />}
                  Add Hub
                </Button>
              </div>
              <div className="flex gap-2">
                <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm flex-1" value={truckForm.hub_id} onChange={e => setTruckForm({ ...truckForm, hub_id: e.target.value })}>
                  {data.hubs.map(h => <option key={h.id} value={h.id}>{h.location}</option>)}
                </select>
                <Input placeholder="Plate" value={truckForm.plate_number} onChange={e => setTruckForm({ ...truckForm, plate_number: e.target.value })} className="h-9 w-28" />
                <Button onClick={() => runAction('Create truck', createTruck)} disabled={isLoading('Create truck')} variant="outline" className="h-9">
                  {isLoading('Create truck') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />}
                  Add Truck
                </Button>
              </div>
            </FormSection>

            {/* Pickup & Request */}
            <FormSection title="Operations">
              <div className="flex gap-2">
                <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm flex-1" value={pickupForm.contract_id} onChange={e => setPickupForm({ ...pickupForm, contract_id: e.target.value })}>
                  {supplierContracts.map(c => {
                    const partyUser = data.users.find(u => Number(u.id) === Number(c.party_id));
                    const supplierLabel = partyUser?.supplier?.company_name || (partyUser ? `${partyUser.fname || ''} ${partyUser.lname || ''}`.trim() : `Supplier #${c.party_id}`);
                    const materialLabel = c.commodity?.title || c.material_type || '';
                    return <option key={c.id} value={c.id}>{supplierLabel}{materialLabel ? ` · ${materialLabel}` : ''}</option>;
                  })}
                </select>
                <Input type="datetime-local" value={pickupForm.schedule_date} onChange={e => setPickupForm({ ...pickupForm, schedule_date: e.target.value })} className="h-9 w-36" />
                <Button onClick={() => runAction('Create pickup', createPickup)} disabled={isLoading('Create pickup')} variant="outline" className="h-9">
                  {isLoading('Create pickup') ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-1" />}
                  Pickup
                </Button>
              </div>
              <div className="flex gap-2">
                <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm flex-1" value={factoryRequestForm.commodity_id} onChange={e => setFactoryRequestForm({ ...factoryRequestForm, commodity_id: e.target.value })}>
                  {data.commodities.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
                <Input type="number" placeholder="Qty kg" value={factoryRequestForm.quantity_kg} onChange={e => setFactoryRequestForm({ ...factoryRequestForm, quantity_kg: Number(e.target.value) })} className="h-9 w-28" />
                <Button onClick={() => runAction('Create request', createMaterialRequest)} disabled={isLoading('Create request')} variant="outline" className="h-9">
                  {isLoading('Create request') ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4 mr-1" />}
                  Request
                </Button>
              </div>
            </FormSection>
          </div>
        </CardContent>
      </Card>

      {/* Data Tables */}
      <div className="space-y-6">
        {/* Supplier Messages */}
        <MiniTable
          onProfile={(item, title) => setProfile({ item, title })}
          title="Supplier Messages"
          icon={Bell}
          description="Review and respond to supplier inquiries"
          items={data.adminMessages}
          columns={[
            { label: 'Supplier', render: m => <div><p className="font-semibold">{m.sender_name || `User #${m.user_id}`}</p><p className="text-xs text-slate-500">{m.sender_email}</p></div> },
            { label: 'Question', render: m => <span className="line-clamp-2 text-sm">{m.message || '—'}</span> },
            { label: 'Status', render: m => <Badge className={statusClass(m.status || 'open')}>{m.status || 'open'}</Badge> },
            { label: 'Reply', render: m => <Input value={replyDrafts[m.id] || ''} onChange={e => setReplyDrafts({ ...replyDrafts, [m.id]: e.target.value })} placeholder="Write reply..." className="h-8 text-sm" /> }
          ]}
          actions={m => (
            <Button size="sm" variant="default" onClick={() => runAction('Reply', () => replyToSupplierMessage(m.id))} className="h-7 px-2 text-xs bg-emerald-600">
              <Send className="h-3 w-3 mr-1" /> Send
            </Button>
          )}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Users & Profiles" icon={Users} items={data.users}
            columns={[
              { label: 'User', render: u => <div><p className="font-semibold">{u.fname} {u.lname}</p><p className="text-xs text-slate-500">{u.email}</p></div> },
              { label: 'Role', render: u => <Badge variant="outline">{u.employee?.role || u.role}</Badge> },
              { label: 'Company', render: u => u.supplier?.company_name || u.factory_profile?.company_name || u.employee?.driver_license_number || 'Internal' },
              { label: 'Status', render: u => <Badge className={statusClass(u.employee?.employment_status || (u.deleted_at ? 'terminated' : 'active'))}>{u.employee?.employment_status || (u.deleted_at ? 'terminated' : 'active')}</Badge> }
            ]}
            actions={u => !['super_admin'].includes(u.role) && (
              <>
                <Button size="sm" variant="ghost" onClick={() => runAction('Edit user', () => quickEditUser(u))} className="h-7 px-2">Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => runAction('Deactivate user', () => platformV1.users.delete(u.id), `Deactivate ${u.email}?`)} className="h-7 px-2 text-rose-600"><Trash2 className="h-3 w-3" /></Button>
              </>
            )}
          />

          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Applications" icon={FileText} items={data.applications}
            columns={[
              { label: 'Company', render: a => <div><p className="font-semibold">{a.company_name}</p><p className="text-xs text-slate-500">{a.contact_name} · {a.email}</p></div> },
              { label: 'Role', key: 'role' }, { label: 'Status', render: a => <Badge className={statusClass(a.status)}>{a.status}</Badge> }
            ]}
            actions={a => {
              const status = String(a.status || '').toLowerCase();
              const locked = ['converted', 'rejected'].includes(status);
              return (
                <>
                  <Button size="sm" variant="ghost" disabled={locked} onClick={() => runAction('Approve', async () => {
                    const result = await platformV1.applications.updateStatus(a.id, { status: 'converted' });
                    const normalized = normalizeApplicationResult(result, 'converted');
                    setData(old => ({
                      ...old,
                      applications: old.applications.map(app => Number(app.id) === Number(a.id) ? { ...app, ...normalized.application, status: normalized.status } : app),
                      users: normalized.created?.user ? [normalized.created.user, ...old.users.filter(u => Number(u.id) !== Number(normalized.created.user.id))] : old.users,
                      contracts: normalized.created?.contract ? [normalized.created.contract, ...old.contracts.filter(c => Number(c.id) !== Number(normalized.created.contract.id))] : old.contracts,
                    }));
                  })}><CheckCircle2 className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" disabled={locked} onClick={() => runAction('Reject', async () => {
                    const result = await platformV1.applications.updateStatus(a.id, { status: 'rejected', rejection_reason: 'Not matching current accepted material policy.' });
                    const normalized = normalizeApplicationResult(result, 'rejected');
                    setData(old => ({ ...old, applications: old.applications.map(app => Number(app.id) === Number(a.id) ? { ...app, ...normalized.application, status: normalized.status } : app) }));
                  })}><XCircle className="h-3 w-3 text-rose-600" /></Button>
                </>
              );
            }}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Materials & Prices" icon={PackagePlus} items={data.commodities}
            columns={[{ label: 'Material', key: 'title' }, { label: 'Price', render: m => `$${m.current_price?.price || m.current_price || '—'}` }, { label: 'Suppliers', render: m => data.contracts.filter(c => c.party_type === 'supplier' && Number(c.commodity_id) === Number(m.id)).length }]}
          />
          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Contracts" icon={FileText} items={data.contracts}
            columns={[{ label: 'ID', key: 'id' }, { label: 'Party', render: c => `${c.party_type} #${c.party_id}` }, { label: 'Material', render: c => c.material_type || c.commodity?.title || `#${c.commodity_id}` }, { label: 'Status', render: c => <Badge className={statusClass(c.status)}>{c.status}</Badge> }]}
            actions={c => {
              const status = String(c.status || '').toLowerCase();

              if (status === 'terminated') {
                return <span className="px-2 py-1 text-xs font-medium text-slate-400">Final status</span>;
              }

              if (status === 'active') {
                return (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => runAction(
                      'Terminate contract',
                      () => platformV1.contracts.status(c.id, 'terminated'),
                      'Terminate this contract?'
                    )}
                  >
                    Terminate
                  </Button>
                );
              }

              return (
                <>
                  <Button size="sm" variant="ghost" onClick={() => runAction('Activate contract', () => platformV1.contracts.status(c.id, 'active'))}>Activate</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => runAction(
                      'Terminate contract',
                      () => platformV1.contracts.status(c.id, 'terminated'),
                      'Terminate this contract?'
                    )}
                  >
                    Terminate
                  </Button>
                </>
              );
            }}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Pickups & Dispatch" icon={Truck} items={data.pickups}
            columns={[
              { label: 'ID', key: 'id' },
              {
                label: 'Supplier', render: p => (
                  <div>
                    <p className="font-semibold leading-snug">{supplierName(p)}</p>
                    {p.supplier?.user?.email && <p className="text-xs text-slate-500">{p.supplier.user.email}</p>}
                  </div>
                )
              },
              { label: 'Driver/Truck', render: p => `${p.driver?.user?.fname || '—'}/${p.truck?.plate_number || '—'}` },
              { label: 'Status', render: p => <Badge className={statusClass(p.status)}>{p.status}</Badge> }
            ]}
            actions={p => {
              const status = String(p.status || '').toLowerCase();
              const canDispatch = status === 'scheduled';
              const canCancel = status === 'scheduled';
              const rowLocations = pickupSavedLocations(p, supplierLocations);
              const draft = getDispatchDraft(p);
              const truckChoices = availableTrucks.some(t => String(t.id) === String(draft.truck_id))
                ? availableTrucks
                : [p.truck, ...availableTrucks].filter(Boolean);

              if (!canDispatch && !canCancel) {
                return <span className="px-2 py-1 text-xs font-medium text-slate-400">Read only</span>;
              }

              return (
                <div className="flex min-w-[180px] flex-col gap-2">
                  <select
                    className="h-9 rounded-lg border border-cyan-200 bg-cyan-50 px-2 text-xs text-slate-900 disabled:opacity-60"
                    value={draft.driver_employee_id}
                    disabled={!canDispatch}
                    onChange={e => updateDispatchDraft(p.id, { driver_employee_id: e.target.value })}
                  >
                    <option value="">Select driver</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.fname} {d.lname || ''}</option>
                    ))}
                  </select>

                  <select
                    className="h-9 rounded-lg border border-cyan-200 bg-cyan-50 px-2 text-xs text-slate-900 disabled:opacity-60"
                    value={draft.truck_id}
                    disabled={!canDispatch}
                    onChange={e => updateDispatchDraft(p.id, { truck_id: e.target.value })}
                  >
                    <option value="">Select truck</option>
                    {truckChoices.map(t => (
                      <option key={t.id} value={t.id}>{t.plate_number || `Truck #${t.id}`}</option>
                    ))}
                  </select>

                  <select
                    className="h-9 rounded-lg border border-cyan-200 bg-cyan-50 px-2 text-xs text-slate-900 disabled:opacity-60"
                    value={draft.supplier_location_id}
                    disabled={!canDispatch}
                    onFocus={() => loadSupplierLocations(p.supplier_user_id)}
                    onChange={e => updateDispatchDraft(p.id, { supplier_location_id: e.target.value })}
                  >
                    <option value="">{rowLocations.length ? 'Select location' : 'Auto-create location on dispatch'}</option>
                    {rowLocations.map(location => (
                      <option key={location.id} value={location.id}>{locationLabel(location)}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canDispatch}
                      onClick={() => runAction('Dispatch', () => dispatchPickup(p))}
                      className="h-8 px-2"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canCancel}
                      onClick={() => runAction('Cancel pickup', () => platformV1.pickups.cancel(p.id), 'Cancel this pickup?')}
                      className="h-8 px-2 text-rose-600 hover:text-rose-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            }}
          />
          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Factory Requests" icon={ClipboardList} items={data.materialRequests}
            columns={[
              { label: 'ID', key: 'id' }, { label: 'Material', render: r => r.material || data.commodities.find(m => Number(m.id) === Number(r.commodity_id))?.title || `#${r.commodity_id}` },
              { label: 'Qty', render: r => `${r.quantity_kg} kg` }, { label: 'Status', render: r => <Badge className={statusClass(r.status)}>{r.status}</Badge> }
            ]}
            actions={r => {
              const status = String(r.status || '').toLowerCase();
              const isFinal = ['delivered', 'cancelled', 'completed'].includes(status);
              if (isFinal) return <span className="px-2 py-1 text-xs font-medium text-slate-400">Final</span>;
              return (
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="ghost" disabled={status !== 'requested'} onClick={() => runAction('Match', () => platformV1.factory.matchMaterialRequest(r.id))}><CheckCircle2 className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" disabled={status !== 'matched'} onClick={() => runAction('Schedule', () => platformV1.factory.scheduleMaterialRequest(r.id))}>Schedule</Button>
                  <Button size="sm" variant="ghost" disabled={status !== 'scheduled'} onClick={() => runAction('Ship', () => platformV1.factory.shipMaterialRequest(r.id))}>Ship</Button>
                  <Button size="sm" variant="ghost" disabled={status !== 'shipped'} onClick={() => runAction('Confirm', () => platformV1.factory.adminConfirmMaterialRequest(r.id))}>Confirm</Button>
                  <Button size="sm" variant="ghost" disabled={!['requested', 'matched'].includes(status)} onClick={() => runAction('Reject request', () => platformV1.factory.rejectMaterialRequest(r.id, 'Declined by admin'), 'Reject this request?')}>Reject</Button>
                </div>
              );
            }}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Hubs" icon={Warehouse} items={data.hubs}
            columns={[{ label: 'Location', key: 'location' }, { label: 'Capacity', render: h => `${h.capacity || h.maxCapacityKg || 0} kg` }]}
          />
          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Trucks" icon={Truck} items={data.trucks}
            columns={[{ label: 'Plate', key: 'plate_number' }, { label: 'Type', key: 'truck_type' }, { label: 'Status', render: t => <Badge className={statusClass(t.status)}>{t.status}</Badge> }]}
            actions={t => (
              <>
                <Button size="sm" variant="ghost" onClick={() => runAction('Set available', () => platformV1.trucks.updateStatus(t.id, 'available'))}>Available</Button>
                <Button size="sm" variant="ghost" onClick={() => runAction('Maintenance', () => platformV1.trucks.updateStatus(t.id, 'maintenance'))}>Maint</Button>
              </>
            )}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Invoices" icon={CreditCard} items={data.invoices}
            columns={[{ label: 'Number', render: i => i.invoice_number || `#${i.id}` }, { label: 'Total', render: i => `$${i.total_amount || i.total || 0}` }, { label: 'Status', render: i => <Badge className={statusClass(i.status)}>{i.status}</Badge> }]}
            actions={i => <Button size="sm" variant="ghost" disabled={String(i.status).toLowerCase() === 'paid'} onClick={() => runAction('Mark paid', () => platformV1.invoices.markPaid(i.id))}>Mark paid</Button>}
          />
          <MiniTable onProfile={(item, title) => setProfile({ item, title })} title="Notifications" icon={Bell} items={data.notifications}
            columns={[{ label: 'Message', render: n => n.data?.title || n.type }, { label: 'Read', render: n => <Badge className={statusClass(n.read_at ? 'confirmed' : 'pending')}>{n.read_at ? 'read' : 'unread'}</Badge> }]}
          />
        </div>
      </div>

      <ProfileDialog profile={profile} onClose={() => setProfile(null)} />
    </div>
  );
}
