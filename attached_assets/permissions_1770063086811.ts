/**
 * PCBancard RBAC + Feature Access Control System
 * 
 * This is the SINGLE SOURCE OF TRUTH for all permissions.
 * 
 * Permission Resolution Order:
 * 1. Admin role => allow ALL
 * 2. Explicit per-user overrides (allow/deny)
 * 3. Agent stage defaults (trainee/active/senior)
 * 4. Role defaults (manager/agent)
 * 5. Deny by default
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = 'admin' | 'manager' | 'agent';

export type AgentStage = 'trainee' | 'active' | 'senior';

export type FeatureCategory = 
  | 'core_crm'
  | 'brochure_management'
  | 'ai_tools'
  | 'sales_training'
  | 'documents'
  | 'communication'
  | 'team_management'
  | 'analytics'
  | 'system';

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  
  // Routes this feature controls (for auto-gating)
  routes: string[];
  
  // API endpoints this feature controls
  apiEndpoints?: string[];
  
  // Dependencies - must have these features to access this one
  dependencies?: string[];
  
  // Access defaults by role
  roleDefaults: {
    admin: boolean;    // Always true, but explicit for clarity
    manager: boolean;
    agent: boolean;    // Base agent access (overridden by stage)
  };
  
  // Access defaults by agent stage (only applies to 'agent' role)
  stageDefaults: {
    trainee: boolean;
    active: boolean;
    senior: boolean;
  };
  
  // Cannot be disabled even by admin (login, profile, help)
  isCritical?: boolean;
  
  // UI grouping
  icon?: string;
}

export interface UserPermissions {
  userId: number;
  organizationId: number;
  role: UserRole;
  agentStage?: AgentStage;  // Only relevant for 'agent' role
  
  // Explicit overrides: feature_id => true (allow) | false (deny)
  overrides: Record<string, boolean>;
}

export interface EffectivePermissions {
  role: UserRole;
  agentStage?: AgentStage;
  features: Record<string, boolean>;
  canManagePermissions: boolean;
  canViewTeam: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE REGISTRY - SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════════════════════

export const FEATURES: FeatureDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // CRITICAL SYSTEM FEATURES (Cannot be disabled)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'user_profile',
    name: 'User Profile',
    description: 'View and edit your profile, settings',
    category: 'system',
    routes: ['/profile', '/settings'],
    isCritical: true,
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'User'
  },
  {
    id: 'help_center',
    name: 'Help Center',
    description: 'Documentation and support',
    category: 'system',
    routes: ['/help', '/support'],
    isCritical: true,
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'HelpCircle'
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard overview',
    category: 'system',
    routes: ['/'],
    isCritical: true,
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Home'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SALES TRAINING FEATURES (Available to TRAINEES)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'sales_spark',
    name: 'Sales Spark',
    description: 'Real-time AI prospecting advice and sales intelligence',
    category: 'sales_training',
    routes: ['/coach', '/sales-spark'],
    apiEndpoints: ['/api/coach/*', '/api/sales-spark/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Zap'
  },
  {
    id: 'ai_coaching',
    name: 'AI Coaching',
    description: 'Get AI-powered sales coaching and advice',
    category: 'sales_training',
    routes: ['/coach/advice', '/coaching'],
    apiEndpoints: ['/api/coaching/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'MessageSquare'
  },
  {
    id: 'role_play',
    name: 'Practice Role Play',
    description: 'AI-powered sales conversation practice with voice',
    category: 'sales_training',
    routes: ['/coach/roleplay', '/role-play', '/roleplay'],
    apiEndpoints: ['/api/roleplay/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Users'
  },
  {
    id: 'presentation_training',
    name: 'Teach Me The Presentation',
    description: '8-module interactive presentation training system',
    category: 'sales_training',
    routes: ['/presentation-training', '/training/presentation'],
    apiEndpoints: ['/api/presentation-training/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'GraduationCap'
  },
  {
    id: 'equipiq',
    name: 'EquipIQ',
    description: 'AI equipment recommendation advisor',
    category: 'sales_training',
    routes: ['/equipiq', '/equipment'],
    apiEndpoints: ['/api/equipiq/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Cpu'
  },
  {
    id: 'daily_edge',
    name: 'Daily Edge',
    description: 'Daily mindset and motivation training',
    category: 'sales_training',
    routes: ['/daily-edge'],
    apiEndpoints: ['/api/daily-edge/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Sun'
  },
  {
    id: 'ai_help_assistant',
    name: 'AI Help Assistant',
    description: 'Claude-powered floating help chatbot',
    category: 'sales_training',
    routes: [],  // Floating component, no dedicated route
    apiEndpoints: ['/api/ai-help/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Bot'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE CRM FEATURES (ACTIVE agents and above)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'deal_pipeline',
    name: 'Deal Pipeline',
    description: '14-stage Kanban deal tracking system',
    category: 'core_crm',
    routes: ['/pipeline', '/deals', '/deals/*'],
    apiEndpoints: ['/api/deals/*', '/api/pipeline/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Target'
  },
  {
    id: 'merchant_crm',
    name: 'Merchant CRM',
    description: 'Comprehensive merchant profiles and history',
    category: 'core_crm',
    routes: ['/merchants', '/merchants/*', '/crm'],
    apiEndpoints: ['/api/merchants/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Building2'
  },
  {
    id: 'today_dashboard',
    name: "Today's Actions",
    description: 'Daily action center for follow-ups and appointments',
    category: 'core_crm',
    routes: ['/today'],
    apiEndpoints: ['/api/today/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Calendar'
  },
  {
    id: 'prospect_finder',
    name: 'AI Prospect Finder',
    description: 'Grok-4 powered local business discovery',
    category: 'core_crm',
    routes: ['/prospects/search', '/prospect-finder'],
    apiEndpoints: ['/api/prospects/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Search'
  },
  {
    id: 'business_card_scanner',
    name: 'Business Card Scanner',
    description: 'AI OCR for business card contact extraction',
    category: 'core_crm',
    routes: ['/business-card-scanner', '/scan-card'],
    apiEndpoints: ['/api/scan-card/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'CreditCard'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BROCHURE & DROP MANAGEMENT (ACTIVE agents and above)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'drop_logging',
    name: 'Drop Logging',
    description: 'Log brochure drops with GPS and voice notes',
    category: 'brochure_management',
    routes: ['/drops', '/drops/*', '/drops/new'],
    apiEndpoints: ['/api/drops/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'MapPin'
  },
  {
    id: 'brochure_inventory',
    name: 'Brochure Inventory',
    description: 'Track brochure inventory and assignments',
    category: 'brochure_management',
    routes: ['/inventory'],
    apiEndpoints: ['/api/inventory/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Package'
  },
  {
    id: 'route_planner',
    name: 'Route Planner',
    description: 'Optimize daily pickup routes',
    category: 'brochure_management',
    routes: ['/route-planner'],
    apiEndpoints: ['/api/routes/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Route'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AI-POWERED SALES TOOLS (SENIOR agents only, or override)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'statement_analyzer',
    name: 'Statement Analyzer',
    description: 'AI analysis of merchant processing statements',
    category: 'ai_tools',
    routes: ['/statement-analyzer'],
    apiEndpoints: ['/api/statement-analyzer/*', '/api/analyze-statement'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: false, senior: true },
    icon: 'FileSearch'
  },
  {
    id: 'proposal_generator',
    name: 'Proposal Generator',
    description: 'AI-powered professional proposal creation',
    category: 'ai_tools',
    routes: ['/proposal-generator', '/proposals/*'],
    apiEndpoints: ['/api/proposals/*', '/api/generate-proposal'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: false, senior: true },
    icon: 'FileText'
  },
  {
    id: 'ai_email_drafter',
    name: 'AI Email Drafter',
    description: 'AI-generated professional sales emails',
    category: 'ai_tools',
    routes: ['/email-drafter'],
    apiEndpoints: ['/api/email-drafter/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Mail'
  },
  {
    id: 'marketing_generator',
    name: 'Marketing Materials',
    description: 'AI-powered flyer and marketing creation',
    category: 'ai_tools',
    routes: ['/marketing', '/flyers'],
    apiEndpoints: ['/api/marketing/*', '/api/flyers/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Image'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENT MANAGEMENT (ACTIVE agents and above)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'esign_documents',
    name: 'E-Sign Documents',
    description: 'Document templates and e-signature workflows',
    category: 'documents',
    routes: ['/esign/*', '/documents'],
    apiEndpoints: ['/api/esign/*', '/api/documents/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'FileSignature'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMUNICATION (ACTIVE agents and above)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'referral_management',
    name: 'Referral Management',
    description: 'Track and manage merchant referrals',
    category: 'communication',
    routes: ['/referrals'],
    apiEndpoints: ['/api/referrals/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Users'
  },
  {
    id: 'meeting_recording',
    name: 'Meeting Recording',
    description: 'Record meetings with AI transcription',
    category: 'communication',
    routes: ['/meetings', '/recordings'],
    apiEndpoints: ['/api/meetings/*', '/api/recordings/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Video'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS (Varies by stage)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'my_analytics',
    name: 'My Analytics',
    description: 'Personal performance dashboards',
    category: 'analytics',
    routes: ['/my-work', '/my-analytics'],
    apiEndpoints: ['/api/my-analytics/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'BarChart2'
  },
  {
    id: 'pipeline_analytics',
    name: 'Pipeline Analytics',
    description: 'Team/org pipeline performance data',
    category: 'analytics',
    routes: ['/pipeline-analytics', '/analytics'],
    apiEndpoints: ['/api/pipeline-analytics/*'],
    roleDefaults: { admin: true, manager: true, agent: false },
    stageDefaults: { trainee: false, active: false, senior: true },
    icon: 'TrendingUp'
  },
  {
    id: 'team_leaderboard',
    name: 'Team Leaderboard',
    description: 'Competitive leaderboard with achievements',
    category: 'analytics',
    routes: ['/leaderboard'],
    apiEndpoints: ['/api/leaderboard/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Trophy'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TEAM MANAGEMENT (Managers and above)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'team_management',
    name: 'Team Management',
    description: 'Manage team members and invitations',
    category: 'team_management',
    routes: ['/team-management', '/team'],
    apiEndpoints: ['/api/team/*', '/api/invitations/*'],
    roleDefaults: { admin: true, manager: true, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'Users'
  },
  {
    id: 'team_pipeline',
    name: 'Team Pipeline View',
    description: 'View entire team pipeline and deals',
    category: 'team_management',
    routes: ['/team-pipeline'],
    apiEndpoints: ['/api/team-pipeline/*'],
    roleDefaults: { admin: true, manager: true, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'Eye'
  },
  {
    id: 'activity_feed',
    name: 'Activity Feed',
    description: 'Team activity stream',
    category: 'team_management',
    routes: ['/activity'],
    apiEndpoints: ['/api/activity/*'],
    roleDefaults: { admin: true, manager: true, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'Activity'
  },
  {
    id: 'user_permissions',
    name: 'User Permissions',
    description: 'Manage user roles, stages, and feature access',
    category: 'team_management',
    routes: ['/admin/permissions', '/permissions'],
    apiEndpoints: ['/api/permissions/*', '/api/users/*/permissions'],
    roleDefaults: { admin: true, manager: true, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'Shield'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN ONLY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'admin_dashboard',
    name: 'Admin Dashboard',
    description: 'Organization admin overview and settings',
    category: 'team_management',
    routes: ['/admin', '/admin/*'],
    apiEndpoints: ['/api/admin/*'],
    roleDefaults: { admin: true, manager: false, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'Settings'
  },
  {
    id: 'feature_toggles',
    name: 'Feature Toggles',
    description: 'Organization-wide feature enable/disable',
    category: 'team_management',
    routes: ['/admin/features'],
    apiEndpoints: ['/api/features/*'],
    roleDefaults: { admin: true, manager: false, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'ToggleLeft'
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PermissionPreset {
  id: string;
  name: string;
  description: string;
  targetRole: UserRole;
  targetStage?: AgentStage;
  overrides: Record<string, boolean>;
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'training_only',
    name: 'Training Only (New Agent)',
    description: 'Only AI Coaching, Role Play, Presentation Training, EquipIQ, Sales Spark',
    targetRole: 'agent',
    targetStage: 'trainee',
    overrides: {}  // No overrides needed - trainee defaults are correct
  },
  {
    id: 'active_seller',
    name: 'Active Seller',
    description: 'Training + Drops, Pipeline/CRM, basic AI tools',
    targetRole: 'agent',
    targetStage: 'active',
    overrides: {}
  },
  {
    id: 'full_agent',
    name: 'Full Agent (Senior)',
    description: 'All agent features including Proposal/Statement Analyzer',
    targetRole: 'agent',
    targetStage: 'senior',
    overrides: {}
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Full agent + team oversight features',
    targetRole: 'manager',
    overrides: {}
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Central permission evaluation function.
 * 
 * Resolution order:
 * 1. Admin role => allow ALL
 * 2. Critical features => always allowed
 * 3. Explicit per-user overrides
 * 4. Stage defaults (for agents)
 * 5. Role defaults
 * 6. Deny by default
 */
export function evaluatePermission(
  featureId: string,
  userPermissions: UserPermissions
): boolean {
  const feature = getFeatureById(featureId);
  
  // Unknown feature => deny
  if (!feature) {
    console.warn(`Unknown feature: ${featureId}`);
    return false;
  }
  
  // Critical features are always allowed
  if (feature.isCritical) {
    return true;
  }
  
  // Admin => allow all
  if (userPermissions.role === 'admin') {
    return true;
  }
  
  // Check explicit override first
  if (userPermissions.overrides[featureId] !== undefined) {
    return userPermissions.overrides[featureId];
  }
  
  // For agents, check stage defaults
  if (userPermissions.role === 'agent' && userPermissions.agentStage) {
    return feature.stageDefaults[userPermissions.agentStage];
  }
  
  // Fall back to role defaults
  return feature.roleDefaults[userPermissions.role];
}

/**
 * Get all effective permissions for a user
 */
export function getEffectivePermissions(
  userPermissions: UserPermissions
): EffectivePermissions {
  const features: Record<string, boolean> = {};
  
  for (const feature of FEATURES) {
    features[feature.id] = evaluatePermission(feature.id, userPermissions);
  }
  
  return {
    role: userPermissions.role,
    agentStage: userPermissions.agentStage,
    features,
    canManagePermissions: userPermissions.role === 'admin' || userPermissions.role === 'manager',
    canViewTeam: userPermissions.role === 'admin' || userPermissions.role === 'manager'
  };
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(
  route: string,
  userPermissions: UserPermissions
): { allowed: boolean; blockedByFeature?: string } {
  // Find feature that controls this route
  const feature = getFeatureByRoute(route);
  
  // No feature controls this route => allow
  if (!feature) {
    return { allowed: true };
  }
  
  const allowed = evaluatePermission(feature.id, userPermissions);
  
  return {
    allowed,
    blockedByFeature: allowed ? undefined : feature.id
  };
}

/**
 * Check if user can access a specific API endpoint
 */
export function canAccessApi(
  endpoint: string,
  userPermissions: UserPermissions
): { allowed: boolean; blockedByFeature?: string } {
  // Find feature that controls this endpoint
  const feature = getFeatureByApiEndpoint(endpoint);
  
  // No feature controls this endpoint => allow
  if (!feature) {
    return { allowed: true };
  }
  
  const allowed = evaluatePermission(feature.id, userPermissions);
  
  return {
    allowed,
    blockedByFeature: allowed ? undefined : feature.id
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getFeatureById(id: string): FeatureDefinition | undefined {
  return FEATURES.find(f => f.id === id);
}

export function getFeaturesByCategory(category: FeatureCategory): FeatureDefinition[] {
  return FEATURES.filter(f => f.category === category);
}

export function getFeatureByRoute(route: string): FeatureDefinition | undefined {
  return FEATURES.find(f => {
    return f.routes.some(pattern => {
      // Exact match
      if (pattern === route) return true;
      
      // Wildcard match (e.g., '/deals/*' matches '/deals/123')
      if (pattern.endsWith('/*')) {
        const base = pattern.slice(0, -2);
        return route.startsWith(base);
      }
      
      // Parameterized route (e.g., '/merchants/:id')
      const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(route);
    });
  });
}

export function getFeatureByApiEndpoint(endpoint: string): FeatureDefinition | undefined {
  return FEATURES.find(f => {
    if (!f.apiEndpoints) return false;
    
    return f.apiEndpoints.some(pattern => {
      // Exact match
      if (pattern === endpoint) return true;
      
      // Wildcard match
      if (pattern.endsWith('/*')) {
        const base = pattern.slice(0, -2);
        return endpoint.startsWith(base);
      }
      
      return false;
    });
  });
}

export function getTrainingFeatures(): FeatureDefinition[] {
  return FEATURES.filter(f => f.stageDefaults.trainee === true);
}

export function getCriticalFeatures(): FeatureDefinition[] {
  return FEATURES.filter(f => f.isCritical);
}

/**
 * Get features grouped by what stage they become available
 */
export function getFeaturesByStageUnlock(): {
  trainee: FeatureDefinition[];
  active: FeatureDefinition[];
  senior: FeatureDefinition[];
  managerOnly: FeatureDefinition[];
  adminOnly: FeatureDefinition[];
} {
  return {
    trainee: FEATURES.filter(f => f.stageDefaults.trainee && f.roleDefaults.agent),
    active: FEATURES.filter(f => !f.stageDefaults.trainee && f.stageDefaults.active && f.roleDefaults.agent),
    senior: FEATURES.filter(f => !f.stageDefaults.active && f.stageDefaults.senior && f.roleDefaults.agent),
    managerOnly: FEATURES.filter(f => f.roleDefaults.manager && !f.roleDefaults.agent),
    adminOnly: FEATURES.filter(f => f.roleDefaults.admin && !f.roleDefaults.manager)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that enabling a feature won't violate dependencies
 */
export function validateFeatureAccess(
  featureId: string,
  userPermissions: UserPermissions
): { valid: boolean; missingDependencies: string[] } {
  const feature = getFeatureById(featureId);
  if (!feature) {
    return { valid: false, missingDependencies: [] };
  }
  
  if (!feature.dependencies || feature.dependencies.length === 0) {
    return { valid: true, missingDependencies: [] };
  }
  
  const missingDependencies = feature.dependencies.filter(
    depId => !evaluatePermission(depId, userPermissions)
  );
  
  return {
    valid: missingDependencies.length === 0,
    missingDependencies
  };
}
