import { DEMO_ACCOUNTS } from '@/mocks/demoAccounts';
import { createSeededRandom, floatBetween, intBetween, isoDaysAgo, pick, pickWeighted } from '@/mocks/seededRandom';

const COMMODITY_BASE = [
  'PET Plastic', 'HDPE Plastic', 'LDPE Film', 'PP Plastic', 'PVC Plastic', 'Mixed Plastic',
  'Cardboard', 'OCC', 'Office Paper', 'Newspaper', 'Mixed Paper', 'Carton Drink Packs',
  'Aluminum', 'Steel Cans', 'Copper Scrap', 'Metal Bottle Caps',
  'Glass Clear', 'Glass Mixed', 'Glass Amber',
  'Organic Waste', 'Food Waste', 'Compostable Bags',
  'Textile Waste', 'Cotton Scrap', 'Denim Scrap',
  'Wood Pallets', 'Rubber Waste', 'Tire Shreds',
  'E-Waste Small Devices', 'Battery Scrap', 'Construction Plastic',
  'Agricultural Film', 'Foam Packaging', 'Used Cooking Oil', 'Mixed Recyclables',
];

const EGYPT_CITIES = [
  'Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Tanta', 'Zagazig', 'Ismailia', 'Suez',
  'Luxor', 'Aswan', 'Port Said', 'Damietta', 'Minya', 'Beni Suef', 'Fayoum', '6th of October',
];

const FIRST_NAMES = ['Ahmed', 'Omar', 'Hassan', 'Youssef', 'Mahmoud', 'Nora', 'Fatma', 'Layla', 'Sara', 'Mona', 'Khaled', 'Tarek', 'Hana', 'Yasmin', 'Karim'];
const LAST_NAMES = ['Al-Rashid', 'Al-Fahad', 'Al-Mansouri', 'Al-Sulaiman', 'Hassan', 'Ibrahim', 'Mostafa', 'Nabil', 'Farouk', 'Zaki', 'Saleh', 'Gamal'];

const PICKUP_STATUSES = ['requested', 'scheduled', 'in_progress', 'completed', 'processing', 'cancelled'];
const REQUEST_STATUSES = ['requested', 'matched', 'scheduled', 'shipped', 'confirmed', 'rejected', 'cancelled'];
const DELIVERY_STATUSES = ['scheduled', 'in_transit', 'delivered', 'confirmed', 'rejected'];
const INBOUND_STATUSES = ['received', 'processing', 'quality_checked', 'baled', 'completed'];
const INVOICE_STATUSES = ['draft', 'issued', 'paid', 'overdue'];
const TRUCK_STATUSES = ['available', 'in_use', 'maintenance'];
const CONTRACT_STATUSES = ['draft', 'active', 'terminated'];

function buildCommodities(rng) {
  const commodities = [];
  for (let index = 0; index < 110; index += 1) {
    const base = COMMODITY_BASE[index % COMMODITY_BASE.length];
    const suffix = index >= COMMODITY_BASE.length ? ` Grade ${String.fromCharCode(65 + (index % 5))}` : '';
    commodities.push({
      id: index + 1,
      title: `${base}${suffix}`.trim(),
      current_price: {
        id: index + 1,
        commodity_id: index + 1,
        price: floatBetween(rng, 2.5, 18.5),
        effective_from: isoDaysAgo(rng, 90),
        effective_to: null,
      },
      created_at: isoDaysAgo(rng, 400),
      updated_at: isoDaysAgo(rng, 30),
    });
  }
  return commodities;
}

