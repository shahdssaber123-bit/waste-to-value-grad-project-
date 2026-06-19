import { getStoredToken, getStoredUser } from '@/services/authService';
import {
  addLocation,
  authenticateUser,
  createPasswordReset,
  deleteFromCollection,
  findInCollection,
  getDataset,
  getLocations,
  getSupplierMaterials,
  listCollection,
  nextId,
  paginate,
  patchInCollection,
  registerUser,
  resetPassword,
  serializeAuthUser,
  upsertInCollection,
} from '@/mocks/mockDataStore';

function delay(ms = 120) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function ok(data, message = 'Success') {
  return { message, data };
}

function parseUrl(path) {
  const [pathname, query = ''] = path.split('?');
  const params = Object.fromEntries(new URLSearchParams(query));
  return { pathname, params };
}

async function parseBody(options = {}) {
  if (!options.body) {
    return {};
  }
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    return Object.fromEntries(options.body.entries());
  }
  if (typeof options.body === 'string') {
    try {
      return JSON.parse(options.body);
    } catch {
      return {};
    }
  }
  return options.body;
}

function currentAuthUser() {
  const token = getStoredToken();
  const stored = getStoredUser();
  if (!token || !stored) {
    const error = new Error('Unauthenticated.');
    error.status = 401;
    throw error;
  }

  const frontendToPlatform = {
    admin: 'super_admin',
    supplier: 'supplier',
    industry: 'factory',
    driver: 'employee',
    hub_manager: 'employee',
  };

  const platformRole = stored.platformRole || frontendToPlatform[stored.role] || stored.role;
  const employeeRole = stored.employeeRole || stored.profile?.role || null;

  return {
    ...stored,
    id: stored.platformId || stored.id,
    role: platformRole,
    profile: {
      ...(stored.profile || {}),
      role: employeeRole || stored.profile?.role,
    },
  };
}

function requireRole(user, roles = []) {
  if (!roles.length) {
    return;
  }
  const platformRole = user.role;
  const employeeRole = user.profile?.role;
  const allowed = roles.some((role) => {
    if (role === 'super_admin') return platformRole === 'super_admin';
    if (role === 'supplier') return platformRole === 'supplier';
    if (role === 'factory') return platformRole === 'factory';
    if (role === 'driver') return platformRole === 'employee' && employeeRole === 'driver';
    if (role === 'hub_manager') return platformRole === 'employee' && employeeRole === 'hub_manager';
    return platformRole === role;
  });
  if (!allowed) {
    const error = new Error('Forbidden.');
    error.status = 403;
    throw error;
  }
}

function sortLatest(items) {
  return [...items].sort((a, b) => Number(b.id) - Number(a.id));
}

function aiReply(message) {
  const text = String(message || '').toLowerCase();
  if (text.includes('pickup')) return 'Pickups are tracked from supplier request through driver completion and hub QA. Check your role dashboard for live status.';
  if (text.includes('invoice')) return 'Invoices are generated after QA acceptance and can be marked paid from the admin operations board.';
  if (text.includes('hub')) return 'Hub managers process inbound shipments, run quality checks, bale materials, and release outbound deliveries.';
  return 'I can help explain Waste2Value workflows for suppliers, drivers, hub managers, factories, and admins using the connected mock platform data.';
}

