/**
 * PCBancard RBAC - React Permission Context
 * 
 * Provides permission checking throughout the React app:
 * - usePermissions() - get full permission state
 * - useFeatureAccess() - check single feature
 * - useRole() - check role level
 * - useStage() - check agent stage
 * - <RequireFeature> - gate component rendering
 * - <RequireRole> - gate by role
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserRole,
  AgentStage,
  FeatureDefinition,
  FEATURES,
  evaluatePermission,
  getEffectivePermissions,
  UserPermissions
} from '../../shared/permissions';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PermissionContextValue {
  // Current user's permissions
  role: UserRole | null;
  agentStage: AgentStage | null;
  overrides: Record<string, boolean>;
  
  // Effective feature access
  features: Record<string, boolean>;
  
  // Meta permissions
  canManagePermissions: boolean;
  canViewTeam: boolean;
  
  // Loading state
  isLoading: boolean;
  error: Error | null;
  
  // Check functions
  hasFeature: (featureId: string) => boolean;
  hasRole: (minRole: UserRole) => boolean;
  hasStage: (minStage: AgentStage) => boolean;
  
  // Get feature info
  getFeatureInfo: (featureId: string) => FeatureDefinition | undefined;
  getAccessibleFeatures: () => string[];
  getBlockedFeatures: () => string[];
  
  // Refresh
  refresh: () => void;
}

interface ApiPermissionResponse {
  userId: number;
  organizationId: number;
  role: UserRole;
  agentStage: AgentStage;
  overrides: Record<string, boolean>;
  effectiveFeatures: Record<string, boolean>;
  canManagePermissions: boolean;
  canViewTeam: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE/STAGE HIERARCHY
// ═══════════════════════════════════════════════════════════════════════════════

const ROLE_HIERARCHY: Record<UserRole, number> = {
  agent: 1,
  manager: 2,
  admin: 3
};

const STAGE_HIERARCHY: Record<AgentStage, number> = {
  trainee: 1,
  active: 2,
  senior: 3
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  // Fetch permissions from API
  const { data, isLoading, error, refetch } = useQuery<ApiPermissionResponse>({
    queryKey: ['permissions', 'me'],
    queryFn: async () => {
      const response = await fetch('/api/permissions/me');
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - return null permissions
          return null;
        }
        throw new Error('Failed to fetch permissions');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });

  // Check if user has access to a feature
  const hasFeature = useCallback((featureId: string): boolean => {
    if (!data) return false;
    return data.effectiveFeatures[featureId] ?? false;
  }, [data]);

  // Check if user has at least a certain role
  const hasRole = useCallback((minRole: UserRole): boolean => {
    if (!data) return false;
    return ROLE_HIERARCHY[data.role] >= ROLE_HIERARCHY[minRole];
  }, [data]);

  // Check if user has at least a certain stage (agents only, managers+ bypass)
  const hasStage = useCallback((minStage: AgentStage): boolean => {
    if (!data) return false;
    if (data.role !== 'agent') return true; // Non-agents bypass stage checks
    return STAGE_HIERARCHY[data.agentStage] >= STAGE_HIERARCHY[minStage];
  }, [data]);

  // Get feature info
  const getFeatureInfo = useCallback((featureId: string): FeatureDefinition | undefined => {
    return FEATURES.find(f => f.id === featureId);
  }, []);

  // Get list of accessible features
  const getAccessibleFeatures = useCallback((): string[] => {
    if (!data) return [];
    return Object.entries(data.effectiveFeatures)
      .filter(([, allowed]) => allowed)
      .map(([id]) => id);
  }, [data]);

  // Get list of blocked features
  const getBlockedFeatures = useCallback((): string[] => {
    if (!data) return [];
    return Object.entries(data.effectiveFeatures)
      .filter(([, allowed]) => !allowed)
      .map(([id]) => id);
  }, [data]);

  const value: PermissionContextValue = {
    role: data?.role ?? null,
    agentStage: data?.agentStage ?? null,
    overrides: data?.overrides ?? {},
    features: data?.effectiveFeatures ?? {},
    canManagePermissions: data?.canManagePermissions ?? false,
    canViewTeam: data?.canViewTeam ?? false,
    isLoading,
    error: error as Error | null,
    hasFeature,
    hasRole,
    hasStage,
    getFeatureInfo,
    getAccessibleFeatures,
    getBlockedFeatures,
    refresh: refetch
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get full permission context
 */
