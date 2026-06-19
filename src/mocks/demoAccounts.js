export const DEMO_PASSWORD = '123456';

export const DEMO_ACCOUNTS = [
  {
    id: 1,
    email: 'admin@w2v.com',
    password: DEMO_PASSWORD,
    role: 'super_admin',
    fname: 'Sarah',
    lname: 'Al-Fahad',
    phone: '+20 100 900 0001',
    profile: { role: 'super_admin' },
  },
  {
    id: 2,
    email: 'supplier@w2v.com',
    password: DEMO_PASSWORD,
    role: 'supplier',
    fname: 'Ahmed',
    lname: 'Al-Rashid',
    phone: '+20 100 900 0002',
    profile: {
      company_name: 'W2V Supplier Co.',
      tax_id: 'W2V-SUP-001',
      location: 'Cairo - Nasr City',
    },
  },
  {
    id: 3,
    email: 'factory@w2v.com',
    password: DEMO_PASSWORD,
    role: 'factory',
    fname: 'Layla',
    lname: 'GreenPack',
    phone: '+20 100 900 0003',
    profile: {
      company_name: 'W2V Factory Industries',
      tax_id: 'W2V-FAC-001',
      required_commodity: 'PET Plastic',
      location: '6th of October City',
    },
  },
  {
    id: 4,
    email: 'driver@w2v.com',
    password: DEMO_PASSWORD,
    role: 'employee',
    fname: 'Omar',
    lname: 'Al-Mansouri',
    phone: '+20 100 900 0004',
    profile: {
      role: 'driver',
      employment_status: 'active',
      shift: 'morning',
      driver_license_number: 'W2V-DRV-001',
    },
  },
  {
    id: 5,
    email: 'hubmanager@w2v.com',
    password: DEMO_PASSWORD,
    role: 'employee',
    fname: 'Nora',
    lname: 'Al-Sulaiman',
    phone: '+20 100 900 0005',
    profile: {
      role: 'hub_manager',
      employment_status: 'active',
      shift: 'morning',
    },
  },
];

export const DEMO_ACCOUNT_EMAILS = new Set(DEMO_ACCOUNTS.map((account) => account.email));
