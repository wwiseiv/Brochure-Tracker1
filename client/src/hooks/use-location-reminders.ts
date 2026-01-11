import { useState, useEffect, useCallback, useRef } from "react";
import type { DropWithBrochure } from "@shared/schema";

const PROXIMITY_THRESHOLD_METERS = 500;
const DEBOUNCE_MS = 30000;
const DISMISSED_STORAGE_KEY = "location_reminders_dismissed";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDismissedDropIds(): Set<number> {
  try {
    const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.expires && Date.now() < parsed.expires) {
        return new Set(parsed.ids || []);
      }
      localStorage.removeItem(DISMISSED_STORAGE_KEY);
    }
  } catch {
    // ignore parse errors
  }
  return new Set();
}

function addDismissedDropId(dropId: number): void {
  const dismissed = getDismissedDropIds();
  dismissed.add(dropId);
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify({
    ids: Array.from(dismissed),
    expires,
  }));
}

export interface NearbyDrop {
  drop: DropWithBrochure;
  distance: number;
}

export interface UseLocationRemindersResult {
  nearbyDrop: NearbyDrop | null;
  isWatching: boolean;
  error: string | null;
  dismissReminder: () => void;
}

export function useLocationReminders(
  pendingDrops: DropWithBrochure[],
  notificationsEnabled: boolean = true
): UseLocationRemindersResult {
  const [nearbyDrop, setNearbyDrop] = useState<NearbyDrop | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const lastAlertedDropIdRef = useRef<number | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  const dismissReminder = useCallback(() => {
    if (nearbyDrop) {
      addDismissedDropId(nearbyDrop.drop.id);
      lastAlertedDropIdRef.current = nearbyDrop.drop.id;
      setNearbyDrop(null);
    }
  }, [nearbyDrop]);

  const checkNearbyDrops = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    const dismissedIds = getDismissedDropIds();
    const now = Date.now();

    const dropsWithDistance = pendingDrops
      .filter(drop => 
        drop.latitude != null && 
        drop.longitude != null && 
        drop.status === "pending" &&
        !dismissedIds.has(drop.id)
      )
      .map(drop => ({
        drop,
        distance: haversineDistance(latitude, longitude, drop.latitude!, drop.longitude!),
      }))
      .filter(d => d.distance <= PROXIMITY_THRESHOLD_METERS)
      .sort((a, b) => a.distance - b.distance);

    if (dropsWithDistance.length > 0) {
      const closest = dropsWithDistance[0];
      
      const isSameDrop = lastAlertedDropIdRef.current === closest.drop.id;
      const isWithinDebounce = now - lastAlertTimeRef.current < DEBOUNCE_MS;
      
      if (!isSameDrop || !isWithinDebounce) {
        setNearbyDrop(closest);
        lastAlertedDropIdRef.current = closest.drop.id;
        lastAlertTimeRef.current = now;
      }
    } else {
      if (nearbyDrop && !dropsWithDistance.some(d => d.drop.id === nearbyDrop.drop.id)) {
        setNearbyDrop(null);
      }
    }
  }, [pendingDrops, nearbyDrop]);

  useEffect(() => {
    if (!notificationsEnabled || pendingDrops.length === 0) {
      setNearbyDrop(null);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    setIsWatching(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      checkNearbyDrops,
      (err) => {
        setError(err.message);
        setIsWatching(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsWatching(false);
    };
  }, [notificationsEnabled, pendingDrops, checkNearbyDrops]);

  return {
    nearbyDrop,
    isWatching,
    error,
    dismissReminder,
  };
}