export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Check if current user has access to a specific feature
 */
export function useFeatureAccess(featureId: string): boolean {
  const { hasFeature, isLoading } = usePermissions();
  
  // While loading, be conservative and deny
  if (isLoading) return false;
  
  return hasFeature(featureId);
}

/**
 * Check multiple features at once
 */
export function useMultipleFeatures(featureIds: string[]): {
  all: boolean;
  any: boolean;
  states: Record<string, boolean>;
} {
  const { hasFeature, isLoading } = usePermissions();
  
  if (isLoading) {
    return { all: false, any: false, states: {} };
  }
  
  const states: Record<string, boolean> = {};
  let all = true;
  let any = false;
  
  for (const id of featureIds) {
    const has = hasFeature(id);
    states[id] = has;
    if (!has) all = false;
    if (has) any = true;
  }
  
  return { all, any, states };
}

/**
 * Get current user's role
 */
export function useRole(): { role: UserRole | null; isAtLeast: (role: UserRole) => boolean } {
  const { role, hasRole } = usePermissions();
  return { role, isAtLeast: hasRole };
}

/**
 * Get current user's agent stage
 */
export function useAgentStage(): { stage: AgentStage | null; isAtLeast: (stage: AgentStage) => boolean } {
  const { agentStage, hasStage } = usePermissions();
  return { stage: agentStage, isAtLeast: hasStage };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUARD COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface RequireFeatureProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showLocked?: boolean;  // Show a "locked" message instead of nothing
}

/**
 * Conditionally render children based on feature access
 */
export function RequireFeature({ 
  feature, 
  children, 
  fallback = null,
  showLocked = false 
}: RequireFeatureProps) {
  const hasAccess = useFeatureAccess(feature);
  const { getFeatureInfo, agentStage, role } = usePermissions();
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (showLocked) {
    const featureInfo = getFeatureInfo(feature);
    return (
      <LockedFeatureMessage 
        featureName={featureInfo?.name || feature}
        currentStage={agentStage}
        currentRole={role}
      />
    );
  }
  
  return <>{fallback}</>;
}

interface RequireRoleProps {
  role: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on role
 */
export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const { hasRole } = usePermissions();
  
  if (hasRole(role)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface RequireStageProps {
  stage: AgentStage;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on agent stage
 */
export function RequireStage({ stage, children, fallback = null }: RequireStageProps) {
  const { hasStage } = usePermissions();
  
  if (hasStage(stage)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCKED FEATURE MESSAGE
// ═══════════════════════════════════════════════════════════════════════════════

interface LockedFeatureMessageProps {
  featureName: string;
  currentStage: AgentStage | null;
  currentRole: UserRole | null;
}

function LockedFeatureMessage({ featureName, currentStage, currentRole }: LockedFeatureMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {featureName} is Locked
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
        {currentRole === 'agent' ? (
          <>
            Your current stage is <strong>{currentStage || 'trainee'}</strong>.
            Ask your manager to upgrade your access to unlock this feature.
          </>
        ) : (
          <>This feature is not available for your role.</>
        )}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE GUARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface FeatureRouteGuardProps {
  feature: string;
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Protect an entire route based on feature access.
 * Redirects to /no-access if feature is not available.
 */
export function FeatureRouteGuard({ 
  feature, 
  children,
  redirectTo = '/no-access'
}: FeatureRouteGuardProps) {
  const hasAccess = useFeatureAccess(feature);
  const { isLoading, getFeatureInfo } = usePermissions();
  
  useEffect(() => {
    if (!isLoading && !hasAccess) {
      window.location.href = `${redirectTo}?feature=${feature}`;
    }
  }, [isLoading, hasAccess, feature, redirectTo]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!hasAccess) {
    return null; // Will redirect
  }
  
  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NO ACCESS PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function NoAccessPage() {
  const { agentStage, role, getFeatureInfo } = usePermissions();
  
  // Get feature from URL params
  const params = new URLSearchParams(window.location.search);
  const featureId = params.get('feature');
  const featureInfo = featureId ? getFeatureInfo(featureId) : null;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {featureInfo ? (
            <>
              You don't have access to <strong>{featureInfo.name}</strong>.
            </>
          ) : (
            <>You don't have permission to view this page.</>
          )}
        </p>
        
        {role === 'agent' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Your current stage is <strong>{agentStage || 'trainee'}</strong>.
              Contact your manager to request access.
            </p>
          </div>
        )}
        
        <a 
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
