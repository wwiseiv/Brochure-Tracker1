/**
 * PCBancard RBAC - Permission-Aware Navigation
 * 
 * Navigation that automatically hides items the user can't access.
 * This is UX only - backend middleware handles actual security.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Target,
  Building2,
  MapPin,
  Package,
  FileText,
  FileSearch,
  Mail,
  Image,
  Zap,
  MessageSquare,
  Users,
  GraduationCap,
  Cpu,
  Sun,
  Bot,
  Shield,
  BarChart2,
  TrendingUp,
  Trophy,
  Settings,
  HelpCircle,
  Eye,
  Activity,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { usePermissions, RequireFeature } from '../contexts/PermissionContext';

// ═══════════════════════════════════════════════════════════════════════════════
// NAV ITEM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  featureId?: string;  // If set, only show if user has this feature
  roleRequired?: 'manager' | 'admin';  // If set, only show for this role+
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  collapsed?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAV CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/', icon: <Home className="w-5 h-5" /> }
    ]
  },
  {
    label: 'Sales Training',
    items: [
      { id: 'sales-spark', label: 'Sales Spark', path: '/coach', icon: <Zap className="w-5 h-5" />, featureId: 'sales_spark' },
      { id: 'ai-coaching', label: 'AI Coaching', path: '/coaching', icon: <MessageSquare className="w-5 h-5" />, featureId: 'ai_coaching' },
      { id: 'role-play', label: 'Practice Role Play', path: '/role-play', icon: <Users className="w-5 h-5" />, featureId: 'role_play' },
      { id: 'presentation', label: 'Teach Me The Presentation', path: '/presentation-training', icon: <GraduationCap className="w-5 h-5" />, featureId: 'presentation_training' },
      { id: 'equipiq', label: 'EquipIQ', path: '/equipiq', icon: <Cpu className="w-5 h-5" />, featureId: 'equipiq' },
      { id: 'daily-edge', label: 'Daily Edge', path: '/daily-edge', icon: <Sun className="w-5 h-5" />, featureId: 'daily_edge' }
    ]
  },
  {
    label: 'CRM & Pipeline',
    items: [
      { id: 'pipeline', label: 'Deal Pipeline', path: '/pipeline', icon: <Target className="w-5 h-5" />, featureId: 'deal_pipeline' },
      { id: 'merchants', label: 'Merchants', path: '/merchants', icon: <Building2 className="w-5 h-5" />, featureId: 'merchant_crm' },
      { id: 'today', label: "Today's Actions", path: '/today', icon: <Activity className="w-5 h-5" />, featureId: 'today_dashboard' },
      { id: 'prospects', label: 'Prospect Finder', path: '/prospects/search', icon: <FileSearch className="w-5 h-5" />, featureId: 'prospect_finder' }
    ]
  },
  {
    label: 'Drops & Inventory',
    items: [
      { id: 'drops', label: 'Drops', path: '/drops', icon: <MapPin className="w-5 h-5" />, featureId: 'drop_logging' },
      { id: 'inventory', label: 'Inventory', path: '/inventory', icon: <Package className="w-5 h-5" />, featureId: 'brochure_inventory' }
    ]
  },
  {
    label: 'AI Tools',
    items: [
      { id: 'statement', label: 'Statement Analyzer', path: '/statement-analyzer', icon: <FileSearch className="w-5 h-5" />, featureId: 'statement_analyzer' },
      { id: 'proposal', label: 'Proposal Generator', path: '/proposal-generator', icon: <FileText className="w-5 h-5" />, featureId: 'proposal_generator' },
      { id: 'email', label: 'Email Drafter', path: '/email-drafter', icon: <Mail className="w-5 h-5" />, featureId: 'ai_email_drafter' },
      { id: 'marketing', label: 'Marketing Materials', path: '/marketing', icon: <Image className="w-5 h-5" />, featureId: 'marketing_generator' }
    ]
  },
  {
    label: 'Analytics',
    items: [
      { id: 'my-analytics', label: 'My Analytics', path: '/my-work', icon: <BarChart2 className="w-5 h-5" />, featureId: 'my_analytics' },
      { id: 'pipeline-analytics', label: 'Pipeline Analytics', path: '/pipeline-analytics', icon: <TrendingUp className="w-5 h-5" />, featureId: 'pipeline_analytics' },
      { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: <Trophy className="w-5 h-5" />, featureId: 'team_leaderboard' }
    ]
  },
  {
    label: 'Team',
    items: [
      { id: 'team-pipeline', label: 'Team Pipeline', path: '/team-pipeline', icon: <Eye className="w-5 h-5" />, featureId: 'team_pipeline' },
      { id: 'activity', label: 'Activity Feed', path: '/activity', icon: <Activity className="w-5 h-5" />, featureId: 'activity_feed' },
      { id: 'team', label: 'Team Management', path: '/team-management', icon: <Users className="w-5 h-5" />, featureId: 'team_management' },
      { id: 'permissions', label: 'User Permissions', path: '/admin/permissions', icon: <Shield className="w-5 h-5" />, featureId: 'user_permissions' }
    ]
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
      { id: 'help', label: 'Help Center', path: '/help', icon: <HelpCircle className="w-5 h-5" /> }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN NAVIGATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function MainNavigation() {
  const location = useLocation();
  const { role, agentStage, hasFeature, hasRole } = usePermissions();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());
  
  const toggleGroup = (label: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(label)) {
      newCollapsed.delete(label);
    } else {
      newCollapsed.add(label);
    }
    setCollapsedGroups(newCollapsed);
  };
  
  // Filter items based on permissions
  const filterItem = (item: NavItem): boolean => {
    if (item.featureId && !hasFeature(item.featureId)) return false;
    if (item.roleRequired && !hasRole(item.roleRequired)) return false;
    return true;
  };
  
  // Filter groups to only show non-empty ones
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(filterItem)
  })).filter(group => group.items.length > 0);
  
  return (
    <nav className="w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      {/* Logo/Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          PCBancard
        </h1>
        {/* Show current stage badge for agents */}
        {role === 'agent' && agentStage && (
          <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full
                          ${agentStage === 'trainee' ? 'bg-amber-100 text-amber-700' : ''}
                          ${agentStage === 'active' ? 'bg-green-100 text-green-700' : ''}
                          ${agentStage === 'senior' ? 'bg-purple-100 text-purple-700' : ''}`}>
            {agentStage.charAt(0).toUpperCase() + agentStage.slice(1)} Agent
          </span>
        )}
        {role === 'manager' && (
          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            Manager
          </span>
        )}
        {role === 'admin' && (
          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            Admin
          </span>
        )}
      </div>
      
      {/* Nav Groups */}
      <div className="p-2">
        {visibleGroups.map((group, idx) => {
          const isCollapsed = collapsedGroups.has(group.label);
          
          return (
            <div key={group.label} className={idx > 0 ? 'mt-4' : ''}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
              >
                {group.label}
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {/* Group Items */}
              {!isCollapsed && (
                <ul className="space-y-1">
                  {group.items.map(item => {
                    const isActive = location.pathname === item.path || 
                                    (item.path !== '/' && location.pathname.startsWith(item.path));
                    
                    return (
                      <li key={item.id}>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                                     ${isActive 
                                       ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                                       : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          {item.icon}
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE BOTTOM NAV
// ═══════════════════════════════════════════════════════════════════════════════

const MOBILE_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', path: '/', icon: <Home className="w-5 h-5" /> },
  { id: 'coach', label: 'Coach', path: '/coach', icon: <Zap className="w-5 h-5" />, featureId: 'sales_spark' },
  { id: 'pipeline', label: 'Pipeline', path: '/pipeline', icon: <Target className="w-5 h-5" />, featureId: 'deal_pipeline' },
  { id: 'drops', label: 'Drops', path: '/drops', icon: <MapPin className="w-5 h-5" />, featureId: 'drop_logging' },
  { id: 'more', label: 'More', path: '/more', icon: <Settings className="w-5 h-5" /> }
];

export function MobileBottomNav() {
  const location = useLocation();
  const { hasFeature } = usePermissions();
  
  // Filter items based on permissions
  const visibleItems = MOBILE_NAV_ITEMS.filter(item => {
    if (item.featureId && !hasFeature(item.featureId)) return false;
    return true;
  });
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden safe-area-pb">
      <ul className="flex justify-around">
        {visibleItems.map(item => {
          const isActive = location.pathname === item.path;
          
          return (
            <li key={item.id}>
              <Link
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-3 min-w-[64px]
                           ${isActive 
                             ? 'text-blue-600 dark:text-blue-400' 
                             : 'text-gray-500 dark:text-gray-400'}`}
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACCESS FOR TRAINING-ONLY USERS
// ═══════════════════════════════════════════════════════════════════════════════

export function TrainingOnlyQuickAccess() {
  const { role, agentStage, hasFeature } = usePermissions();
  
  // Only show for trainee agents
  if (role !== 'agent' || agentStage !== 'trainee') {
    return null;
  }
  
  const trainingFeatures = [
    { id: 'sales_spark', label: 'Sales Spark', path: '/coach', icon: <Zap className="w-6 h-6" />, color: 'bg-amber-500' },
    { id: 'role_play', label: 'Role Play', path: '/role-play', icon: <Users className="w-6 h-6" />, color: 'bg-green-500' },
    { id: 'presentation_training', label: 'Presentation', path: '/presentation-training', icon: <GraduationCap className="w-6 h-6" />, color: 'bg-blue-500' },
    { id: 'equipiq', label: 'EquipIQ', path: '/equipiq', icon: <Cpu className="w-6 h-6" />, color: 'bg-purple-500' }
  ].filter(f => hasFeature(f.id));
  
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 mb-6">
      <h2 className="text-xl font-bold text-white mb-2">Training Mode</h2>
      <p className="text-blue-100 mb-4">
        Complete your training to unlock more features!
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {trainingFeatures.map(feature => (
          <Link
            key={feature.id}
            to={feature.path}
            className="flex flex-col items-center gap-2 p-4 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <div className={`p-3 ${feature.color} rounded-full text-white`}>
              {feature.icon}
            </div>
            <span className="text-white text-sm font-medium text-center">
              {feature.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
