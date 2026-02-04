/**
 * PCBancard User Impersonation Context
 * 
 * Provides impersonation state and actions throughout the React app:
 * - useImpersonation() - get impersonation state and actions
 * - startImpersonation() - begin impersonating a user
 * - endImpersonation() - stop impersonating
 * - isImpersonating - check if currently impersonating
 */

import { 
  createContext, 
  useContext, 
  useState,
  useEffect,
  useCallback,
  ReactNode 
} from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Session storage key for impersonation token
const IMPERSONATION_TOKEN_KEY = 'pcbancard_impersonation_token';
const IMPERSONATION_SESSION_KEY = 'pcbancard_impersonation_session';

interface ImpersonatedUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role?: string;
}

interface OriginalUser {
  userId: string;
  firstName: string;
  lastName: string;
}

interface ImpersonationSession {
  id: number;
  impersonatedUser: ImpersonatedUser;
  originalUser: OriginalUser;
  startedAt: string;
  expiresAt: string;
}

interface ImpersonationContextValue {
  isImpersonating: boolean;
  sessionToken: string | null;
  impersonatedUser: ImpersonatedUser | null;
  originalUser: OriginalUser | null;
  session: ImpersonationSession | null;
  isLoading: boolean;
  error: Error | null;
  startImpersonation: (targetUserId: string, reason?: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  availableUsers: ImpersonatableUser[];
  loadingAvailableUsers: boolean;
  canImpersonate: boolean;
}

interface ImpersonatableUser {
  id: number;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

interface StartImpersonationResponse {
  sessionId: number;
  sessionToken: string;
  impersonatedUser: ImpersonatedUser;
  expiresAt: string;
}

interface ValidateSessionResponse {
  valid: boolean;
  session: ImpersonationSession | null;
  reason?: string;
}

const ImpersonationContext = createContext<ImpersonationContextValue | undefined>(undefined);

interface ImpersonationProviderProps {
  children: ReactNode;
}

export function ImpersonationProvider({ children }: ImpersonationProviderProps) {
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
    }
    return null;
  });

  const [sessionData, setSessionData] = useState<ImpersonationSession | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(IMPERSONATION_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  // Validate existing session on load
  const { data: validationData, isLoading: validating } = useQuery<ValidateSessionResponse>({
    queryKey: ['/api/impersonation/validate', sessionToken],
    enabled: !!sessionToken,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });

  // Get available users to impersonate
  const { data: availableUsersData, isLoading: loadingAvailableUsers } = useQuery<ImpersonatableUser[]>({
    queryKey: ['/api/impersonation/available-users'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Update session state when validation completes
  useEffect(() => {
    if (validationData) {
      if (!validationData.valid) {
        // Session is invalid or expired, clear it
        setSessionToken(null);
        setSessionData(null);
        sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
        sessionStorage.removeItem(IMPERSONATION_SESSION_KEY);
      } else if (validationData.session) {
        setSessionData(validationData.session);
        sessionStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(validationData.session));
      }
    }
  }, [validationData]);

  // Start impersonation mutation
  const startMutation = useMutation({
    mutationFn: async ({ targetUserId, reason }: { targetUserId: string; reason?: string }) => {
      const response = await apiRequest('POST', '/api/impersonation/start', { targetUserId, reason });
      return await response.json() as StartImpersonationResponse;
    },
    onSuccess: (data) => {
      setSessionToken(data.sessionToken);
      sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, data.sessionToken);
      
      // Store session info
      const session: ImpersonationSession = {
        id: data.sessionId,
        impersonatedUser: data.impersonatedUser,
        originalUser: { userId: '', firstName: '', lastName: '' }, // Will be filled by validation
        startedAt: new Date().toISOString(),
        expiresAt: data.expiresAt,
      };
      setSessionData(session);
      sessionStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(session));
      
      // Invalidate queries to refresh with impersonated user's data
      queryClient.invalidateQueries();
      
      // Reload the page to fully apply impersonation
      window.location.reload();
    },
  });

  // End impersonation mutation
  const endMutation = useMutation({
    mutationFn: async () => {
      if (!sessionToken) return;
      await apiRequest('POST', '/api/impersonation/end', { sessionToken });
    },
    onSuccess: () => {
      setSessionToken(null);
      setSessionData(null);
      sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
      sessionStorage.removeItem(IMPERSONATION_SESSION_KEY);
      
      // Invalidate all queries
      queryClient.invalidateQueries();
      
      // Reload to restore original user
      window.location.reload();
    },
  });

  const startImpersonation = useCallback(async (targetUserId: string, reason?: string) => {
    await startMutation.mutateAsync({ targetUserId, reason });
  }, [startMutation]);

  const endImpersonation = useCallback(async () => {
    await endMutation.mutateAsync();
  }, [endMutation]);

  const isImpersonating = !!sessionToken && (validationData?.valid ?? !!sessionData);
  const canImpersonate = (availableUsersData?.length ?? 0) > 0;

  const value: ImpersonationContextValue = {
    isImpersonating,
    sessionToken,
    impersonatedUser: sessionData?.impersonatedUser || null,
    originalUser: sessionData?.originalUser || null,
    session: sessionData,
    isLoading: validating || startMutation.isPending || endMutation.isPending,
    error: startMutation.error || endMutation.error || null,
    startImpersonation,
    endImpersonation,
    availableUsers: availableUsersData || [],
    loadingAvailableUsers,
    canImpersonate,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}

// Hook to get the impersonation token for API requests
export function getImpersonationToken(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
  }
  return null;
}
