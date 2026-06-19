import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/mocks/demoAccounts';
import { generateMockDataset } from '@/mocks/mockDataGenerator';

const STORE_VERSION = 1;
const STORE_KEY = 'wtv_mock_store';
const USERS_KEY = 'wtv_mock_users';
const RESETS_KEY = 'wtv_password_resets';

let memoryDataset = null;

function readJson(key, fallback = null) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function defaultUserRegistry() {
  const registry = {};
  DEMO_ACCOUNTS.forEach((account) => {
    registry[account.email] = {
      ...account,
      email_verified_at: new Date().toISOString(),
    };
  });
  return registry;
}

function ensureUserRegistry() {
  const existing = readJson(USERS_KEY);
  if (!existing || typeof existing !== 'object') {
    const registry = defaultUserRegistry();
    writeJson(USERS_KEY, registry);
    return registry;
  }

  let changed = false;
  DEMO_ACCOUNTS.forEach((account) => {
    if (!existing[account.email]) {
      existing[account.email] = {
        ...account,
        email_verified_at: new Date().toISOString(),
      };
      changed = true;
    }
  });

  if (changed) {
    writeJson(USERS_KEY, existing);
  }

  return existing;
}

function ensureMutations() {
  const store = readJson(STORE_KEY);
  if (!store || store.version !== STORE_VERSION) {
    const next = { version: STORE_VERSION, mutations: {} };
    writeJson(STORE_KEY, next);
    return next.mutations;
  }
  store.mutations = store.mutations || {};
  return store.mutations;
}

function saveMutations(mutations) {
  writeJson(STORE_KEY, { version: STORE_VERSION, mutations });
}

export function notifyDataMutated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wtv-data-mutated'));
  }
}

export function getDataset() {
  if (!memoryDataset) {
    memoryDataset = generateMockDataset();
  }
  return memoryDataset;
}

export function getCounts() {
  return getDataset().counts;
}

export function getUserRegistry() {
  return ensureUserRegistry();
}

export function findRegisteredUser(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return getUserRegistry()[normalized] || null;
}

