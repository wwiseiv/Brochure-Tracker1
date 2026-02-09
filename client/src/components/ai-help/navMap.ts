export interface NavTarget {
  key: string;
  label: string;
  route: string;
  hash?: string;
  highlightId?: string;
  toast: string;
  keywords: string[];
  icon?: string;
}

export const NAV_MAP: NavTarget[] = [
  // ─── Dashboard Stats ───
  {
    key: 'revenue',
    label: 'Revenue',
    route: '/auto/dashboard',
    highlightId: 'stat-revenue',
    toast: 'Monthly Revenue',
    keywords: ['revenue', "today's revenue", 'daily revenue', 'sales today', 'monthly revenue'],
  },
  {
    key: 'open-ros',
    label: 'Open ROs',
    route: '/auto/dashboard',
    highlightId: 'stat-open-ros',
    toast: 'Open Repair Orders',
    keywords: ['open ros', 'open repair orders', 'active jobs', 'cars in shop', 'how many cars'],
  },
  {
    key: 'total-customers',
    label: 'Total Customers',
    route: '/auto/dashboard',
    highlightId: 'stat-total-customers',
    toast: 'Total Customers',
    keywords: ['total customers', 'customer count', 'how many customers'],
  },
  {
    key: 'appointments',
    label: "Today's Appointments",
    route: '/auto/dashboard',
    highlightId: 'stat-appointments',
    toast: "Today's Appointments",
    keywords: ['appointments today', "today's appointments", 'schedule today'],
  },
  {
    key: 'fees-saved',
    label: 'Fees Saved',
    route: '/auto/dashboard',
    highlightId: 'card-dual-pricing-widget',
    toast: 'Dual Pricing Revenue',
    keywords: ['fees saved', 'fee saved', 'dual pricing savings', 'processing savings', 'dual pricing'],
  },

  // ─── Core Sections ───
  {
    key: 'work-orders',
    label: 'Work Orders',
    route: '/auto/repair-orders',
    toast: 'Active Work Orders',
    keywords: ['work orders', 'work order', 'repair orders', 'active jobs', 'ro'],
  },
  {
    key: 'estimates',
    label: 'Estimates',
    route: '/auto/repair-orders',
    toast: 'Estimates',
    keywords: ['estimates', 'estimate', 'pending estimates', 'estimate approval'],
  },
  {
    key: 'customers',
    label: 'Customers',
    route: '/auto/customers',
    toast: 'Customer Management',
    keywords: ['customers', 'customer', 'client', 'clients', 'customer list'],
  },
  {
    key: 'vehicles',
    label: 'Vehicles',
    route: '/auto/customers',
    toast: 'Vehicle Management',
    keywords: ['vehicles', 'vehicle', 'car history', 'vehicle history'],
  },
  {
    key: 'schedule',
    label: 'Schedule',
    route: '/auto/schedule',
    toast: "Today's Schedule",
    keywords: ['schedule', 'calendar', 'appointments', 'bay schedule', 'booking'],
  },
  {
    key: 'inspections',
    label: 'Inspections (DVI)',
    route: '/auto/inspections',
    toast: 'Digital Vehicle Inspections',
    keywords: ['inspections', 'dvi', 'digital vehicle inspection', 'inspection photos'],
  },
  {
    key: 'invoices',
    label: 'Invoices',
    route: '/auto/repair-orders',
    toast: 'Invoices',
    keywords: ['invoices', 'invoice', 'billing', 'payment'],
  },
  {
    key: 'parts',
    label: 'Parts',
    route: '/auto/repair-orders',
    toast: 'Parts Ordering (PartsTech)',
    keywords: ['parts', 'parts ordering', 'partstech', 'order parts'],
  },

  // ─── Reports ───
  {
    key: 'reports',
    label: 'Reports',
    route: '/auto/reports',
    toast: 'Reports & Analytics',
    keywords: ['reports', 'report', 'analytics', 'metrics', 'data'],
  },
  {
    key: 'report-cash-card',
    label: 'Cash vs Card Report',
    route: '/auto/reports',
    toast: 'Cash vs Card Report',
    keywords: ['cash vs card', 'cash vs. card report', 'payment mix', 'cash report'],
  },
  {
    key: 'report-revenue',
    label: 'Revenue Report',
    route: '/auto/reports',
    toast: 'Revenue Report',
    keywords: ['revenue report', 'income report', 'sales report'],
  },
  {
    key: 'report-tech',
    label: 'Tech Productivity',
    route: '/auto/reports',
    toast: 'Technician Productivity Report',
    keywords: ['tech productivity', 'technician report', 'tech efficiency', 'labor report'],
  },
  {
    key: 'report-customers',
    label: 'Customer Report',
    route: '/auto/reports',
    toast: 'Customer Analytics Report',
    keywords: ['customer report', 'customer analytics', 'retention report'],
  },

  // ─── Settings & Config ───
  {
    key: 'settings',
    label: 'Settings',
    route: '/auto/settings',
    toast: 'Shop Settings',
    keywords: ['settings', 'configuration', 'preferences', 'shop settings'],
  },
  {
    key: 'settings-dual-pricing',
    label: 'Dual Pricing Settings',
    route: '/auto/settings',
    toast: 'Dual Pricing Configuration',
    keywords: ['dual pricing', 'cash discount', 'surcharge', 'card price', 'cash price'],
  },
  {
    key: 'settings-staff',
    label: 'Staff Management',
    route: '/auto/staff',
    toast: 'Staff & Roles',
    keywords: ['staff', 'employees', 'technicians', 'team', 'roles'],
  },
  {
    key: 'settings-communications',
    label: 'Communications',
    route: '/auto/settings',
    toast: 'SMS & Email Settings',
    keywords: ['sms', 'text messages', 'email settings', 'twilio', 'communications'],
  },
  {
    key: 'settings-quickbooks',
    label: 'QuickBooks',
    route: '/auto/quickbooks',
    toast: 'QuickBooks Integration',
    keywords: ['quickbooks', 'accounting', 'qbo', 'quickbooks online'],
  },

  // ─── New RO ───
  {
    key: 'new-ro',
    label: 'New Repair Order',
    route: '/auto/repair-orders/new',
    toast: 'Create New Repair Order',
    keywords: ['new repair order', 'new ro', 'create ro', 'new work order', 'start ro'],
  },

  // ─── Payment Processor ───
  {
    key: 'payment-processor',
    label: 'Payment Processor',
    route: '/auto/processor',
    toast: 'Payment Processor Settings',
    keywords: ['payment processor', 'processor', 'credit card processing', 'merchant services'],
  },
];

