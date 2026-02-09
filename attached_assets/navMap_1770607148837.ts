/**
 * PCB Auto — AI Help Navigation Map
 * 
 * Single source of truth mapping keywords → routes/sections.
 * The AI assistant uses this to inject tappable navigation links
 * into its responses. Add new entries as features are built.
 */

export interface NavTarget {
  /** Unique key used in AI response markup */
  key: string;
  /** Display label shown in the nav link pill */
  label: string;
  /** Wouter route to navigate to */
  route: string;
  /** Optional hash fragment to scroll to a specific section */
  hash?: string;
  /** Optional element ID to highlight after navigation */
  highlightId?: string;
  /** Toast message shown after navigation */
  toast: string;
  /** Keywords that trigger this nav target in AI responses */
  keywords: string[];
  /** Icon emoji for the link pill */
  icon?: string;
}

export const NAV_MAP: NavTarget[] = [
  // ─── Dashboard Stats ───
  {
    key: 'revenue',
    label: "Today's Revenue",
    route: '/dashboard',
    hash: 'revenue',
    highlightId: 'stat-revenue',
    toast: "Today's Revenue",
    keywords: ['revenue', "today's revenue", 'daily revenue', 'sales today'],
    icon: '💰',
  },
  {
    key: 'cars-in-shop',
    label: 'Cars In Shop',
    route: '/dashboard',
    hash: 'cars',
    highlightId: 'stat-cars',
    toast: 'Cars In Shop',
    keywords: ['cars in shop', 'car count', 'vehicles in shop', 'how many cars'],
    icon: '🚗',
  },
  {
    key: 'aro',
    label: 'Avg Repair Order',
    route: '/dashboard',
    hash: 'aro',
    highlightId: 'stat-aro',
    toast: 'Average Repair Order',
    keywords: ['aro', 'avg repair order', 'average repair order', 'average ticket'],
    icon: '📊',
  },
  {
    key: 'approval-rate',
    label: 'Approval Rate',
    route: '/dashboard',
    hash: 'approval',
    highlightId: 'stat-approval',
    toast: 'Estimate Approval Rate',
    keywords: ['approval rate', 'approval', 'close rate', 'estimate approval'],
    icon: '✅',
  },
  {
    key: 'fees-saved',
    label: 'Fees Saved',
    route: '/dashboard',
    hash: 'fees-saved',
    highlightId: 'fees-saved-card',
    toast: 'Fees Saved — Dual Pricing tracker',
    keywords: ['fees saved', 'fee saved', 'dual pricing savings', 'processing savings'],
    icon: '💰',
  },

  // ─── Core Sections ───
  {
    key: 'work-orders',
    label: 'Work Orders',
    route: '/work-orders',
    toast: 'Active Work Orders',
    keywords: ['work orders', 'work order', 'repair orders', 'active jobs', 'ro'],
    icon: '🔧',
  },
  {
    key: 'estimates',
    label: 'Estimates',
    route: '/estimates',
    toast: 'Estimates',
    keywords: ['estimates', 'estimate', 'pending estimates', 'estimate approval'],
    icon: '📋',
  },
  {
    key: 'customers',
    label: 'Customers',
    route: '/customers',
    toast: 'Customer Management',
    keywords: ['customers', 'customer', 'client', 'clients', 'customer list'],
    icon: '👥',
  },
  {
    key: 'vehicles',
    label: 'Vehicles',
    route: '/vehicles',
    toast: 'Vehicle Management',
    keywords: ['vehicles', 'vehicle', 'car history', 'vehicle history'],
    icon: '🚙',
  },
  {
    key: 'schedule',
    label: 'Schedule',
    route: '/schedule',
    toast: "Today's Schedule",
    keywords: ['schedule', 'calendar', 'appointments', 'bay schedule', 'booking'],
    icon: '📅',
  },
  {
    key: 'inspections',
    label: 'Inspections (DVI)',
    route: '/inspections',
    toast: 'Digital Vehicle Inspections',
    keywords: ['inspections', 'dvi', 'digital vehicle inspection', 'inspection photos'],
    icon: '🔍',
  },
  {
    key: 'invoices',
    label: 'Invoices',
    route: '/invoices',
    toast: 'Invoices',
    keywords: ['invoices', 'invoice', 'billing', 'payment'],
    icon: '🧾',
  },
  {
    key: 'parts',
    label: 'Parts',
    route: '/parts',
    toast: 'Parts Ordering (PartsTech)',
    keywords: ['parts', 'parts ordering', 'partstech', 'order parts'],
    icon: '⚙️',
  },

  // ─── Reports ───
  {
    key: 'reports',
    label: 'Reports',
    route: '/reports',
    toast: 'Reports & Analytics',
    keywords: ['reports', 'report', 'analytics', 'metrics', 'data'],
    icon: '📊',
  },
  {
    key: 'report-cash-card',
    label: 'Cash vs Card Report',
    route: '/reports/cash-vs-card',
    toast: 'Cash vs Card Report',
    keywords: ['cash vs card', 'cash vs. card report', 'payment mix', 'cash report'],
    icon: '💳',
  },
  {
    key: 'report-revenue',
    label: 'Revenue Report',
    route: '/reports/revenue',
    toast: 'Revenue Report',
    keywords: ['revenue report', 'income report', 'sales report'],
    icon: '📈',
  },
  {
    key: 'report-tech',
    label: 'Tech Productivity',
    route: '/reports/tech-productivity',
    toast: 'Technician Productivity Report',
    keywords: ['tech productivity', 'technician report', 'tech efficiency', 'labor report'],
    icon: '🔧',
  },
  {
    key: 'report-customers',
    label: 'Customer Report',
    route: '/reports/customers',
    toast: 'Customer Analytics Report',
    keywords: ['customer report', 'customer analytics', 'retention report'],
    icon: '👥',
  },

  // ─── Settings & Config ───
  {
    key: 'settings',
    label: 'Settings',
    route: '/settings',
    toast: 'Shop Settings',
    keywords: ['settings', 'configuration', 'preferences', 'shop settings'],
    icon: '⚙️',
  },
  {
    key: 'settings-dual-pricing',
    label: 'Dual Pricing Settings',
    route: '/settings/dual-pricing',
    toast: 'Dual Pricing Configuration',
    keywords: ['dual pricing', 'cash discount', 'surcharge', 'card price', 'cash price'],
    icon: '💳',
  },
  {
    key: 'settings-staff',
    label: 'Staff Management',
    route: '/settings/staff',
    toast: 'Staff & Roles',
    keywords: ['staff', 'employees', 'technicians', 'team', 'roles'],
    icon: '👤',
  },
  {
    key: 'settings-communications',
    label: 'Communications',
    route: '/settings/communications',
    toast: 'SMS & Email Settings',
    keywords: ['sms', 'text messages', 'email settings', 'twilio', 'communications'],
    icon: '📱',
  },
  {
    key: 'settings-quickbooks',
    label: 'QuickBooks',
    route: '/settings/quickbooks',
    toast: 'QuickBooks Integration',
    keywords: ['quickbooks', 'accounting', 'qbo', 'quickbooks online'],
    icon: '📒',
  },
];

/**
 * Lookup a nav target by key
 */
export function getNavTarget(key: string): NavTarget | undefined {
  return NAV_MAP.find((t) => t.key === key);
}

/**
 * Find the best matching nav target for a keyword/phrase
 */
export function findNavTarget(phrase: string): NavTarget | undefined {
  const lower = phrase.toLowerCase().trim();
  // Exact keyword match first
  const exact = NAV_MAP.find((t) => t.keywords.includes(lower));
  if (exact) return exact;
  // Partial match
  return NAV_MAP.find((t) =>
    t.keywords.some((kw) => lower.includes(kw) || kw.includes(lower))
  );
}

/**
 * Build the system prompt section that tells Claude about available nav links.
 * Injected into the AI help assistant's system prompt so Claude knows
 * what sections exist and how to format navigation links.
 */
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
