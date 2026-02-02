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

import { 
  createContext, 
  useContext, 
  useCallback,
  ReactNode 
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type UserRole = 'admin' | 'manager' | 'agent';
type AgentStage = 'trainee' | 'active' | 'senior';

interface PermissionContextValue {
  role: UserRole | null;
  agentStage: AgentStage | null;
  overrides: Record<string, boolean>;
  features: Record<string, boolean>;
  canManagePermissions: boolean;
  canViewTeam: boolean;
  isLoading: boolean;
  error: Error | null;
  hasFeature: (featureId: string) => boolean;
  hasRole: (minRole: UserRole) => boolean;
  hasStage: (minStage: AgentStage) => boolean;
  getAccessibleFeatures: () => string[];
  getBlockedFeatures: () => string[];
  refresh: () => void;
}

interface ApiPermissionResponse {
  userId: string;
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
  const { data, isLoading, error, refetch } = useQuery<ApiPermissionResponse | null>({
    queryKey: ['/api/permissions/me'],
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: false
  });

  const hasFeature = useCallback((featureId: string): boolean => {
    if (!data) return false;
    return data.effectiveFeatures[featureId] ?? false;
  }, [data]);

  const hasRole = useCallback((minRole: UserRole): boolean => {
    if (!data) return false;
    return ROLE_HIERARCHY[data.role] >= ROLE_HIERARCHY[minRole];
  }, [data]);

  const hasStage = useCallback((minStage: AgentStage): boolean => {
    if (!data) return false;
    if (data.role !== 'agent') return true;
    return STAGE_HIERARCHY[data.agentStage] >= STAGE_HIERARCHY[minStage];
  }, [data]);

  const getAccessibleFeatures = useCallback((): string[] => {
    if (!data) return [];
    return Object.entries(data.effectiveFeatures)
      .filter(([, allowed]) => allowed)
      .map(([id]) => id);
  }, [data]);

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

export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

export function useFeatureAccess(featureId: string): boolean {
  const { hasFeature, isLoading } = usePermissions();
  if (isLoading) return false;
  return hasFeature(featureId);
}

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

export function useRole(): { role: UserRole | null; isAtLeast: (role: UserRole) => boolean } {
  const { role, hasRole } = usePermissions();
  return { role, isAtLeast: hasRole };
}

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
  showLocked?: boolean;
}

export function RequireFeature({ 
  feature, 
  children, 
  fallback = null,
  showLocked = false 
}: RequireFeatureProps) {
  const hasAccess = useFeatureAccess(feature);
  const { agentStage, role } = usePermissions();
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (showLocked) {
    return (
      <LockedFeatureMessage 
        featureName={feature}
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
    <div className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-xl border-2 border-dashed border-muted-foreground/20">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {featureName} is Locked
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {currentRole === 'agent' ? (
          <>
            Your current stage is <strong>{currentStage || 'trainee'}</strong>.
            Ask your manager to upgrade your access to unlock this feature.
          </>
        ) : (
          <>
            This feature is not available for your current role.
            Contact an administrator for access.
          </>
        )}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NO ACCESS PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function NoAccessPage({ feature }: { feature?: string }) {
  const { agentStage, role } = usePermissions();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          {feature ? (
            <>You don't have access to {feature}.</>
          ) : (
            <>You don't have access to this page.</>
          )}
        </p>
        {role === 'agent' && (
          <p className="text-sm text-muted-foreground">
            Your current stage is <strong className="text-foreground">{agentStage || 'trainee'}</strong>.
            Contact your manager to upgrade your access.
          </p>
        )}
      </div>
    </div>
  );
}