export function getNavTarget(key: string): NavTarget | undefined {
  return NAV_MAP.find((t) => t.key === key);
}

export function findNavTarget(phrase: string): NavTarget | undefined {
  const lower = phrase.toLowerCase().trim();
  const exact = NAV_MAP.find((t) => t.keywords.includes(lower));
  if (exact) return exact;
  return NAV_MAP.find((t) =>
    t.keywords.some((kw) => lower.includes(kw) || kw.includes(lower))
  );
}

export function buildNavSystemPrompt(): string {
  const sections = NAV_MAP.map(
    (t) => `- [[nav:${t.key}]] → "${t.label}" (${t.route}${t.hash ? '#' + t.hash : ''})`
  ).join('\n');

  return `
## Navigation Links

You can embed tappable navigation links in your responses that take the user directly 
to specific sections of the app. Use the format [[nav:key]] where key is from this list:

${sections}

RULES FOR NAVIGATION LINKS:
1. When explaining a feature, ALWAYS include a nav link so the user can jump there
2. Use them naturally in sentences like: "You can see this on your [[nav:fees-saved]] card"
3. Include multiple links when discussing related features
4. For "where is X" questions, lead with the nav link
5. For "what is X" questions, explain first, then provide the nav link
6. When giving a shop overview, link every metric you mention

The user will see these rendered as tappable blue pills with an arrow icon.
When tapped, the app navigates to that section and highlights it.
`.trim();
}