function buildUsers(rng, commodities) {
  const users = DEMO_ACCOUNTS.map((account) => ({
    id: account.id,
    fname: account.fname,
    lname: account.lname,
    email: account.email,
    role: account.role,
    phone: account.phone,
    email_verified_at: isoDaysAgo(rng, 120),
    profile: account.profile,
    employee: account.role === 'employee' ? account.profile : null,
    supplier: account.role === 'supplier' ? account.profile : null,
    factoryProfile: account.role === 'factory' ? account.profile : null,
    created_at: isoDaysAgo(rng, 200),
    updated_at: isoDaysAgo(rng, 10),
  }));

  let nextId = 6;

  for (let index = 0; index < 5; index += 1) {
    users.push({
      id: nextId++,
      fname: pick(rng, FIRST_NAMES),
      lname: pick(rng, LAST_NAMES),
      email: `admin${index + 2}@w2v.com`,
      role: 'super_admin',
      phone: `+20 100 90${intBetween(rng, 10, 99)} ${intBetween(rng, 100, 999)}`,
      email_verified_at: isoDaysAgo(rng, 100),
      profile: { role: 'super_admin' },
      created_at: isoDaysAgo(rng, 300),
      updated_at: isoDaysAgo(rng, 20),
    });
  }

  const supplierIds = [];
  for (let index = 0; index < 500; index += 1) {
    const id = nextId++;
    supplierIds.push(id);
    users.push({
      id,
      fname: pick(rng, FIRST_NAMES),
      lname: pick(rng, LAST_NAMES),
      email: `supplier${String(index + 1).padStart(3, '0')}@supplier.w2v.com`,
      role: 'supplier',
      phone: `+20 11${intBetween(rng, 0, 9)} ${intBetween(rng, 100, 999)} ${intBetween(rng, 1000, 9999)}`,
      email_verified_at: isoDaysAgo(rng, 180),
      profile: {
        company_name: `${pick(rng, LAST_NAMES)} Recycling ${index + 1}`,
        tax_id: `SUP-${10000 + index}`,
        location: `${pick(rng, EGYPT_CITIES)} Industrial Zone`,
      },
      supplier: {
        company_name: `${pick(rng, LAST_NAMES)} Recycling ${index + 1}`,
        tax_id: `SUP-${10000 + index}`,
      },
      created_at: isoDaysAgo(rng, 360),
      updated_at: isoDaysAgo(rng, 40),
    });
  }

  const driverIds = [];
  for (let index = 0; index < 300; index += 1) {
    const id = nextId++;
    driverIds.push(id);
    users.push({
      id,
      fname: pick(rng, FIRST_NAMES),
      lname: pick(rng, LAST_NAMES),
      email: `driver${String(index + 1).padStart(3, '0')}@driver.w2v.com`,
      role: 'employee',
      phone: `+20 12${intBetween(rng, 0, 9)} ${intBetween(rng, 100, 999)} ${intBetween(rng, 1000, 9999)}`,
      email_verified_at: isoDaysAgo(rng, 120),
      profile: {
        role: 'driver',
        employment_status: pickWeighted(rng, ['active', 'on_leave', 'terminated'], [88, 8, 4]),
        shift: pick(rng, ['morning', 'evening', 'night']),
        driver_license_number: `DRV-${5000 + index}`,
      },
      employee: {
        role: 'driver',
        employment_status: 'active',
        shift: pick(rng, ['morning', 'evening', 'night']),
        driver_license_number: `DRV-${5000 + index}`,
      },
      created_at: isoDaysAgo(rng, 300),
      updated_at: isoDaysAgo(rng, 15),
    });
  }

  const factoryIds = [];
  for (let index = 0; index < 200; index += 1) {
    const id = nextId++;
    factoryIds.push(id);
    const commodity = pick(rng, commodities);
    users.push({
      id,
      fname: pick(rng, FIRST_NAMES),
      lname: pick(rng, LAST_NAMES),
      email: `factory${String(index + 1).padStart(3, '0')}@factory.w2v.com`,
      role: 'factory',
      phone: `+20 10${intBetween(rng, 0, 9)} ${intBetween(rng, 100, 999)} ${intBetween(rng, 1000, 9999)}`,
      email_verified_at: isoDaysAgo(rng, 90),
      profile: {
        company_name: `${pick(rng, LAST_NAMES)} Industries ${index + 1}`,
        tax_id: `FAC-${20000 + index}`,
        required_commodity: commodity.title,
        location: `${pick(rng, EGYPT_CITIES)} Industrial Park`,
      },
      factoryProfile: {
        company_name: `${pick(rng, LAST_NAMES)} Industries ${index + 1}`,
        tax_id: `FAC-${20000 + index}`,
        required_commodity: commodity.title,
      },
      created_at: isoDaysAgo(rng, 250),
      updated_at: isoDaysAgo(rng, 25),
    });
  }

  const hubManagerIds = [5];
  for (let index = 1; index < 100; index += 1) {
    const id = nextId++;
    hubManagerIds.push(id);
    users.push({
      id,
      fname: pick(rng, FIRST_NAMES),
      lname: pick(rng, LAST_NAMES),
      email: `hubmanager${String(index + 1).padStart(3, '0')}@hub.w2v.com`,
      role: 'employee',
      phone: `+20 15${intBetween(rng, 0, 9)} ${intBetween(rng, 100, 999)} ${intBetween(rng, 1000, 9999)}`,
      email_verified_at: isoDaysAgo(rng, 100),
      profile: {
        role: 'hub_manager',
        employment_status: 'active',
        shift: pick(rng, ['morning', 'evening']),
      },
      employee: {
        role: 'hub_manager',
        employment_status: 'active',
        shift: pick(rng, ['morning', 'evening']),
      },
      created_at: isoDaysAgo(rng, 200),
      updated_at: isoDaysAgo(rng, 12),
    });
  }

  return { users, supplierIds, driverIds, factoryIds, hubManagerIds, nextId };
}