export async function mockRequest(path, options = {}) {
  await delay();
  const { pathname, params } = parseUrl(path);
  const method = (options.method || 'GET').toUpperCase();
  const body = await parseBody(options);

  if (method === 'POST' && pathname === '/api/v1/auth/login') {
    const user = authenticateUser(body.email, body.password);
    const token = `mock-token-${user.id}-${Date.now()}`;
    return ok({ token, token_type: 'Bearer', user }, 'Login successful.');
  }

  if (method === 'GET' && pathname === '/api/v1/auth/me') {
    const stored = getStoredUser();
    if (!getStoredToken() || !stored) {
      const error = new Error('Unauthenticated.');
      error.status = 401;
      throw error;
    }
    const platformUser = currentAuthUser();
    return ok({ user: serializeAuthUser(platformUser) });
  }

  if (method === 'POST' && pathname === '/api/v1/auth/logout') {
    return { message: 'Logged out successfully.' };
  }

  if (method === 'POST' && pathname === '/api/v1/auth/forgot-password') {
    return createPasswordReset(body.email);
  }

  if (method === 'POST' && pathname === '/api/v1/auth/reset-password') {
    return resetPassword(body.token, body.password);
  }

  if (method === 'POST' && pathname === '/api/v1/applications') {
    const application = registerUser(body);
    return ok(application, 'Application submitted successfully.');
  }

  const user = currentAuthUser();
  const dataset = getDataset();

  if (method === 'GET' && pathname === '/api/v1/dashboard/summary') {
    return ok({
      users: dataset.counts.admins + dataset.counts.suppliers + dataset.counts.drivers + dataset.counts.factories + dataset.counts.hubManagers,
      pickups_active: listCollection('pickups').filter((item) => ['scheduled', 'in_progress'].includes(item.status)).length,
      deliveries_today: 18,
      revenue_mtd: 2_450_000,
    });
  }

  if (method === 'GET' && pathname === '/api/v1/dashboard/impact') {
    return ok({
      recycled_kg: 1_080_000,
      landfill_diverted_kg: 920_000,
      co2_saved_tons: 640,
      water_saved_liters: 4_500_000,
    });
  }

  if (method === 'GET' && pathname === '/api/v1/admin/live-snapshot') {
    requireRole(user, ['super_admin']);
    const limit = Math.min(Number(params.limit || 200), 250);
    return {
      message: 'Admin live snapshot loaded successfully.',
      data: {
        users: paginate(sortLatest(listCollection('users')), { per_page: limit }),
        applications: paginate(sortLatest(listCollection('applications')), { per_page: limit }),
        commodities: paginate(sortLatest(listCollection('commodities')), { per_page: limit }),
        hubs: paginate(sortLatest(listCollection('hubs')), { per_page: limit }),
        trucks: paginate(sortLatest(listCollection('trucks')), { per_page: limit }),
        contracts: paginate(sortLatest(listCollection('contracts')), { per_page: limit }),
        pickups: paginate(sortLatest(listCollection('pickups')), { per_page: limit }),
        invoices: paginate(sortLatest(listCollection('invoices')), { per_page: limit }),
        outbound: paginate(sortLatest(listCollection('outbound')), { per_page: limit }),
        notifications: paginate(sortLatest(listCollection('notifications')), { per_page: 50 }),
        materialRequests: paginate(sortLatest(listCollection('materialRequests')), { per_page: limit }),
        adminMessages: paginate(sortLatest(listCollection('adminMessages')), { per_page: limit }),
      },
    };
  }

  if (method === 'GET' && pathname === '/api/v1/admin/system-health') {
    requireRole(user, ['super_admin']);
    return ok({ status: 'healthy', mode: 'frontend-mock', database: 'localStorage', api: 'mock' });
  }

  if (pathname.startsWith('/api/v1/admin/users')) {
    requireRole(user, ['super_admin']);
    const match = pathname.match(/^\/api\/v1\/admin\/users(?:\/(\d+))?(?:\/(status))?$/);
    const id = match?.[1];
    const action = match?.[2];
    if (method === 'GET' && !id) return paginate(sortLatest(listCollection('users')), params);
    if (method === 'GET' && id) return findInCollection('users', id);
    if (method === 'POST' && !id) {
      const created = upsertInCollection('users', {
        id: nextId('users'),
        fname: body.fname,
        lname: body.lname,
        email: body.email,
        role: body.role,
        phone: body.phone || '',
        profile: body.role === 'employee'
          ? { role: body.employee_role, employment_status: 'active' }
          : { company_name: body.company_name, tax_id: body.tax_id, required_commodity: body.required_commodity },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return ok(created, 'User created.');
    }
    if ((method === 'PATCH' || method === 'PUT') && id && !action) {
      return ok(patchInCollection('users', id, body), 'User updated.');
    }
    if (method === 'PATCH' && id && action === 'status') {
      return ok(patchInCollection('users', id, { profile: { employment_status: body.employment_status } }), 'Status updated.');
    }
    if (method === 'DELETE' && id) {
      deleteFromCollection('users', Number(id));
      return { message: 'User deactivated.' };
    }
  }

  if (pathname.includes('/locations')) {
    requireRole(user, ['super_admin']);
    const match = pathname.match(/^\/api\/v1\/admin\/(supplier|factory)\/users\/(\d+)\/locations(?:\/(\d+))?$/);
    const type = match?.[1];
    const userId = Number(match?.[2]);
    const locationId = match?.[3];
    if (method === 'GET') return getLocations(type, userId);
    if (method === 'POST') return ok(addLocation(type, userId, body), 'Location created.');
    if ((method === 'PATCH' || method === 'PUT') && locationId) {
      return ok(patchInCollection(`locations_${type}_${userId}`, locationId, body), 'Location updated.');
    }
    if (method === 'DELETE' && locationId) {
      deleteFromCollection(`locations_${type}_${userId}`, Number(locationId));
      return { message: 'Location deleted.' };
    }
  }

  if (pathname.startsWith('/api/v1/notifications')) {
    const items = sortLatest(listCollection('notifications')).filter((item) => String(item.user_id) === String(user.id));
    if (pathname.endsWith('/read-all') && method === 'PATCH') {
      items.forEach((item) => patchInCollection('notifications', item.id, { read_at: new Date().toISOString() }));
      return ok({ updated: items.length });
    }
    const match = pathname.match(/^\/api\/v1\/notifications\/(\d+)\/read$/);
    if (match && method === 'PATCH') {
      return ok(patchInCollection('notifications', match[1], { read_at: new Date().toISOString() }));
    }
    return {
      data: paginate(items, params),
      unread_count: items.filter((item) => !item.read_at).length,
    };
  }

  if (pathname.startsWith('/api/v1/admin/hubs')) {
    requireRole(user, ['super_admin']);
    const id = pathname.match(/\/hubs\/(\d+)/)?.[1];
    if (method === 'GET' && !id) return paginate(sortLatest(listCollection('hubs')), params);
    if (method === 'GET' && id) return findInCollection('hubs', id);
    if (method === 'POST') return ok(upsertInCollection('hubs', { id: nextId('hubs'), ...body, created_at: new Date().toISOString() }));
    if ((method === 'PATCH' || method === 'PUT') && id) return ok(patchInCollection('hubs', id, body));
    if (method === 'DELETE' && id) { deleteFromCollection('hubs', Number(id)); return { message: 'Hub deleted.' }; }
  }

  if (pathname.startsWith('/api/v1/admin/trucks')) {
    requireRole(user, ['super_admin']);
    const parts = pathname.match(/^\/api\/v1\/admin\/trucks(?:\/(\d+))?(?:\/(status))?$/);
    const id = parts?.[1];
    const action = parts?.[2];
    if (method === 'GET' && !id) return paginate(sortLatest(listCollection('trucks')), params);
    if (method === 'GET' && id) return findInCollection('trucks', id);
    if (method === 'POST') return ok(upsertInCollection('trucks', { id: nextId('trucks'), ...body, created_at: new Date().toISOString() }));
    if ((method === 'PATCH' || method === 'PUT') && id && !action) return ok(patchInCollection('trucks', id, body));
    if (method === 'PATCH' && id && action === 'status') return ok(patchInCollection('trucks', id, { status: body.status }));
  }

  if (pathname.startsWith('/api/v1/admin/commodities')) {
    requireRole(user, ['super_admin']);
    const priceMatch = pathname.match(/^\/api\/v1\/admin\/commodities\/(\d+)\/prices$/);
    if (priceMatch && method === 'POST') {
      const commodity = patchInCollection('commodities', priceMatch[1], {
        current_price: { commodity_id: Number(priceMatch[1]), price: Number(body.price), effective_from: new Date().toISOString(), effective_to: null },
      });
      return ok(commodity.current_price);
    }
    const id = pathname.match(/\/commodities\/(\d+)/)?.[1];
    if (method === 'GET' && !id) return paginate(sortLatest(listCollection('commodities')), params);
    if (method === 'GET' && id) return findInCollection('commodities', id);
    if (method === 'POST') return ok(upsertInCollection('commodities', { id: nextId('commodities'), title: body.title, created_at: new Date().toISOString() }));
    if ((method === 'PATCH' || method === 'PUT') && id) return ok(patchInCollection('commodities', id, body));
  }

  if (pathname.startsWith('/api/v1/admin/applications')) {
    requireRole(user, ['super_admin']);
    const id = pathname.match(/\/applications\/(\d+)/)?.[1];
    if (method === 'GET' && !id) return paginate(sortLatest(listCollection('applications')), params);
    if (method === 'PATCH' && id) return ok(patchInCollection('applications', id, body));
  }

  if (pathname.startsWith('/api/v1/admin/contracts')) {
    requireRole(user, ['super_admin']);
    const parts = pathname.match(/^\/api\/v1\/admin\/contracts(?:\/(\d+))?(?:\/(status))?$/);
    const id = parts?.[1];
    const action = parts?.[2];
    if (method === 'GET' && !id) return paginate(sortLatest(listCollection('contracts')), params);
    if ((method === 'PATCH' || method === 'PUT') && id && !action) return ok(patchInCollection('contracts', id, body));
    if (method === 'PATCH' && id && action === 'status') return ok(patchInCollection('contracts', id, { status: body.status }));
  }

  if (pathname.startsWith('/api/v1/admin/pickups')) {
    requireRole(user, ['super_admin']);
    const parts = pathname.match(/^\/api\/v1\/admin\/pickups(?:\/(\d+))?(?:\/(cancel|dispatch))?$/);
    const id = parts?.[1];
    const action = parts?.[2];
    if (method === 'GET' && !id) return paginate(sortLatest(listCollection('pickups')), params);
    if (method === 'POST' && !id) return ok(upsertInCollection('pickups', { id: nextId('pickups'), status: 'scheduled', ...body, created_at: new Date().toISOString() }));
    if (method === 'PATCH' && id && action === 'cancel') return ok(patchInCollection('pickups', id, { status: 'cancelled' }));
    if (method === 'PATCH' && id && action === 'dispatch') {
      return ok(patchInCollection('pickups', id, {
        status: 'scheduled',
        driver_employee_id: body.driver_employee_id,
        truck_id: body.truck_id,
        supplier_location_id: body.supplier_location_id,
      }));
    }
  }

  if (pathname.startsWith('/api/v1/admin/outbound')) {
    requireRole(user, ['super_admin']);
    const id = pathname.match(/\/outbound\/(\d+)/)?.[1];
    if (method === 'GET' && !id) return paginate(sortLatest(listCollection('outbound')), params);
    if (method === 'PATCH' && id) return ok(patchInCollection('outbound', id, { status: 'shipped', shipped_at: new Date().toISOString() }));
  }

  if (pathname.startsWith('/api/v1/admin/invoices')) {
    requireRole(user, ['super_admin']);
    const id = pathname.match(/\/invoices\/(\d+)/)?.[1];
    if (method === 'GET' && !id) return paginate(sortLatest(listCollection('invoices')), params);
    if (method === 'PATCH' && id) return ok(patchInCollection('invoices', id, { status: 'paid', paid_at: new Date().toISOString() }));
  }

  if (pathname.startsWith('/api/v1/admin/messages')) {
    requireRole(user, ['super_admin']);
    const id = pathname.match(/\/messages\/(\d+)\/reply$/)?.[1];
    if (method === 'GET') return paginate(sortLatest(listCollection('adminMessages')), params);
    if (method === 'POST' && id) {
      return ok(patchInCollection('adminMessages', id, {
        reply: body.reply,
        replied_at: new Date().toISOString(),
        status: 'closed',
      }));
    }
  }

  if (method === 'GET' && pathname === '/api/v1/supplier/materials') {
    requireRole(user, ['supplier']);
    return paginate(getSupplierMaterials(user.id), params);
  }

  if (method === 'GET' && pathname === '/api/v1/supplier/pickups') {
    requireRole(user, ['supplier']);
    const items = listCollection('pickups').filter((item) => String(item.supplier_user_id) === String(user.id));
    return paginate(sortLatest(items), params);
  }

  if (method === 'POST' && pathname === '/api/v1/supplier/pickup-requests') {
    requireRole(user, ['supplier']);
    const pickup = upsertInCollection('pickups', {
      id: nextId('pickups'),
      supplier_user_id: user.id,
      status: 'requested',
      estimated_weight: body.estimated_weight,
      schedule_date: body.schedule_date,
      pickup_location: body.location,
      material_condition: body.condition,
      reported_contamination_percent: body.contamination,
      supplier_notes: body.notes,
      contract_id: 1,
      created_at: new Date().toISOString(),
    });
    return ok(pickup, 'Pickup request created.');
  }

  if (method === 'POST' && pathname === '/api/v1/supplier/messages') {
    requireRole(user, ['supplier']);
    const message = upsertInCollection('adminMessages', {
      id: nextId('adminMessages'),
      supplier_user_id: user.id,
      subject: body.subject || 'Supplier message',
      message: body.message,
      status: 'open',
      created_at: new Date().toISOString(),
    });
    return ok(message, 'Message sent.');
  }

  if (method === 'GET' && pathname === '/api/v1/marketplace/materials') {
    return paginate(listCollection('marketplaceMaterials'), params);
  }

  if (pathname.startsWith('/api/v1/material-requests')) {
    const id = pathname.match(/\/material-requests\/(\d+)(?:\/(match|schedule|ship|admin-confirm|reject))?$/)?.[1];
    const action = pathname.match(/\/material-requests\/(\d+)\/(match|schedule|ship|admin-confirm|reject)$/)?.[2];
    if (method === 'GET' && !id) {
      const items = user.role === 'factory'
        ? listCollection('materialRequests').filter((item) => String(item.factory_user_id) === String(user.id))
        : listCollection('materialRequests');
      return paginate(sortLatest(items), params);
    }
    if (method === 'POST' && !id) {
      const requestItem = upsertInCollection('materialRequests', {
        id: nextId('materialRequests'),
        factory_user_id: user.id,
        factory_name: user.profile?.company_name || `Factory #${user.id}`,
        commodity_id: body.commodity_id,
        material: body.material,
        quantity_kg: body.quantity_kg,
        status: 'requested',
        notes: body.notes,
        created_at: new Date().toISOString(),
      });
      return ok(requestItem);
    }
    if (method === 'PATCH' && id && action === 'match') return ok(patchInCollection('materialRequests', id, { status: 'matched', matched_hub: 'Cairo Hub 1', matched_hub_id: 1 }));
    if (method === 'PATCH' && id && action === 'schedule') return ok(patchInCollection('materialRequests', id, { status: 'scheduled' }));
    if (method === 'PATCH' && id && action === 'ship') return ok(patchInCollection('materialRequests', id, { status: 'shipped' }));
    if (method === 'PATCH' && id && action === 'admin-confirm') return ok(patchInCollection('materialRequests', id, { status: 'confirmed' }));
    if (method === 'PATCH' && id && action === 'reject') return ok(patchInCollection('materialRequests', id, { status: 'rejected', rejection_reason: body.rejection_reason }));
  }

  if (pathname.startsWith('/api/v1/factory/deliveries')) {
    requireRole(user, ['factory']);
    const id = pathname.match(/\/deliveries\/(\d+)(?:\/(confirm|reject))?/)?.[1];
    const action = pathname.match(/\/deliveries\/(\d+)\/(confirm|reject)$/)?.[2];
    if (method === 'GET' && !id) {
      return paginate(sortLatest(listCollection('outbound').slice(0, 120)), params);
    }
    if (method === 'PATCH' && id && !action) return ok(patchInCollection('outbound', id, { status: 'confirmed' }));
    if (method === 'PATCH' && id && action === 'confirm') return ok(patchInCollection('outbound', id, { status: 'confirmed' }));
    if (method === 'POST' && id && action === 'reject') return ok(patchInCollection('outbound', id, { status: 'rejected', rejection_reason: body.rejection_reason }));
  }

  if (pathname.startsWith('/api/v1/driver/pickups')) {
    requireRole(user, ['driver']);
    const id = pathname.match(/\/pickups\/(\d+)(?:\/(start|weight|photos|depart-to-hub|complete|problem-reports))?/)?.[1];
    const action = pathname.match(/\/pickups\/(\d+)\/(start|weight|photos|depart-to-hub|complete|problem-reports)$/)?.[2];
    const driverPickups = listCollection('pickups').filter((item) => String(item.driver_employee_id) === String(user.id));
    if (method === 'GET' && !id) return paginate(sortLatest(driverPickups), params);
    if (method === 'PATCH' && id && action === 'start') return ok(patchInCollection('pickups', id, { status: 'in_progress', started_at: new Date().toISOString() }));
    if (method === 'PATCH' && id && action === 'weight') return ok(patchInCollection('pickups', id, { estimated_weight: body.estimated_weight }));
    if (method === 'POST' && id && action === 'photos') return ok(patchInCollection('pickups', id, { proof_note: body.proof_note || 'Driver uploaded proof photo' }));
    if (method === 'PATCH' && id && action === 'depart-to-hub') return ok(patchInCollection('pickups', id, { departed_to_hub_at: new Date().toISOString() }));
    if (method === 'PATCH' && id && action === 'complete') return ok(patchInCollection('pickups', id, { status: 'completed', completed_at: new Date().toISOString() }));
    if (method === 'POST' && id && action === 'problem-reports') return ok({ message: body.description || 'Problem reported.' });
  }

  if (method === 'GET' && (pathname === '/api/v1/driver/available-hubs' || pathname === '/api/v1/hub/available-hubs')) {
    return ok(listCollection('hubs'));
  }

  if (pathname.startsWith('/api/v1/hub/')) {
    requireRole(user, ['hub_manager']);
    if (method === 'GET' && pathname === '/api/v1/hub/receiving-queue') {
      return ok(dataset.hubReceivingQueue);
    }
    const inboundMatch = pathname.match(/^\/api\/v1\/hub\/inbound(?:\/(\d+))?(?:\/(quality|bale|status))?$/);
    const inboundId = inboundMatch?.[1];
    const inboundAction = inboundMatch?.[2];
    if (method === 'POST' && pathname === '/api/v1/hub/inbound') {
      const record = upsertInCollection('inboundRecords', { id: nextId('inboundRecords'), status: 'received', ...body, created_at: new Date().toISOString() });
      return ok(record);
    }
    if (method === 'PATCH' && inboundId && inboundAction === 'quality') return ok(patchInCollection('inboundRecords', inboundId, body));
    if (method === 'POST' && inboundId && inboundAction === 'bale') return ok(patchInCollection('inboundRecords', inboundId, { status: 'baled', ...body }));
    if (method === 'PATCH' && inboundId && inboundAction === 'status') return ok(patchInCollection('inboundRecords', inboundId, body));
    const pickupMatch = pathname.match(/^\/api\/v1\/hub\/pickups\/(\d+)\/(inspect|dispatch)$/);
    const pickupId = pickupMatch?.[1];
    const pickupAction = pickupMatch?.[2];
    if (method === 'POST' && pickupId && pickupAction === 'inspect') return ok(patchInCollection('pickups', pickupId, { status: 'processing' }));
    if (method === 'PATCH' && pickupId && pickupAction === 'dispatch') return ok(patchInCollection('pickups', pickupId, { status: 'completed' }));
  }

  if (method === 'GET' && pathname === '/api/v1/graduation/overview') {
    return ok({ overview: dataset.graduationOverview });
  }

  if (method === 'GET' && pathname === '/api/v1/graduation/features') {
    return ok({
      smart_matching: true,
      graduation_insights: true,
      printable_reports: true,
      mock_mode: true,
    });
  }

  if (method === 'POST' && pathname === '/api/v1/ai/chat') {
    return ok({
      reply: aiReply(body.message),
      answer: aiReply(body.message),
      message: aiReply(body.message),
    });
  }

  const error = new Error(`Mock endpoint not implemented: ${method} ${pathname}`);
  error.status = 404;
  throw error;
}
