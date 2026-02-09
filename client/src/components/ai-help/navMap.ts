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
    toast: "Today's Revenue",
    keywords: ['revenue', "today's revenue", 'daily revenue', 'sales today', 'monthly revenue'],
  },
  {
    key: 'cars-in-shop',
    label: 'Cars In Shop',
    route: '/auto/dashboard',
    highlightId: 'stat-cars-in-shop',
    toast: 'Cars In Shop',
    keywords: ['cars in shop', 'how many cars', 'vehicles in shop', 'open jobs'],
  },
  {
    key: 'aro',
    label: 'Avg Repair Order',
    route: '/auto/dashboard',
    highlightId: 'stat-aro',
    toast: 'Average Repair Order',
    keywords: ['aro', 'average repair order', 'avg ro', 'average ticket'],
  },
  {
    key: 'approval-rate',
    label: 'Approval Rate',
    route: '/auto/dashboard',
    highlightId: 'stat-approval-rate',
    toast: 'Line Item Approval Rate',
    keywords: ['approval rate', 'approvals', 'approved items', 'approval percentage'],
  },
  {
    key: 'fees-saved',
    label: 'Fees Saved',
    route: '/auto/dashboard',
    highlightId: 'stat-fees-saved',
    toast: 'Dual Pricing Fees Saved',
    keywords: ['fees saved', 'fee saved', 'dual pricing savings', 'processing savings', 'dual pricing earned'],
  },
  {
    key: 'open-ros',
    label: 'Open ROs',
    route: '/auto/dashboard',
    highlightId: 'card-open-ros',
    toast: 'Open Repair Orders',
    keywords: ['open ros', 'open repair orders', 'active jobs'],
  },
  {
    key: 'appointments-availability',
    label: 'Appointments & Availability',
    route: '/auto/dashboard',
    highlightId: 'card-appointments-availability',
    toast: "Today's Schedule & Staff",
    keywords: ['appointments today', "today's appointments", 'schedule today', 'who is working', 'staff on duty', 'availability'],
  },
  {
    key: 'shop-stats',
    label: 'Shop Overview',
    route: '/auto/dashboard',
    highlightId: 'card-shop-stats',
    toast: 'Shop Overview Stats',
    keywords: ['shop stats', 'shop overview', 'bay utilization', 'shop metrics'],
  },
  {
    key: 'total-customers',
    label: 'Total Customers',
    route: '/auto/customers',
    toast: 'Total Customers',
    keywords: ['total customers', 'customer count', 'how many customers'],
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
  {
    key: 'settings-bay-config',
    label: 'Bay Configuration',
    route: '/auto/settings/bays',
    toast: 'Bay Configuration & Sellable Hours',
    keywords: ['bay config', 'bay configuration', 'sellable hours', 'bay hours', 'bay capacity', 'configure bays'],
  },
  {
    key: 'settings-availability',
    label: 'Staff Availability',
    route: '/auto/settings/availability',
    toast: 'Staff Scheduling & Time Off',
    keywords: ['staff availability', 'staff schedule', 'time off', 'pto', 'tech schedule', 'who is off', 'day off'],
  },
  {
    key: 'settings-visibility',
    label: 'Dashboard Visibility',
    route: '/auto/settings/visibility',
    toast: 'Dashboard Card Visibility Settings',
    keywords: ['dashboard visibility', 'dashboard settings', 'show hide cards', 'card visibility', 'role visibility'],
  },

  // ─── Tech Portal ───
  {
    key: 'tech-portal',
    label: 'Tech Portal',
    route: '/auto/tech-portal',
    toast: 'Technician Portal',
    keywords: ['tech portal', 'technician portal', 'tech dashboard', 'clock in', 'clock out', 'time clock'],
  },

  // ─── Analytics / Reports V2 ───
  {
    key: 'analytics',
    label: 'Analytics',
    route: '/auto/reports-v2',
    toast: 'Advanced Analytics & Reports',
    keywords: ['analytics', 'reports v2', 'advanced reports', 'advanced analytics', 'detailed reports'],
  },

  // ─── Locations ───
  {
    key: 'settings-locations',
    label: 'Locations',
    route: '/auto/settings/locations',
    toast: 'Shop Locations',
    keywords: ['locations', 'shop locations', 'branches', 'multi location', 'location settings'],
  },

  // ─── Campaign Settings ───
  {
    key: 'settings-campaigns',
    label: 'Campaign Settings',
    route: '/auto/settings/campaigns',
    toast: 'Campaign Configuration',
    keywords: ['campaign settings', 'campaigns', 'marketing campaigns', 'campaign config'],
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

  // ─── New Estimate ───
  {
    key: 'new-estimate',
    label: 'New Estimate',
    route: '/auto/repair-orders',
    toast: 'Create New Estimate',
    keywords: ['new estimate', 'create estimate', 'make estimate', 'write estimate', 'new quote'],
  },
  {
    key: 'convert-estimate',
    label: 'Convert Estimate',
    route: '/auto/repair-orders',
    toast: 'Convert an Estimate to a Repair Order',
    keywords: ['convert estimate', 'estimate to ro', 'estimate to repair order', 'approve estimate'],
  },

  // ─── Tech Sessions / Time Tracking ───
  {
    key: 'tech-sessions',
    label: 'Active Techs',
    route: '/auto/dashboard',
    highlightId: 'card-active-tech-sessions',
    toast: 'Active Technician Sessions',
    keywords: ['tech sessions', 'active techs', 'who is working', 'time tracking', 'tech time', 'labor clock'],
  },

  // ─── Add-On Metrics ───
  {
    key: 'addon-metrics',
    label: 'Add-On Metrics',
    route: '/auto/dashboard',
    highlightId: 'card-todays-addons',
    toast: 'Add-On / Upsell Metrics',
    keywords: ['add-on metrics', 'addon', 'upsell', 'upsell rate', 'add-on approval', 'upsell tracking'],
  },

  // ─── Labor Types ───
  {
    key: 'labor-types',
    label: 'Labor Types',
    route: '/auto/repair-orders',
    toast: 'Labor Type Classification — Customer Pay, Internal, Warranty',
    keywords: ['labor type', 'labor types', 'customer pay', 'internal', 'warranty', 'warranty labor', 'internal labor', 'pay type'],
  },

  // ─── Warranty ───
  {
    key: 'warranty',
    label: 'Warranty Repairs',
    route: '/auto/repair-orders',
    toast: 'Warranty Service Lines',
    keywords: ['warranty', 'warranty repair', 'warranty parts', 'warranty claim', 'vendor warranty'],
  },

  // ─── Declined Services ───
  {
    key: 'declined-services',
    label: 'Declined Services',
    route: '/auto/settings/campaigns',
    toast: 'Declined Repairs & Follow-Up',
    keywords: ['declined', 'declined services', 'declined repairs', 'customer declined', 'follow up', 'follow-up', 'declined work'],
  },

  // ─── Follow-Up Campaigns ───
  {
    key: 'campaigns',
    label: 'Follow-Up Campaigns',
    route: '/auto/settings/campaigns',
    toast: 'Declined Repair Follow-Up Campaign Settings',
    keywords: ['campaigns', 'follow-up campaigns', 'follow up settings', 'declined follow-up', 'automated follow-up', 'email campaign', 'sms campaign'],
  },

  // ─── Monthly Summary Report ───
  {
    key: 'report-monthly',
    label: 'Monthly Summary',
    route: '/auto/reports-v2',
    toast: 'Monthly Summary Report',
    keywords: ['monthly summary', 'monthly report', 'month report', 'end of month', 'monthly numbers', 'monthly revenue', 'owner report'],
  },

  // ─── Advisor Performance Report ───
  {
    key: 'report-advisor',
    label: 'Advisor Performance',
    route: '/auto/reports-v2',
    toast: 'Service Advisor Performance Report',
    keywords: ['advisor performance', 'advisor report', 'service advisor', 'upsell performance', 'advisor metrics', 'advisor conversion', 'add-on rate'],
  },

  // ─── Tech Efficiency Report ───
  {
    key: 'report-tech-efficiency',
    label: 'Tech Efficiency',
    route: '/auto/reports-v2',
    toast: 'Technician Efficiency Report',
    keywords: ['tech efficiency', 'technician efficiency', 'billed hours', 'actual hours', 'efficiency ratio', 'tech performance', 'flat rate', 'book time'],
  },

  // ─── Employee Numbers ───
  {
    key: 'employee-numbers',
    label: 'Employee Setup',
    route: '/auto/staff',
    toast: 'Staff — Employee Numbers & PINs',
    keywords: ['employee number', 'employee numbers', 'tech number', 'advisor number', 'pin code', 'staff setup', 'employee id'],
  },

  // ─── Customer Authorization ───
  {
    key: 'authorization',
    label: 'Customer Authorization',
    route: '/auto/repair-orders',
    toast: 'Customer Repair Authorization',
    keywords: ['authorization', 'authorize', 'customer approval', 'repair approval', 'customer signature', 'sign off', 'approve repairs'],
  },

  // ─── Quick RO ───
  {
    key: 'quick-ro',
    label: 'Quick Repair Order',
    route: '/auto/repair-orders',
    toast: 'Quick RO — Fast repair order creation',
    keywords: ['quick ro', 'quick repair order', 'fast ro'],
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