function buildHubs(rng, hubManagerIds) {
  const hubs = [];
  for (let index = 0; index < 25; index += 1) {
    hubs.push({
      id: index + 1,
      location: `${pick(rng, EGYPT_CITIES)} Hub ${index + 1}`,
      size_sq_meters: intBetween(rng, 800, 4500),
      capacity: intBetween(rng, 25000, 120000),
      manager_employee_id: hubManagerIds[index % hubManagerIds.length],
      created_at: isoDaysAgo(rng, 300),
      updated_at: isoDaysAgo(rng, 20),
    });
  }
  return hubs;
}

function buildTrucks(rng, hubs) {
  const trucks = [];
  for (let index = 0; index < 80; index += 1) {
    trucks.push({
      id: index + 1,
      plate_number: `W2V-${1000 + index}`,
      hub_id: pick(rng, hubs).id,
      payload_capacity: intBetween(rng, 1500, 5000),
      truck_type: pick(rng, ['Box Truck', 'Flatbed', 'Refrigerated', 'Compactor']),
      status: pickWeighted(rng, TRUCK_STATUSES, [55, 35, 10]),
      hub: pick(rng, hubs),
      created_at: isoDaysAgo(rng, 250),
      updated_at: isoDaysAgo(rng, 10),
    });
  }
  return trucks;
}

function buildContracts(rng, supplierIds, factoryIds, commodities) {
  const contracts = [];
  let id = 1;
  supplierIds.slice(0, 200).forEach((supplierId) => {
    const commodity = pick(rng, commodities);
    contracts.push({
      id: id++,
      party_id: supplierId,
      party_type: 'supplier',
      commodity_id: commodity.id,
      commodity,
      status: pickWeighted(rng, CONTRACT_STATUSES, [10, 80, 10]),
      payment_terms: pick(rng, ['Net 7', 'Net 14', 'Net 30']),
      material_type: commodity.title,
      shipment_threshold_kg: intBetween(rng, 500, 2500),
      signed_date: isoDaysAgo(rng, 120).slice(0, 10),
      created_at: isoDaysAgo(rng, 150),
      updated_at: isoDaysAgo(rng, 20),
    });
  });
  factoryIds.slice(0, 120).forEach((factoryId) => {
    const commodity = pick(rng, commodities);
    contracts.push({
      id: id++,
      party_id: factoryId,
      party_type: 'factory',
      commodity_id: commodity.id,
      commodity,
      status: pickWeighted(rng, CONTRACT_STATUSES, [8, 85, 7]),
      payment_terms: pick(rng, ['Net 14', 'Net 30', 'Net 45']),
      material_type: commodity.title,
      shipment_threshold_kg: intBetween(rng, 800, 4000),
      signed_date: isoDaysAgo(rng, 100).slice(0, 10),
      created_at: isoDaysAgo(rng, 130),
      updated_at: isoDaysAgo(rng, 18),
    });
  });
  return contracts;
}

