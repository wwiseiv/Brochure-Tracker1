/**
 * ImpersonationBanner - Displayed when a user is being impersonated
 * Shows a warning banner with the impersonated user info and option to end impersonation
 */

import { AlertTriangle, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { formatDistanceToNow } from 'date-fns';

export function ImpersonationBanner() {
  const { 
    isImpersonating, 
    impersonatedUser, 
    originalUser,
    session,
    endImpersonation,
    isLoading 
  } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  const handleEndImpersonation = async () => {
    try {
      await endImpersonation();
    } catch (error) {
      console.error('Failed to end impersonation:', error);
    }
  };

  const expiresIn = session?.expiresAt 
    ? formatDistanceToNow(new Date(session.expiresAt), { addSuffix: true })
    : null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 px-4 py-2"
      data-testid="impersonation-banner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>
              Viewing as: <span className="font-bold">{impersonatedUser.firstName} {impersonatedUser.lastName}</span>
            </span>
            {impersonatedUser.role && (
              <span className="text-xs bg-amber-600/30 px-2 py-0.5 rounded">
                {impersonatedUser.role}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {originalUser && (
            <div className="flex items-center gap-1 text-xs text-amber-800">
              <User className="h-3 w-3" />
              <span>You: {originalUser.firstName} {originalUser.lastName}</span>
            </div>
          )}
          
          {expiresIn && (
            <span className="text-xs text-amber-800">
              Expires {expiresIn}
            </span>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndImpersonation}
            disabled={isLoading}
            className="bg-white hover-elevate border-amber-600 text-amber-900"
            data-testid="button-end-impersonation"
          >
            <X className="h-4 w-4 mr-1" />
            End Session
          </Button>
        </div>
      </div>
    </div>
  );
}