export function registerUser(payload) {
  const normalized = String(payload.email || '').trim().toLowerCase();
  const registry = getUserRegistry();

  if (registry[normalized]) {
    const error = new Error('This email is already used or invalid.');
    error.status = 422;
    error.fieldErrors = { email: ['This email is already used or invalid.'] };
    throw error;
  }

  const dataset = getDataset();
  const nextId = Math.max(...dataset.users.map((user) => Number(user.id) || 0), ...Object.values(registry).map((user) => Number(user.id) || 0)) + 1;
  const platformRole = payload.role === 'factory' ? 'factory' : 'supplier';
  const user = {
    id: nextId,
    email: normalized,
    password: payload.password || DEMO_PASSWORD,
    fname: payload.contact_name?.split(' ')?.[0] || payload.company_name || 'New',
    lname: payload.contact_name?.split(' ')?.slice(1).join(' ') || 'User',
    role: platformRole,
    phone: payload.phone || '',
    email_verified_at: new Date().toISOString(),
    profile: platformRole === 'factory'
      ? {
          company_name: payload.company_name,
          tax_id: payload.tax_id,
          required_commodity: payload.required_commodity || 'PET Plastic',
          location: payload.location,
        }
      : {
          company_name: payload.company_name,
          tax_id: payload.tax_id,
          location: payload.location,
        },
  };

  registry[normalized] = user;
  writeJson(USERS_KEY, registry);

  const application = {
    id: Date.now(),
    company_name: payload.company_name,
    contact_name: payload.contact_name,
    email: normalized,
    phone: payload.phone,
    role: platformRole,
    status: 'pending',
    location: payload.location,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mutations = ensureMutations();
  mutations.applications = [application, ...(mutations.applications || [])];
  saveMutations(mutations);
  notifyDataMutated();

  return application;
}

export function authenticateUser(email, password) {
  const user = findRegisteredUser(email);
  if (!user) {
    const error = new Error('Account not found.');
    error.status = 401;
    throw error;
  }

  if (user.password !== password) {
    const error = new Error('Incorrect password.');
    error.status = 401;
    throw error;
  }

  if (user.profile?.employment_status === 'terminated') {
    const error = new Error('Your account has been deactivated. Please contact support.');
    error.status = 403;
    throw error;
  }

  return serializeAuthUser(user);
}

export function serializeAuthUser(user) {
  return {
    id: user.id,
    fname: user.fname,
    lname: user.lname,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    profile: user.profile || null,
  };
}

export function createPasswordReset(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = findRegisteredUser(normalized);
  if (!user) {
    return { message: 'If an account exists for that email, password reset instructions have been sent.' };
  }

  const token = `reset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const resets = readJson(RESETS_KEY, {});
  resets[token] = {
    email: normalized,
    expires_at: Date.now() + 60 * 60 * 1000,
  };
  writeJson(RESETS_KEY, resets);

  return { token, message: 'Password reset instructions have been sent.' };
}

export function resetPassword(token, password) {
  const resets = readJson(RESETS_KEY, {});
  const entry = resets[token];
  if (!entry || entry.expires_at < Date.now()) {
    const error = new Error('Password reset link is invalid or has expired.');
    error.status = 400;
    throw error;
  }

  const registry = getUserRegistry();
  const user = registry[entry.email];
  if (!user) {
    const error = new Error('Password reset link is invalid or has expired.');
    error.status = 400;
    throw error;
  }

  user.password = password;
  registry[entry.email] = user;
  writeJson(USERS_KEY, registry);
  delete resets[token];
  writeJson(RESETS_KEY, resets);

  return { message: 'Password updated successfully.' };
}

function applyCollectionMutations(collectionName, baseItems) {
  const mutations = ensureMutations();
  const overlay = mutations[collectionName] || { created: [], updated: {}, deleted: new Set() };
  const deleted = new Set(overlay.deleted || []);
  const updated = overlay.updated || {};
  const created = overlay.created || [];

  const merged = baseItems
    .filter((item) => !deleted.has(item.id))
    .map((item) => (updated[item.id] ? { ...item, ...updated[item.id] } : item));

  return [...created, ...merged];
}

export function listCollection(name) {
  const dataset = getDataset();
  const base = dataset[name] || [];
  return applyCollectionMutations(name, base);
}

export function findInCollection(name, id) {
  return listCollection(name).find((item) => String(item.id) === String(id)) || null;
}

export function upsertInCollection(name, item) {
  const mutations = ensureMutations();
  mutations[name] = mutations[name] || { created: [], updated: {}, deleted: [] };

  const existing = findInCollection(name, item.id);
  if (existing) {
    mutations[name].updated[item.id] = { ...(mutations[name].updated[item.id] || {}), ...item };
  } else {
    mutations[name].created = [item, ...(mutations[name].created || [])];
  }

  saveMutations(mutations);
  notifyDataMutated();
  return item;
}

export function patchInCollection(name, id, patch) {
  const existing = findInCollection(name, id);
  if (!existing) {
    const error = new Error('Record not found.');
    error.status = 404;
    throw error;
  }
  return upsertInCollection(name, { ...existing, ...patch, id: existing.id });
}

export function deleteFromCollection(name, id) {
  const mutations = ensureMutations();
  mutations[name] = mutations[name] || { created: [], updated: {}, deleted: [] };
  mutations[name].deleted = [...new Set([...(mutations[name].deleted || []), id])];
  saveMutations(mutations);
  notifyDataMutated();
}

export function nextId(name) {
  const items = listCollection(name);
  const max = items.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0);
  return max + 1;
}

export function paginate(items, params = {}) {
  const perPage = Number(params.per_page || params.limit || 200);
  const page = Number(params.page || 1);
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

export function filterByUserRole(items, currentUser, mappings = {}) {
  if (!currentUser) {
    return items;
  }

  const role = currentUser.role;
  if (role === 'super_admin') {
    return items;
  }

  if (role === 'supplier' && mappings.supplierField) {
    return items.filter((item) => String(item[mappings.supplierField]) === String(currentUser.id));
  }

  if (role === 'factory' && mappings.factoryField) {
    return items.filter((item) => String(item[mappings.factoryField]) === String(currentUser.id));
  }

  if (role === 'employee') {
    const employeeRole = currentUser.profile?.role;
    if (employeeRole === 'driver' && mappings.driverField) {
      return items.filter((item) => String(item[mappings.driverField]) === String(currentUser.id));
    }
    if (employeeRole === 'hub_manager' && mappings.hubField) {
      return items.filter((item) => String(item[mappings.hubField]) === String(currentUser.profile?.hub_id || 1));
    }
  }

  return items;
}

export function getSupplierMaterials(supplierId) {
  const dataset = getDataset();
  const commodities = listCollection('commodities');
  return commodities.slice(0, 12).map((commodity, index) => ({
    id: supplierId * 100 + index + 1,
    supplier_user_id: supplierId,
    commodity_id: commodity.id,
    commodity,
    estimated_weight: 400 + index * 75,
    status: index % 3 === 0 ? 'active' : 'scheduled',
    location: 'Cairo Collection Point',
    created_at: new Date().toISOString(),
  }));
}

export function getLocations(type, userId) {
  const dataset = getDataset();
  const base = dataset.locations?.[userId] || [];
  const key = `locations_${type}_${userId}`;
  const mutations = ensureMutations();
  return applyCollectionMutations(key, base);
}

export function addLocation(type, userId, payload) {
  const key = `locations_${type}_${userId}`;
  const item = {
    id: nextId(key),
    ...payload,
    [`${type}_user_id`]: userId,
  };
  return upsertInCollection(key, item);
}