function buildPickups(rng, users, supplierIds, driverIds, hubs, trucks, contracts, count = 5000) {
  const pickups = [];
  const supplierContracts = contracts.filter((contract) => contract.party_type === 'supplier');
  for (let index = 0; index < count; index += 1) {
    const supplierId = index < 20 ? 2 : pick(rng, supplierIds);
    const contract = supplierContracts.find((item) => item.party_id === supplierId) || pick(rng, supplierContracts);
    const driverId = index < 10 ? 4 : pick(rng, driverIds);
    const hub = pick(rng, hubs);
    const status = index < 5 ? 'in_progress' : index < 15 ? 'scheduled' : pickWeighted(rng, PICKUP_STATUSES, [8, 12, 15, 45, 12, 8]);
    pickups.push({
      id: index + 1,
      contract_id: contract.id,
      contract,
      supplier_user_id: supplierId,
      supplier: { user: users.find((user) => user.id === supplierId) },
      hub_id: hub.id,
      hub,
      truck_id: pick(rng, trucks).id,
      truck: pick(rng, trucks),
      driver_employee_id: driverId,
      driver: { user: users.find((user) => user.id === driverId) },
      scheduled_by_admin_id: 1,
      status,
      estimated_weight: intBetween(rng, 250, 2800),
      pickup_location: `${pick(rng, EGYPT_CITIES)} Warehouse ${intBetween(rng, 1, 40)}`,
      material_condition: pick(rng, ['Sorted bales', 'Loose collection', 'Compacted bags', 'Clean stream']),
      reported_contamination_percent: floatBetween(rng, 0.5, 8),
      supplier_notes: index % 4 === 0 ? 'Please call before arrival.' : '',
      schedule_date: isoDaysAgo(rng, 30),
      started_at: ['in_progress', 'completed', 'processing'].includes(status) ? isoDaysAgo(rng, 5) : null,
      completed_at: ['completed', 'processing'].includes(status) ? isoDaysAgo(rng, 3) : null,
      created_at: isoDaysAgo(rng, 60),
      updated_at: isoDaysAgo(rng, 5),
    });
  }
  return pickups;
}

function buildInboundRecords(rng, pickups, hubs, contracts, count = 5000) {
  const records = [];
  const completedPickups = pickups.filter((pickup) => ['completed', 'processing'].includes(pickup.status));
  for (let index = 0; index < count; index += 1) {
    const pickup = completedPickups[index % completedPickups.length] || pick(rng, pickups);
    const tier1 = Number(pickup.estimated_weight || intBetween(rng, 400, 2200));
    const accepted = Math.round(tier1 * floatBetween(rng, 0.88, 0.97));
    records.push({
      id: index + 1,
      pickup_id: pickup.id,
      pickup,
      contract_id: pickup.contract_id,
      hub_id: pickup.hub_id || pick(rng, hubs).id,
      tier1_weight: tier1,
      tier2_weight: accepted,
      contamination_ratio: floatBetween(rng, 0.02, 0.12, 4),
      accepted_weight: accepted,
      status: pickWeighted(rng, INBOUND_STATUSES, [10, 15, 20, 20, 35]),
      sorter_count: intBetween(rng, 2, 8),
      quality_notes: pick(rng, ['Clean stream', 'Minor label residue', 'Moisture controlled', 'High purity batch']),
      decontamination_notes: 'Standard QA workflow completed.',
      created_at: isoDaysAgo(rng, 45),
      updated_at: isoDaysAgo(rng, 4),
    });
  }
  return records;
}

function buildMaterialRequests(rng, factoryIds, commodities, hubs, count = 5000) {
  const requests = [];
  for (let index = 0; index < count; index += 1) {
    const factoryId = index < 15 ? 3 : pick(rng, factoryIds);
    const commodity = pick(rng, commodities);
    const status = index < 5 ? 'requested' : pickWeighted(rng, REQUEST_STATUSES, [15, 20, 15, 12, 25, 8, 5]);
    requests.push({
      id: index + 1,
      factory_user_id: factoryId,
      factory_name: `Factory #${factoryId}`,
      commodity_id: commodity.id,
      material: commodity.title,
      quantity_kg: intBetween(rng, 500, 6000),
      status,
      matched_hub: ['matched', 'scheduled', 'shipped', 'confirmed'].includes(status) ? pick(rng, hubs).location : null,
      matched_hub_id: ['matched', 'scheduled', 'shipped', 'confirmed'].includes(status) ? pick(rng, hubs).id : null,
      meeting_date: isoDaysAgo(rng, 20).slice(0, 10),
      notes: index % 3 === 0 ? 'Urgent production line requirement.' : '',
      created_at: isoDaysAgo(rng, 70),
      updated_at: isoDaysAgo(rng, 6),
    });
  }
  return requests;
}

