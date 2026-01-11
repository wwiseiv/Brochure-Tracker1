import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getOfflineDrops, 
  removeOfflineDrop, 
  clearOfflineDrops,
  type OfflineDrop 
} from '@/lib/offlineStore';
import { queryClient } from '@/lib/queryClient';

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingDrops: OfflineDrop[];
  pendingCount: number;
  syncPendingDrops: () => Promise<void>;
  refreshPendingDrops: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingDrops, setPendingDrops] = useState<OfflineDrop[]>([]);

  const refreshPendingDrops = useCallback(async () => {
    try {
      const drops = await getOfflineDrops();
      setPendingDrops(drops);
      if (drops.length > 0) {
        setSyncStatus('pending');
      } else {
        setSyncStatus('idle');
      }
    } catch (error) {
      console.error('[OfflineSync] Failed to get pending drops:', error);
    }
  }, []);

  const syncPendingDrops = useCallback(async () => {
    if (!navigator.onLine) {
      toast({
        title: 'Still Offline',
        description: 'Please connect to the internet to sync your drops.',
        variant: 'destructive',
      });
      return;
    }

    const drops = await getOfflineDrops();
    if (drops.length === 0) {
      setSyncStatus('idle');
      return;
    }

    setSyncStatus('syncing');
    toast({
      title: 'Syncing Drops',
      description: `Uploading ${drops.length} offline drop${drops.length > 1 ? 's' : ''}...`,
    });

    let successCount = 0;
    let errorCount = 0;

    for (const drop of drops) {
      try {
        const response = await fetch('/api/offline/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            brochureId: drop.brochureId,
            businessName: drop.businessName,
            businessType: drop.businessType,
            contactName: drop.contactName,
            businessPhone: drop.businessPhone,
            textNotes: drop.textNotes,
            latitude: drop.latitude,
            longitude: drop.longitude,
            address: drop.address,
            voiceNoteUrl: drop.voiceNoteUrl,
            pickupScheduledFor: drop.pickupScheduledFor,
            offlineCreatedAt: drop.createdAt,
          }),
        });

        if (response.ok) {
          await removeOfflineDrop(drop.id);
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('[OfflineSync] Failed to sync drop:', drop.id, error);
        errorCount++;
      }
    }

    await refreshPendingDrops();
    queryClient.invalidateQueries({ queryKey: ['/api/drops'] });

    if (errorCount === 0) {
      setSyncStatus('synced');
      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${successCount} drop${successCount > 1 ? 's' : ''}!`,
      });
    } else {
      setSyncStatus('error');
      toast({
        title: 'Sync Partially Failed',
        description: `Synced ${successCount}, failed ${errorCount}. Will retry later.`,
        variant: 'destructive',
      });
    }
  }, [toast, refreshPendingDrops]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back Online',
        description: 'Your connection has been restored.',
      });
      syncPendingDrops();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Offline Mode',
        description: 'You can still log drops. They will sync when you reconnect.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPendingDrops();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, syncPendingDrops, refreshPendingDrops]);

  useEffect(() => {
    if (isOnline && pendingDrops.length > 0 && syncStatus === 'pending') {
      syncPendingDrops();
    }
  }, [isOnline, pendingDrops.length, syncStatus, syncPendingDrops]);

  return {
    isOnline,
    syncStatus,
    pendingDrops,
    pendingCount: pendingDrops.length,
    syncPendingDrops,
    refreshPendingDrops,
  };
}
