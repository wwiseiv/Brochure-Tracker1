/**
 * PCBancard RBAC + Feature Access Control System
 * 
 * This is the SINGLE SOURCE OF TRUTH for all permissions.
 * 
 * Permission Resolution Order:
 * 1. Admin role => allow ALL
 * 2. Critical feature => ALLOW (login, profile, help)
 * 3. Explicit per-user overrides (allow/deny)
 * 4. Agent stage defaults (trainee/active/senior)
 * 5. Role defaults (manager/agent)
 * 6. Deny by default
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
  routes: string[];
  apiEndpoints?: string[];
  dependencies?: string[];
  roleDefaults: {
    admin: boolean;
    manager: boolean;
    agent: boolean;
  };
  stageDefaults: {
    trainee: boolean;
    active: boolean;
    senior: boolean;
  };
  isCritical?: boolean;
  icon?: string;
}

export interface UserPermissionsData {
  userId: string;
  organizationId: number;
  role: UserRole;
  agentStage?: AgentStage;
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
// ROLE/STAGE HIERARCHY
// ═══════════════════════════════════════════════════════════════════════════════

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  agent: 1,
  manager: 2,
  admin: 3
};

export const STAGE_HIERARCHY: Record<AgentStage, number> = {
  trainee: 1,
  active: 2,
  senior: 3
};

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
    id: 'sales_process_2026',
    name: '2026 Sales Process',
    description: 'Prospecting to Close training with scripts and objections',
    category: 'sales_training',
    routes: ['/sales-process'],
    apiEndpoints: ['/api/sales-process/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Target'
  },
  {
    id: 'ai_help_assistant',
    name: 'AI Help Assistant',
    description: 'Claude-powered floating help chatbot',
    category: 'sales_training',
    routes: [],
    apiEndpoints: ['/api/ai-help/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Bot'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE CRM FEATURES (Available to ALL agents including trainees)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'deal_pipeline',
    name: 'Deal Pipeline',
    description: '14-stage Kanban deal tracking system',
    category: 'core_crm',
    routes: ['/pipeline', '/deals', '/deals/*', '/prospects/pipeline'],
    apiEndpoints: ['/api/deals/*', '/api/pipeline/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Target'
  },
  {
    id: 'merchant_profiles',
    name: 'Merchant Profiles',
    description: 'Comprehensive merchant profiles and history',
    category: 'core_crm',
    routes: ['/merchants', '/merchants/*', '/crm'],
    apiEndpoints: ['/api/merchants/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
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
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Calendar'
  },
  {
    id: 'ai_prospect_finder',
    name: 'AI Prospect Finder',
    description: 'Grok-4 powered local business discovery',
    category: 'core_crm',
    routes: ['/prospects/search', '/prospect-finder', '/prospects'],
    apiEndpoints: ['/api/prospects/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
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
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'CreditCard'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BROCHURE & DROP MANAGEMENT (Available to ALL agents)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'drop_management',
    name: 'Drop Logging',
    description: 'Log brochure drops with GPS and voice notes',
    category: 'brochure_management',
    routes: ['/scan', '/drops', '/drops/*', '/drops/new', '/history'],
    apiEndpoints: ['/api/drops/*', '/api/brochures/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
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
    stageDefaults: { trainee: true, active: true, senior: true },
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
  {
    id: 'referral_tracking',
    name: 'Referral Management',
    description: 'Track and manage merchant referrals',
    category: 'brochure_management',
    routes: ['/referrals'],
    apiEndpoints: ['/api/referrals/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'UserPlus'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AI-POWERED SALES TOOLS (Available to active agents and above)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'statement_analyzer',
    name: 'Statement Analyzer',
    description: 'AI analysis of merchant processing statements',
    category: 'ai_tools',
    routes: ['/statement-analyzer'],
    apiEndpoints: ['/api/statement-analyzer/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'FileSearch'
  },
  {
    id: 'proposal_generator',
    name: 'Proposal Generator',
    description: 'AI-powered proposal and quote generation',
    category: 'ai_tools',
    routes: ['/proposal-generator', '/proposals'],
    apiEndpoints: ['/api/proposals/*', '/api/proposal-generator/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'FileText'
  },
  {
    id: 'email_drafter',
    name: 'AI Email Drafter',
    description: 'AI-powered email composition',
    category: 'ai_tools',
    routes: ['/email', '/email-drafter'],
    apiEndpoints: ['/api/email-drafter/*', '/api/ai/draft-email'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Mail'
  },
  {
    id: 'marketing_materials',
    name: 'Marketing Materials',
    description: 'Industry-specific flyer templates',
    category: 'ai_tools',
    routes: ['/marketing', '/marketing-materials'],
    apiEndpoints: ['/api/marketing/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Image'
  },
  {
    id: 'meeting_recording',
    name: 'Meeting Recording',
    description: 'Record and analyze sales meetings',
    category: 'ai_tools',
    routes: ['/meetings'],
    apiEndpoints: ['/api/meetings/*', '/api/recordings/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'Video'
  },
  {
    id: 'esign_integration',
    name: 'E-Sign Integration',
    description: 'SignNow document signing',
    category: 'documents',
    routes: ['/esign'],
    apiEndpoints: ['/api/esign/*', '/api/signnow/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'PenTool'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS FEATURES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'my_analytics',
    name: 'My Analytics',
    description: 'Personal performance analytics',
    category: 'analytics',
    routes: ['/my-work', '/my-analytics'],
    apiEndpoints: ['/api/my-work/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: true, active: true, senior: true },
    icon: 'BarChart2'
  },
  {
    id: 'pipeline_analytics',
    name: 'Pipeline Analytics',
    description: 'Pipeline performance metrics',
    category: 'analytics',
    routes: ['/pipeline-analytics'],
    apiEndpoints: ['/api/pipeline-analytics/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: false, senior: true },
    icon: 'TrendingUp'
  },
  {
    id: 'team_leaderboard',
    name: 'Team Leaderboard',
    description: 'Agent performance rankings',
    category: 'analytics',
    routes: ['/leaderboard'],
    apiEndpoints: ['/api/leaderboard/*'],
    roleDefaults: { admin: true, manager: true, agent: true },
    stageDefaults: { trainee: false, active: true, senior: true },
    icon: 'Trophy'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TEAM MANAGEMENT FEATURES (Manager+)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'team_management',
    name: 'Team Management',
    description: 'Manage team members and settings',
    category: 'team_management',
    routes: ['/team-management', '/team'],
    apiEndpoints: ['/api/team/*'],
    roleDefaults: { admin: true, manager: true, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'Users'
  },
  {
    id: 'team_pipeline',
    name: 'Team Pipeline',
    description: 'View team pipeline and deals',
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
    routes: ['/activity', '/activity-feed'],
    apiEndpoints: ['/api/activity/*'],
    roleDefaults: { admin: true, manager: true, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'Activity'
  },
  {
    id: 'user_permissions',
    name: 'User Permissions',
    description: 'Manage user access and permissions',
    category: 'team_management',
    routes: ['/admin/permissions', '/permissions'],
    apiEndpoints: ['/api/permissions/*'],
    roleDefaults: { admin: true, manager: true, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'Shield'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN ONLY FEATURES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'admin_dashboard',
    name: 'Admin Dashboard',
    description: 'Organization settings and admin tools',
    category: 'system',
    routes: ['/admin', '/admin/dashboard'],
    apiEndpoints: ['/api/admin/*'],
    roleDefaults: { admin: true, manager: false, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'Settings'
  },
  {
    id: 'feature_toggles',
    name: 'Feature Toggles',
    description: 'Organization-wide feature toggles',
    category: 'system',
    routes: ['/admin/features'],
    apiEndpoints: ['/api/org-features/*'],
    roleDefaults: { admin: true, manager: false, agent: false },
    stageDefaults: { trainee: false, active: false, senior: false },
    icon: 'ToggleLeft'
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PermissionPreset {
  id: string;
  name: string;
  description: string;
  role: UserRole;
  agentStage?: AgentStage;
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'training_only',
    name: 'Training Only',
    description: 'New agent with access to training features only',
    role: 'agent',
    agentStage: 'trainee'
  },
  {
    id: 'active_seller',
    name: 'Active Seller',
    description: 'Field-ready agent with CRM and drop access',
    role: 'agent',
    agentStage: 'active'
  },
  {
    id: 'full_agent',
    name: 'Full Agent',
    description: 'Senior agent with all agent features',
    role: 'agent',
    agentStage: 'senior'
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Team manager with oversight capabilities',
    role: 'manager'
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function getFeatureById(featureId: string): FeatureDefinition | undefined {
  return FEATURES.find(f => f.id === featureId);
}

export function getTrainingFeatures(): FeatureDefinition[] {
  return FEATURES.filter(f => 
    f.category === 'sales_training' && f.stageDefaults.trainee
  );
}

export function getFeaturesByStageUnlock(): {
  trainee: FeatureDefinition[];
  active: FeatureDefinition[];
  senior: FeatureDefinition[];
  managerOnly: FeatureDefinition[];
  adminOnly: FeatureDefinition[];
} {
  return {
    trainee: FEATURES.filter(f => f.stageDefaults.trainee),
    active: FEATURES.filter(f => f.stageDefaults.active && !f.stageDefaults.trainee),
    senior: FEATURES.filter(f => f.stageDefaults.senior && !f.stageDefaults.active),
    managerOnly: FEATURES.filter(f => f.roleDefaults.manager && !f.roleDefaults.agent),
    adminOnly: FEATURES.filter(f => f.roleDefaults.admin && !f.roleDefaults.manager)
  };
}

/**
 * Evaluate if a user has access to a specific feature
 */