function buildOutboundDeliveries(rng, factories, commodities, hubs, count = 3000) {
  const deliveries = [];
  for (let index = 0; index < count; index += 1) {
    const commodity = pick(rng, commodities);
    deliveries.push({
      id: index + 1,
      contract_id: intBetween(rng, 200, 320),
      hub_id: pick(rng, hubs).id,
      hub: pick(rng, hubs),
      commodity_id: commodity.id,
      commodity,
      status: pickWeighted(rng, DELIVERY_STATUSES, [10, 20, 35, 25, 10]),
      quantity_kg: intBetween(rng, 400, 5000),
      shipped_at: isoDaysAgo(rng, 25),
      delivered_at: isoDaysAgo(rng, 10),
      created_at: isoDaysAgo(rng, 40),
      updated_at: isoDaysAgo(rng, 3),
    });
  }
  return deliveries;
}

function buildInvoices(rng, count = 10000) {
  const invoices = [];
  for (let index = 0; index < count; index += 1) {
    const amount = floatBetween(rng, 1200, 85000);
    invoices.push({
      id: index + 1,
      invoice_number: `INV-${20260000 + index}`,
      party_type: pick(rng, ['supplier', 'factory']),
      party_id: intBetween(rng, 2, 800),
      amount,
      status: pickWeighted(rng, INVOICE_STATUSES, [5, 25, 60, 10]),
      due_date: isoDaysAgo(rng, -30).slice(0, 10),
      issued_at: isoDaysAgo(rng, 35),
      paid_at: null,
      created_at: isoDaysAgo(rng, 50),
      updated_at: isoDaysAgo(rng, 8),
    });
  }
  return invoices;
}

function buildNotifications(rng, users, count = 2000) {
  const notifications = [];
  const types = ['pickup_scheduled', 'delivery_confirmed', 'invoice_issued', 'qa_completed', 'request_matched', 'system_alert'];
  for (let index = 0; index < count; index += 1) {
    const user = pick(rng, users);
    notifications.push({
      id: index + 1,
      user_id: user.id,
      type: pick(rng, types),
      title: pick(rng, ['Pickup assigned', 'Delivery update', 'Invoice ready', 'QA completed', 'Request matched', 'System notice']),
      message: 'Operational update available in your dashboard.',
      read_at: index % 3 === 0 ? isoDaysAgo(rng, 2) : null,
      created_at: isoDaysAgo(rng, 20),
      updated_at: isoDaysAgo(rng, 2),
    });
  }
  return notifications;
}

function buildReports(rng, count = 1000) {
  const reports = [];
  const kinds = ['monthly_ops', 'esg_impact', 'supplier_scorecard', 'hub_performance', 'factory_sourcing'];
  for (let index = 0; index < count; index += 1) {
    reports.push({
      id: index + 1,
      title: `${pick(rng, kinds).replaceAll('_', ' ')} report #${index + 1}`,
      kind: pick(rng, kinds),
      period: isoDaysAgo(rng, 90).slice(0, 7),
      generated_at: isoDaysAgo(rng, 60),
      status: pick(rng, ['ready', 'archived']),
    });
  }
  return reports;
}

function buildAnalytics(rng, commodities, count = 20000) {
  const analytics = [];
  for (let index = 0; index < count; index += 1) {
    const commodity = pick(rng, commodities);
    analytics.push({
      id: index + 1,
      commodity_id: commodity.id,
      material: commodity.title,
      metric: pick(rng, ['collected_kg', 'recycled_kg', 'revenue_egp', 'contamination_rate', 'hub_throughput']),
      value: floatBetween(rng, 50, 50000),
      recorded_at: isoDaysAgo(rng, 365),
      hub_id: intBetween(rng, 1, 25),
      region: pick(rng, EGYPT_CITIES),
    });
  }
  return analytics;
}

function buildMarketplaceMaterials(commodities, hubs, rng) {
  return commodities.map((commodity, index) => ({
    id: index + 1,
    commodity_id: commodity.id,
    material: commodity.title,
    title: commodity.title,
    available_kg: intBetween(rng, 500, 25000),
    hub_id: pick(rng, hubs).id,
    hub_name: pick(rng, hubs).location,
    price_per_kg: commodity.current_price?.price || floatBetween(rng, 3, 15),
    quality_grade: pick(rng, ['A', 'B', 'C']),
    status: 'available',
  }));
}

