import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { platformV1 } from '@/services/platformV1Service';

const emptyState = {
  applications: [], users: [], hubs: [], trucks: [], commodities: [], contracts: [], pickups: [],
};

function Field({ label, children }) {
  return <div><Label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">{label}</Label>{children}</div>;
}

function NativeSelect({ value, onChange, children }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{children}</select>;
}

function MiniTable({ rows = [], columns, empty = 'No records yet.', pageSize = 10 }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [rows.length, page, totalPages]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border/60">
        <table className="w-full table-fixed text-xs">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>{columns.map((c) => <th key={c.key} className="p-2 text-left font-semibold whitespace-nowrap">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={columns.length} className="p-4 text-muted-foreground">{empty}</td></tr>}
            {visibleRows.map((row, idx) => (
              <tr key={row.id || row.user_id || row.email || idx} className="border-t border-border/50 align-top">
                {columns.map((c) => <td key={c.key} className="max-w-[180px] truncate p-2 whitespace-nowrap">{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <Button size="sm" variant="outline" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
        <span>Showing {rows.length ? safePage * pageSize + 1 : 0}-{Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length} · Page {safePage + 1} of {totalPages}</span>
        <Button size="sm" variant="outline" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next</Button>
      </div>
    </div>
  );
}

function fmtDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function fullName(user) {
  return `${user?.fname || ''} ${user?.lname || ''}`.trim() || user?.email || '—';
}

function profileLabel(user) {
  if (user?.role === 'employee') return user?.employee?.role || 'employee';
  if (user?.role === 'factory') return user?.factory_profile?.company_name || user?.factory?.company_name || 'factory';
  if (user?.role === 'supplier') return user?.supplier?.company_name || 'supplier';
  return user?.role || '—';
}

export default function PlatformV1Panel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(emptyState);
  const [error, setError] = useState('');
  const [activeTool, setActiveTool] = useState('users');

  const [userForm, setUserForm] = useState({ role: 'employee', employee_role: 'driver', fname: '', lname: '', email: '', password: 'Waste@2026', phone: '', ssn: '', driver_license_number: '', company_name: '', tax_id: '', required_commodity: '', commodity_id: '', location_name: '', location_address: '' });
  const [hubForm, setHubForm] = useState({ location: '', size_sq_meters: '500', capacity: '24000', manager_employee_id: '' });
  const [truckForm, setTruckForm] = useState({ hub_id: '', payload_capacity: '4000', truck_type: 'Jumbo Truck', plate_number: '' });
  const [commodityForm, setCommodityForm] = useState({ title: '', price: '' });
  const [contractForm, setContractForm] = useState({ contract_id: '', commodity_id: '', payment_terms: 'Net 30', material_type: '', shipment_threshold_kg: '24000', signed_date: '' });
  const [pickupForm, setPickupForm] = useState({ contract_id: '', hub_id: '', schedule_date: '', estimated_weight: '' });

  const hubManagers = useMemo(() => data.users.filter((u) => u.role === 'employee' && u.employee?.role === 'hub_manager'), [data.users]);
  const activeSupplierContracts = useMemo(() => data.contracts.filter((c) => c.party_type === 'supplier' && c.status === 'active'), [data.contracts]);

  const normalizeSnapshot = (snapshot) => ({
    ...emptyState,
    ...(snapshot?.data || snapshot || {}),
  });

  const loadAll = async (options = {}) => {
    setLoading(true);
    setError('');
    try {
      const snapshot = await platformV1.adminLive.snapshot({ limit: 200, fresh: options.fresh ? 1 : undefined });
      const next = normalizeSnapshot(snapshot);
      setData({
        applications: next.applications || [],
        users: next.users || [],
        hubs: next.hubs || [],
        trucks: next.trucks || [],
        commodities: next.commodities || [],
        contracts: next.contracts || [],
        pickups: next.pickups || [],
      });
    } catch (err) {
      setError(err.message || 'Could not load platform data.');
      toast.error(err.message || 'Could not load platform data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const submit = async (label, action, after) => {
    try {
      setLoading(true);
      await action();
      toast.success(`${label} completed`);
      after?.();
      await loadAll({ fresh: true });
    } catch (err) {
      toast.error(err.message || `${label} failed`);
    } finally {
      setLoading(false);
    }
  };

  const createUser = () => submit('User creation', async () => {
    if (!/^[A-Za-zأ-ي\s.'-]+$/.test(userForm.fname.trim()) || !/^[A-Za-zأ-ي\s.'-]+$/.test(userForm.lname.trim())) throw new Error('First and last name must contain letters only.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) throw new Error('Enter a valid email address.');
    if (!userForm.password || userForm.password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (['supplier', 'factory'].includes(userForm.role) && !userForm.company_name.trim()) throw new Error('Company name is required for supplier/factory users.');
    if (['supplier', 'factory'].includes(userForm.role) && !userForm.location_address.trim()) throw new Error('Location address is required for supplier/factory users.');
    const payload = {
      fname: userForm.fname, lname: userForm.lname, email: userForm.email, password: userForm.password, phone: userForm.phone || null, role: userForm.role,
      employee_role: userForm.role === 'employee' ? userForm.employee_role : undefined,
      ssn: userForm.role === 'employee' ? (userForm.ssn || `SSN-${Date.now()}`) : undefined,
      driver_license_number: userForm.role === 'employee' && userForm.employee_role === 'driver' ? (userForm.driver_license_number || `DL-${Date.now()}`) : undefined,
      hire_date: userForm.role === 'employee' ? new Date().toISOString().slice(0, 10) : undefined,
      shift: userForm.role === 'employee' ? 'morning' : undefined,
      company_name: ['supplier', 'factory'].includes(userForm.role) ? userForm.company_name : undefined,
      commodity_id: ['supplier', 'factory'].includes(userForm.role) ? Number(userForm.commodity_id) : undefined,
      tax_id: userForm.role === 'factory' ? userForm.tax_id : undefined,
      required_commodity: userForm.role === 'factory' ? userForm.required_commodity : undefined,
      locations: ['supplier', 'factory'].includes(userForm.role) ? [{ location_name: userForm.location_name || `${userForm.company_name || userForm.fname} Main Location`, address: userForm.location_address || 'Main operational address' }] : undefined,
    };
    await platformV1.users.create(payload);
  });

  const editUser = (user) => submit('User update', async () => {
    const fname = window.prompt('First name', user.fname || '');
    if (fname === null) return;
    const lname = window.prompt('Last name', user.lname || '');
    if (lname === null) return;
    const email = window.prompt('Email', user.email || '');
    if (email === null) return;
    const company_name = window.prompt('Company / profile name', user.supplier?.company_name || user.factory_profile?.company_name || '');
    await platformV1.users.update(user.id, { fname, lname, email, company_name: company_name || undefined });
  });

  const deleteUser = (user) => {
    if (!window.confirm(`Deactivate ${user.email}?`)) return;
    return submit('User deactivation', () => platformV1.users.delete(user.id));
  };

  const createHub = () => submit('Hub creation', () => platformV1.hubs.create({
    location: hubForm.location,
    size_sq_meters: hubForm.size_sq_meters ? Number(hubForm.size_sq_meters) : null,
    capacity: hubForm.capacity ? Number(hubForm.capacity) : null,
    manager_employee_id: hubForm.manager_employee_id ? Number(hubForm.manager_employee_id) : null,
  }), () => setHubForm({ location: '', size_sq_meters: '500', capacity: '24000', manager_employee_id: '' }));

  const createTruck = () => submit('Truck creation', () => platformV1.trucks.create({
    hub_id: Number(truckForm.hub_id), payload_capacity: Number(truckForm.payload_capacity), truck_type: truckForm.truck_type, plate_number: truckForm.plate_number,
  }), () => setTruckForm({ hub_id: '', payload_capacity: '4000', truck_type: 'Jumbo Truck', plate_number: '' }));

  const createCommodity = () => submit('Commodity creation', async () => {
    const response = await platformV1.commodities.create({ title: commodityForm.title });
    const created = response?.data;
    if (created?.id && commodityForm.price) await platformV1.commodities.setPrice(created.id, Number(commodityForm.price));
  }, () => setCommodityForm({ title: '', price: '' }));

  const updateContract = () => submit('Contract update', () => platformV1.contracts.update(contractForm.contract_id, {
    commodity_id: contractForm.commodity_id ? Number(contractForm.commodity_id) : null,
    payment_terms: contractForm.payment_terms,
    material_type: contractForm.material_type,
    shipment_threshold_kg: contractForm.shipment_threshold_kg ? Number(contractForm.shipment_threshold_kg) : null,
    signed_date: contractForm.signed_date || null,
  }));

  const activateContract = (id) => submit('Contract activation', () => platformV1.contracts.status(id, 'active'));
  const cancelPickup = (id) => submit('Pickup cancellation', () => platformV1.pickups.cancel(id));

  const createPickup = () => submit('Pickup scheduling', () => platformV1.pickups.create({
    contract_id: Number(pickupForm.contract_id), hub_id: Number(pickupForm.hub_id), schedule_date: pickupForm.schedule_date, estimated_weight: pickupForm.estimated_weight ? Number(pickupForm.estimated_weight) : null,
  }), () => setPickupForm({ contract_id: '', hub_id: '', schedule_date: '', estimated_weight: '' }));

  return (
    <div className="space-y-6">
      <Card className="border-primary/15 bg-primary/[0.02]">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center justify-between gap-3">Live System Integration <Button size="sm" variant="outline" disabled={loading} onClick={loadAll}>{loading ? 'Loading...' : 'Refresh'}</Button></CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This screen checks core platform records and operational actions across users, hubs, trucks, materials, contracts and pickups.</p>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {[
          ['applications', data.applications.length], ['users', data.users.length], ['hubs', data.hubs.length], ['trucks', data.trucks.length], ['commodities', data.commodities.length], ['contracts', data.contracts.length], ['pickups', data.pickups.length],
        ].map(([key, count]) => <button key={key} onClick={() => setActiveTool(key)} className={`rounded-2xl border p-3 text-left transition ${activeTool === key ? 'border-primary bg-primary/8' : 'border-border/60 bg-card'}`}><p className="text-xs capitalize text-muted-foreground">{key}</p><p className="text-2xl font-bold">{count}</p></button>)}
      </div>

      {activeTool === 'applications' && <Card><CardHeader><CardTitle className="text-base">Applications</CardTitle></CardHeader><CardContent><MiniTable rows={data.applications} columns={[
        { key: 'company_name', label: 'Company' }, { key: 'contact_name', label: 'Contact' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> }, { key: 'email_verified_at', label: 'Verified', render: (r) => r.email_verified_at ? 'Yes' : 'No' },
      ]} /></CardContent></Card>}

      {activeTool === 'users' && <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Card><CardHeader><CardTitle className="text-base">Create Platform User</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Field label="First name"><Input value={userForm.fname} onChange={(e) => setUserForm({ ...userForm, fname: e.target.value })} /></Field><Field label="Last name"><Input value={userForm.lname} onChange={(e) => setUserForm({ ...userForm, lname: e.target.value })} /></Field></div>
          <Field label="Email"><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></Field>
          <Field label="Password"><Input value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></Field>
          <Field label="Role"><NativeSelect value={userForm.role} onChange={(role) => setUserForm({ ...userForm, role })}><option value="employee">Employee</option><option value="supplier">Supplier</option><option value="factory">Factory</option></NativeSelect></Field>
          {userForm.role === 'employee' && <><Field label="Employee role"><NativeSelect value={userForm.employee_role} onChange={(employee_role) => setUserForm({ ...userForm, employee_role })}><option value="driver">Driver</option><option value="hub_manager">Hub Manager</option></NativeSelect></Field><Field label="SSN"><Input value={userForm.ssn} onChange={(e) => setUserForm({ ...userForm, ssn: e.target.value })} placeholder="Auto if empty" /></Field>{userForm.employee_role === 'driver' && <Field label="Driver license"><Input value={userForm.driver_license_number} onChange={(e) => setUserForm({ ...userForm, driver_license_number: e.target.value })} placeholder="Auto if empty" /></Field>}</>}
          {['supplier', 'factory'].includes(userForm.role) && <><Field label="Company"><Input value={userForm.company_name} onChange={(e) => setUserForm({ ...userForm, company_name: e.target.value })} /></Field><Field label="Commodity"><NativeSelect value={userForm.commodity_id} onChange={(commodity_id) => setUserForm({ ...userForm, commodity_id })}><option value="">Select commodity</option>{data.commodities.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</NativeSelect></Field><Field label="Location name"><Input value={userForm.location_name} onChange={(e) => setUserForm({ ...userForm, location_name: e.target.value })} placeholder="Main warehouse / factory" /></Field><Field label="Location address"><Input value={userForm.location_address} onChange={(e) => setUserForm({ ...userForm, location_address: e.target.value })} placeholder="Full address" /></Field>{userForm.role === 'factory' && <><Field label="Tax ID"><Input value={userForm.tax_id} onChange={(e) => setUserForm({ ...userForm, tax_id: e.target.value })} /></Field><Field label="Required commodity"><Input value={userForm.required_commodity} onChange={(e) => setUserForm({ ...userForm, required_commodity: e.target.value })} /></Field></>}</>}
          <Button className="w-full bg-gradient-primary text-white" disabled={loading} onClick={createUser}>Create User</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Platform Users</CardTitle></CardHeader><CardContent><MiniTable rows={data.users} pageSize={10} columns={[{ key: 'name', label: 'Name', render: fullName }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'profile', label: 'Profile', render: profileLabel }, { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) }, { key: 'actions', label: 'Actions', render: (r) => r.role === 'super_admin' ? 'Protected' : <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => editUser(r)}>Edit</Button><Button size="sm" variant="outline" onClick={() => deleteUser(r)}>Delete</Button></div> }]} /></CardContent></Card>
      </div>}

      {activeTool === 'hubs' && <div className="grid lg:grid-cols-[340px_1fr] gap-6"><Card><CardHeader><CardTitle className="text-base">Create Hub</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Location"><Input value={hubForm.location} onChange={(e) => setHubForm({ ...hubForm, location: e.target.value })} /></Field><Field label="Size sqm"><Input value={hubForm.size_sq_meters} onChange={(e) => setHubForm({ ...hubForm, size_sq_meters: e.target.value })} /></Field><Field label="Capacity kg"><Input value={hubForm.capacity} onChange={(e) => setHubForm({ ...hubForm, capacity: e.target.value })} /></Field><Field label="Hub manager"><NativeSelect value={hubForm.manager_employee_id} onChange={(manager_employee_id) => setHubForm({ ...hubForm, manager_employee_id })}><option value="">None</option>{hubManagers.map(u => <option key={u.id} value={u.id}>{fullName(u)}</option>)}</NativeSelect></Field><Button onClick={createHub} disabled={loading} className="w-full bg-gradient-primary text-white">Create Hub</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Hubs</CardTitle></CardHeader><CardContent><MiniTable rows={data.hubs} columns={[{ key: 'id', label: 'ID' }, { key: 'location', label: 'Location' }, { key: 'capacity', label: 'Capacity' }, { key: 'manager', label: 'Manager', render: (r) => fullName(r.manager?.user) }]} /></CardContent></Card></div>}

      {activeTool === 'trucks' && <div className="grid lg:grid-cols-[340px_1fr] gap-6"><Card><CardHeader><CardTitle className="text-base">Create Truck</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Hub"><NativeSelect value={truckForm.hub_id} onChange={(hub_id) => setTruckForm({ ...truckForm, hub_id })}><option value="">Select hub</option>{data.hubs.map(h => <option key={h.id} value={h.id}>{h.location}</option>)}</NativeSelect></Field><Field label="Payload kg"><Input value={truckForm.payload_capacity} onChange={(e) => setTruckForm({ ...truckForm, payload_capacity: e.target.value })} /></Field><Field label="Type"><Input value={truckForm.truck_type} onChange={(e) => setTruckForm({ ...truckForm, truck_type: e.target.value })} /></Field><Field label="Plate"><Input value={truckForm.plate_number} onChange={(e) => setTruckForm({ ...truckForm, plate_number: e.target.value })} /></Field><Button onClick={createTruck} disabled={loading} className="w-full bg-gradient-primary text-white">Create Truck</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Trucks</CardTitle></CardHeader><CardContent><MiniTable rows={data.trucks} columns={[{ key: 'plate_number', label: 'Plate' }, { key: 'truck_type', label: 'Type' }, { key: 'payload_capacity', label: 'Payload' }, { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> }, { key: 'hub', label: 'Hub', render: (r) => r.hub?.location || r.hub_id }]} /></CardContent></Card></div>}

      {activeTool === 'commodities' && <div className="grid lg:grid-cols-[340px_1fr] gap-6"><Card><CardHeader><CardTitle className="text-base">Create Commodity</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Title"><Input value={commodityForm.title} onChange={(e) => setCommodityForm({ ...commodityForm, title: e.target.value })} /></Field><Field label="Initial price / kg"><Input value={commodityForm.price} onChange={(e) => setCommodityForm({ ...commodityForm, price: e.target.value })} /></Field><Button onClick={createCommodity} disabled={loading} className="w-full bg-gradient-primary text-white">Create Commodity</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Commodities</CardTitle></CardHeader><CardContent><MiniTable rows={data.commodities} columns={[{ key: 'id', label: 'ID' }, { key: 'title', label: 'Title' }, { key: 'current_price', label: 'Current Price', render: (r) => r.current_price?.price ?? r.current_price ?? '—' }]} /></CardContent></Card></div>}

      {activeTool === 'contracts' && <div className="grid lg:grid-cols-[360px_1fr] gap-6"><Card><CardHeader><CardTitle className="text-base">Update Contract Terms</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Contract"><NativeSelect value={contractForm.contract_id} onChange={(contract_id) => setContractForm({ ...contractForm, contract_id })}><option value="">Select contract</option>{data.contracts.map(c => <option key={c.id} value={c.id}>#{c.id} {c.party_type} · {c.status}</option>)}</NativeSelect></Field><Field label="Commodity"><NativeSelect value={contractForm.commodity_id} onChange={(commodity_id) => setContractForm({ ...contractForm, commodity_id })}><option value="">Select commodity</option>{data.commodities.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</NativeSelect></Field><Field label="Payment terms"><Input value={contractForm.payment_terms} onChange={(e) => setContractForm({ ...contractForm, payment_terms: e.target.value })} /></Field><Field label="Material type"><Input value={contractForm.material_type} onChange={(e) => setContractForm({ ...contractForm, material_type: e.target.value })} /></Field><Field label="Threshold kg"><Input value={contractForm.shipment_threshold_kg} onChange={(e) => setContractForm({ ...contractForm, shipment_threshold_kg: e.target.value })} /></Field><Field label="Signed date"><Input type="date" value={contractForm.signed_date} onChange={(e) => setContractForm({ ...contractForm, signed_date: e.target.value })} /></Field><Button onClick={updateContract} disabled={loading || !contractForm.contract_id} className="w-full bg-gradient-primary text-white">Save Terms</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Contracts</CardTitle></CardHeader><CardContent><MiniTable rows={data.contracts} columns={[{ key: 'id', label: 'ID' }, { key: 'party_type', label: 'Party' }, { key: 'commodity', label: 'Commodity', render: (r) => r.commodity?.title || r.commodity_id || '—' }, { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> }, { key: 'shipment_threshold_kg', label: 'Threshold' }, { key: 'actions', label: 'Action', render: (r) => r.status === 'draft' ? <Button size="sm" variant="outline" onClick={() => activateContract(r.id)}>Activate</Button> : '—' }]} /></CardContent></Card></div>}

      {activeTool === 'pickups' && <div className="grid lg:grid-cols-[360px_1fr] gap-6"><Card><CardHeader><CardTitle className="text-base">Schedule Pickup</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Active supplier contract"><NativeSelect value={pickupForm.contract_id} onChange={(contract_id) => setPickupForm({ ...pickupForm, contract_id })}><option value="">Select active supplier contract</option>{activeSupplierContracts.map(c => { const u = data.users.find(u => Number(u.id) === Number(c.party_id)); const name = u?.supplier?.company_name || (u ? `${u.fname || ''} ${u.lname || ''}`.trim() : '') || `Supplier #${c.party_id}`; return <option key={c.id} value={c.id}>{name}{c.commodity?.title ? ` · ${c.commodity.title}` : ''}</option>; })}</NativeSelect></Field><Field label="Hub"><NativeSelect value={pickupForm.hub_id} onChange={(hub_id) => setPickupForm({ ...pickupForm, hub_id })}><option value="">Select hub</option>{data.hubs.map(h => <option key={h.id} value={h.id}>{h.location}</option>)}</NativeSelect></Field><Field label="Schedule date/time"><Input type="datetime-local" value={pickupForm.schedule_date} onChange={(e) => setPickupForm({ ...pickupForm, schedule_date: e.target.value })} /></Field><Field label="Estimated weight"><Input value={pickupForm.estimated_weight} onChange={(e) => setPickupForm({ ...pickupForm, estimated_weight: e.target.value })} /></Field><Button onClick={createPickup} disabled={loading} className="w-full bg-gradient-primary text-white">Schedule Pickup</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Pickups</CardTitle></CardHeader><CardContent><MiniTable rows={data.pickups} columns={[{ key: 'id', label: 'ID' }, { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> }, { key: 'hub', label: 'Hub', render: (r) => r.hub?.location || r.hub_id }, { key: 'schedule_date', label: 'Scheduled', render: (r) => fmtDate(r.schedule_date) }, { key: 'estimated_weight', label: 'Est. weight' }, { key: 'actions', label: 'Action', render: (r) => r.status === 'scheduled' ? <Button size="sm" variant="outline" onClick={() => cancelPickup(r.id)}>Cancel</Button> : '—' }]} /></CardContent></Card></div>}
    </div>
  );
}