export function evaluatePermission(featureId: string, permissions: UserPermissionsData): boolean {
  const feature = getFeatureById(featureId);
  if (!feature) return false;

  // 1. Admin role => allow ALL
  if (permissions.role === 'admin') return true;

  // 2. Critical features => always allowed
  if (feature.isCritical) return true;

  // 3. Explicit per-user overrides
  if (featureId in permissions.overrides) {
    return permissions.overrides[featureId];
  }

  // 4. Agent stage defaults (only for agent role)
  if (permissions.role === 'agent' && permissions.agentStage) {
    return feature.stageDefaults[permissions.agentStage];
  }

  // 5. Role defaults
  return feature.roleDefaults[permissions.role];
}

/**
 * Get all effective permissions for a user
 */
export function getEffectivePermissions(permissions: UserPermissionsData): EffectivePermissions {
  const features: Record<string, boolean> = {};
  
  for (const feature of FEATURES) {
    features[feature.id] = evaluatePermission(feature.id, permissions);
  }

  return {
    role: permissions.role,
    agentStage: permissions.agentStage,
    features,
    canManagePermissions: permissions.role === 'admin' || permissions.role === 'manager',
    canViewTeam: permissions.role === 'admin' || permissions.role === 'manager'
  };
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(path: string, permissions: UserPermissionsData): { allowed: boolean; blockedByFeature?: string } {
  for (const feature of FEATURES) {
    for (const route of feature.routes) {
      if (route.endsWith('/*')) {
        const basePath = route.slice(0, -2);
        if (path.startsWith(basePath)) {
          const allowed = evaluatePermission(feature.id, permissions);
          if (!allowed) {
            return { allowed: false, blockedByFeature: feature.id };
          }
        }
      } else if (path === route || path.startsWith(route + '/')) {
        const allowed = evaluatePermission(feature.id, permissions);
        if (!allowed) {
          return { allowed: false, blockedByFeature: feature.id };
        }
      }
    }
  }
  return { allowed: true };
}

/**
 * Check if user can access a specific API endpoint
 */
export function canAccessApi(path: string, permissions: UserPermissionsData): { allowed: boolean; blockedByFeature?: string } {
  for (const feature of FEATURES) {
    if (!feature.apiEndpoints) continue;
    
    for (const endpoint of feature.apiEndpoints) {
      if (endpoint.endsWith('/*')) {
        const basePath = endpoint.slice(0, -2);
        if (path.startsWith(basePath)) {
          const allowed = evaluatePermission(feature.id, permissions);
          if (!allowed) {
            return { allowed: false, blockedByFeature: feature.id };
          }
        }
      } else if (path === endpoint) {
        const allowed = evaluatePermission(feature.id, permissions);
        if (!allowed) {
          return { allowed: false, blockedByFeature: feature.id };
        }
      }
    }
  }
  return { allowed: true };
}

/**
 * Map existing org member role to RBAC role
 */
export function mapOrgRoleToUserRole(orgRole: string): UserRole {
  switch (orgRole) {
    case 'master_admin':
    case 'owner':
    case 'admin':
      return 'admin';
    case 'relationship_manager':
    case 'manager':
      return 'manager';
    default:
      return 'agent';
  }
}

/**
 * Check if user has at least a certain role level
 */
export function hasMinRole(currentRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Check if user has at least a certain stage level (agents only, managers+ bypass)
 */
export function hasMinStage(permissions: UserPermissionsData, minStage: AgentStage): boolean {
  if (permissions.role !== 'agent') return true;
  if (!permissions.agentStage) return false;
  return STAGE_HIERARCHY[permissions.agentStage] >= STAGE_HIERARCHY[minStage];
}