function buildSupplierMaterials(rng, supplierId, commodities) {
  return commodities.slice(0, 12).map((commodity, index) => ({
    id: supplierId * 100 + index + 1,
    supplier_user_id: supplierId,
    commodity_id: commodity.id,
    commodity,
    estimated_weight: intBetween(rng, 200, 1800),
    status: pick(rng, ['active', 'scheduled', 'completed']),
    location: `${pick(rng, EGYPT_CITIES)} Collection Point`,
    created_at: isoDaysAgo(rng, 30),
  }));
}

function buildApplications(rng) {
  const applications = [];
  for (let index = 0; index < 40; index += 1) {
    applications.push({
      id: index + 1,
      company_name: `${pick(rng, LAST_NAMES)} ${pick(rng, ['Recycling', 'Industries', 'Materials'])}`,
      contact_name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      email: `pending${index + 1}@apply.w2v.com`,
      phone: `+20 10${intBetween(rng, 0, 9)} ${intBetween(rng, 100, 999)} ${intBetween(rng, 1000, 9999)}`,
      role: pick(rng, ['supplier', 'factory']),
      status: pickWeighted(rng, ['pending', 'under_review', 'rejected'], [70, 20, 10]),
      location: pick(rng, EGYPT_CITIES),
      created_at: isoDaysAgo(rng, 20),
      updated_at: isoDaysAgo(rng, 3),
    });
  }
  return applications;
}

function buildAdminMessages(rng, supplierIds) {
  const messages = [];
  for (let index = 0; index < 25; index += 1) {
    messages.push({
      id: index + 1,
      supplier_user_id: pick(rng, supplierIds),
      subject: pick(rng, ['Pickup delay', 'Contract question', 'Quality concern', 'Schedule change']),
      message: 'Supplier message awaiting admin response.',
      status: 'open',
      replied_at: null,
      created_at: isoDaysAgo(rng, 10),
    });
  }
  return messages;
}

function buildLocations(rng, supplierIds) {
  const locations = {};
  supplierIds.slice(0, 50).forEach((supplierId) => {
    locations[supplierId] = [
      {
        id: supplierId * 10 + 1,
        supplier_user_id: supplierId,
        name: 'Main Warehouse',
        address: `${pick(rng, EGYPT_CITIES)} Industrial Zone`,
        is_primary: true,
      },
    ];
  });
  locations[2] = [
    { id: 21, supplier_user_id: 2, name: 'W2V Supplier Warehouse', address: 'Cairo - Nasr City', is_primary: true },
    { id: 22, supplier_user_id: 2, name: 'Secondary Yard', address: 'Cairo - Heliopolis', is_primary: false },
  ];
  return locations;
}

function buildHubReceivingQueue(rng, hubs, inboundRecords, pickups, materialRequests, outbound, invoices, commodities) {
  const hub = hubs[0];
  const completedPickups = pickups.filter((pickup) => ['completed', 'processing'].includes(pickup.status)).slice(0, 30);
  const inventory = commodities.slice(0, 40).map((commodity, index) => ({
    id: index + 1,
    commodity_id: commodity.id,
    material: commodity.title,
    current_inventory_total: intBetween(rng, 1200, 18000),
    reserved_inventory_total: intBetween(rng, 100, 2500),
    capacity_utilization: floatBetween(rng, 0.35, 0.92),
  }));

  return {
    hub,
    completed_pickups: completedPickups,
    inbound_records: inboundRecords.slice(0, 80),
    inventory,
    factory_requests: materialRequests.filter((request) => ['requested', 'matched', 'scheduled'].includes(request.status)).slice(0, 40),
    outbound_deliveries: outbound.slice(0, 40),
    invoices: invoices.slice(0, 30),
    alerts: [
      { id: 1, level: 'warning', message: 'Hub capacity above 85% for PET Plastic.' },
      { id: 2, level: 'info', message: '3 inbound shipments arriving today.' },
    ],
    problem_reports: [],
    stats: {
      inbound_today: 12,
      outbound_today: 7,
      capacity_used_percent: 78,
      active_sorters: 6,
      bales_ready: 24,
    },
  };
}

function buildGraduationOverview(rng, analytics, hubs, users, commodities) {
  const topMaterials = commodities.slice(0, 8).map((commodity) => ({
    material: commodity.title,
    collected_kg: intBetween(rng, 12000, 85000),
    recycled_kg: intBetween(rng, 10000, 78000),
    revenue_egp: intBetween(rng, 50000, 420000),
  }));

  return {
    executive_summary: {
      total_users: users.length,
      active_hubs: hubs.length,
      monthly_collected_kg: 1_250_000,
      monthly_recycled_kg: 1_080_000,
      supplier_satisfaction: 94,
      on_time_delivery_rate: 91,
    },
    next_actions: [
      { id: 1, title: 'Review 12 pending supplier applications', priority: 'high' },
      { id: 2, title: 'Schedule hub capacity expansion for Cairo Hub 1', priority: 'medium' },
    ],
    alerts: [
      { id: 1, message: 'PET Plastic contamination trending above target in Alexandria Hub 3.' },
    ],
    material_analytics: topMaterials,
    rankings: {
      hubs: hubs.slice(0, 5).map((hub, index) => ({ id: hub.id, name: hub.location, score: 95 - index * 3 })),
      drivers: users.filter((user) => user.profile?.role === 'driver').slice(0, 5).map((user, index) => ({
        id: user.id,
        name: `${user.fname} ${user.lname}`,
        score: 92 - index * 2,
      })),
      suppliers: users.filter((user) => user.role === 'supplier').slice(0, 5).map((user, index) => ({
        id: user.id,
        name: user.profile?.company_name || `${user.fname} ${user.lname}`,
        score: 90 - index * 2,
      })),
    },
    feature_checklist: [
      { id: 1, label: 'Chain-of-custody tracking', complete: true },
      { id: 2, label: 'Automated invoice generation', complete: true },
      { id: 3, label: 'Hub QA workflow', complete: true },
    ],
    analytics_sample_size: analytics.length,
  };
}

export function generateMockDataset() {
  const rng = createSeededRandom(20260610);
  const commodities = buildCommodities(rng);
  const { users, supplierIds, driverIds, factoryIds, hubManagerIds } = buildUsers(rng, commodities);
  const hubs = buildHubs(rng, hubManagerIds);
  const trucks = buildTrucks(rng, hubs);
  const contracts = buildContracts(rng, supplierIds, factoryIds, commodities);
  const pickups = buildPickups(rng, users, supplierIds, driverIds, hubs, trucks, contracts, 5000);
  const inboundRecords = buildInboundRecords(rng, pickups, hubs, contracts, 5000);
  const materialRequests = buildMaterialRequests(rng, factoryIds, commodities, hubs, 5000);
  const outbound = buildOutboundDeliveries(rng, factoryIds, commodities, hubs, 3000);
  const invoices = buildInvoices(rng, 10000);
  const notifications = buildNotifications(rng, users, 2000);
  const reports = buildReports(rng, 1000);
  const analytics = buildAnalytics(rng, commodities, 20000);
  const marketplaceMaterials = buildMarketplaceMaterials(commodities, hubs, rng);
  const applications = buildApplications(rng);
  const adminMessages = buildAdminMessages(rng, supplierIds);
  const locations = buildLocations(rng, supplierIds);
  const hubReceivingQueue = buildHubReceivingQueue(rng, hubs, inboundRecords, pickups, materialRequests, outbound, invoices, commodities);
  const graduationOverview = buildGraduationOverview(rng, analytics, hubs, users, commodities);

  return {
    users,
    commodities,
    hubs,
    trucks,
    contracts,
    pickups,
    inboundRecords,
    materialRequests,
    outbound,
    invoices,
    notifications,
    reports,
    analytics,
    marketplaceMaterials,
    applications,
    adminMessages,
    locations,
    hubReceivingQueue,
    graduationOverview,
    supplierIds,
    driverIds,
    factoryIds,
    hubManagerIds,
    counts: {
      admins: users.filter((user) => user.role === 'super_admin').length,
      suppliers: users.filter((user) => user.role === 'supplier').length,
      drivers: users.filter((user) => user.profile?.role === 'driver').length,
      factories: users.filter((user) => user.role === 'factory').length,
      hubManagers: users.filter((user) => user.profile?.role === 'hub_manager').length,
      wasteListings: marketplaceMaterials.length,
      wasteCategories: commodities.length,
      orders: materialRequests.length,
      transactions: invoices.length,
      deliveries: outbound.length,
      inventoryRecords: inboundRecords.length,
      reports: reports.length,
      notifications: notifications.length,
      analyticsRecords: analytics.length,
    },
  };
}
