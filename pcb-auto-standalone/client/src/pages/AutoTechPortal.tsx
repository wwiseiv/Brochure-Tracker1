import { useEffect, useState, useCallback, useRef } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock, Play, Square, Wrench, ChevronDown, ChevronUp,
  Loader2, History, Car, AlertCircle, RefreshCw, KeyRound, LogIn,
} from "lucide-react";

interface TechSession {
  session: {
    id: number;
    repairOrderId: number;
    serviceLineId: number;
    techEmployeeId: number;
    clockIn: string;
    clockOut: string | null;
    durationMinutes: number | null;
    isActive: boolean;
    notes: string | null;
  };
  roNumber?: string;
  serviceDescription?: string;
  techFirstName?: string;
  techLastName?: string;
}

interface LineItem {
  id: number;
  description: string;
  laborHours: string | null;
  approvalStatus: string;
  lineOrigin: string | null;
  type: string;
}

interface RepairOrder {
  id: number;
  roNumber: string;
  status: string;
  customer: { firstName: string; lastName: string } | null;
  vehicle: { year: number | null; make: string | null; model: string | null } | null;
  lineItems?: LineItem[];
}

const APPROVAL_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  declined: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function formatElapsed(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - start) / 1000));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function vehicleLabel(v: { year: number | null; make: string | null; model: string | null } | null): string {
  if (!v) return "No vehicle";
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "No vehicle";
}

interface PinTechInfo {
  id: number;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  role: string;
}

export default function AutoTechPortal() {
  const { autoFetch, user, shop } = useAutoAuth();

  const [activeSession, setActiveSession] = useState<TechSession | null>(null);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [sessionHistory, setSessionHistory] = useState<TechSession[]>([]);
  const [allActiveSessions, setAllActiveSessions] = useState<TechSession[]>([]);
  const [expandedRo, setExpandedRo] = useState<number | null>(null);
  const [roLineItems, setRoLineItems] = useState<Record<number, LineItem[]>>({});

  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState<number | null>(null);
  const [clockingOut, setClockingOut] = useState(false);
  const [loadingLineItems, setLoadingLineItems] = useState<number | null>(null);

  const [elapsedTime, setElapsedTime] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [showPinLogin, setShowPinLogin] = useState(false);
  const [pinEmployeeNumber, setPinEmployeeNumber] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [pinLoggingIn, setPinLoggingIn] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinTechInfo, setPinTechInfo] = useState<PinTechInfo | null>(null);

  const handlePinLogin = useCallback(async () => {
    if (!pinEmployeeNumber.trim()) {
      setPinError("Employee number is required");
      return;
    }
    setPinLoggingIn(true);
    setPinError("");
    try {
      const res = await fetch("/api/tech-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNumber: pinEmployeeNumber.trim(),
          pin: pinCode || undefined,
          shopId: shop?.id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || "Login failed");
        return;
      }
      setPinTechInfo(data.tech || data.user || data);
      setShowPinLogin(false);
      setPinEmployeeNumber("");
      setPinCode("");
    } catch (err: any) {
      setPinError(err.message || "Login failed");
    } finally {
      setPinLoggingIn(false);
    }
  }, [pinEmployeeNumber, pinCode, shop]);

  const handlePinLogout = useCallback(() => {
    setPinTechInfo(null);
    setShowPinLogin(false);
  }, []);

  const fetchActiveSession = useCallback(async () => {
    if (!user) return;
    try {
      const res = await autoFetch("/api/tech-sessions/active");
      const sessions: TechSession[] = await res.json();
      setAllActiveSessions(sessions);
      const mine = sessions.find((s) => s.session.techEmployeeId === user.id && s.session.isActive);
      setActiveSession(mine || null);
    } catch (err) {
      console.error("Failed to fetch active sessions:", err);
    }
  }, [autoFetch, user]);

  const fetchRepairOrders = useCallback(async () => {
    try {
      const res = await autoFetch("/api/repair-orders?status=in_progress&limit=50");
      const data = await res.json();
      setRepairOrders(data.repairOrders || []);
    } catch (err) {
      console.error("Failed to fetch repair orders:", err);
    }
  }, [autoFetch]);

  const fetchSessionHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await autoFetch(`/api/tech-sessions/tech/${user.id}`);
      const sessions: TechSession[] = await res.json();
      setSessionHistory(sessions.slice(0, 20));
    } catch (err) {
      console.error("Failed to fetch session history:", err);
    }
  }, [autoFetch, user]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchActiveSession(), fetchRepairOrders(), fetchSessionHistory()]);
    setLoading(false);
  }, [fetchActiveSession, fetchRepairOrders, fetchSessionHistory]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (activeSession) {
      setElapsedTime(formatElapsed(activeSession.session.clockIn));
      timerRef.current = setInterval(() => {
        setElapsedTime(formatElapsed(activeSession.session.clockIn));
      }, 1000);
    } else {
      setElapsedTime("");
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession]);

  const fetchLineItems = useCallback(async (roId: number) => {
    if (roLineItems[roId]) return;
    setLoadingLineItems(roId);
    try {
      const res = await autoFetch(`/api/repair-orders/${roId}`);
      const data = await res.json();
      const items: LineItem[] = (data.lineItems || []).map((li: any) => ({
        id: li.id,
        description: li.description,
        laborHours: li.laborHours,
        approvalStatus: li.approvalStatus || "pending",
        lineOrigin: li.lineOrigin || null,
        type: li.type,
      }));
      setRoLineItems((prev) => ({ ...prev, [roId]: items }));
    } catch (err) {
      console.error("Failed to fetch line items:", err);
    } finally {
      setLoadingLineItems(null);
    }
  }, [autoFetch, roLineItems]);

  const toggleExpand = useCallback((roId: number) => {
    if (expandedRo === roId) {
      setExpandedRo(null);
    } else {
      setExpandedRo(roId);
      fetchLineItems(roId);
    }
  }, [expandedRo, fetchLineItems]);

  const handleClockIn = useCallback(async (repairOrderId: number, serviceLineId: number) => {
    setClockingIn(serviceLineId);
    try {
      const res = await autoFetch("/api/tech-sessions/clock-in", {
        method: "POST",
        body: JSON.stringify({ repairOrderId, serviceLineId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Clock-in failed");
        return;
      }
      await fetchAll();
    } catch (err) {
      console.error("Clock-in error:", err);
      alert("Clock-in failed");
    } finally {
      setClockingIn(null);
    }
  }, [autoFetch, fetchAll]);

  const handleClockOut = useCallback(async () => {
    if (!activeSession) return;
    setClockingOut(true);
    try {
      const res = await autoFetch("/api/tech-sessions/clock-out", {
        method: "POST",
        body: JSON.stringify({ sessionId: activeSession.session.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Clock-out failed");
        return;
      }
      await fetchAll();
    } catch (err) {
      console.error("Clock-out error:", err);
      alert("Clock-out failed");
    } finally {
      setClockingOut(false);
    }
  }, [autoFetch, activeSession, fetchAll]);

  const hasActiveSession = !!activeSession;

  const isLineActiveByOther = useCallback((lineItemId: number) => {
    return allActiveSessions.some(
      (s) => s.session.serviceLineId === lineItemId && s.session.techEmployeeId !== user?.id
    );
  }, [allActiveSessions, user]);

  const getLineActiveInfo = useCallback((lineItemId: number) => {
    const s = allActiveSessions.find((s) => s.session.serviceLineId === lineItemId);
    if (!s) return null;
    return {
      techName: `${s.techFirstName || ""} ${s.techLastName || ""}`.trim(),
      isSelf: s.session.techEmployeeId === user?.id,
    };
  }, [allActiveSessions, user]);

  if (loading) {
    return (
      <AutoLayout>
        <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AutoLayout>
    );
  }

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-tech-portal-title">
            <Wrench className="h-5 w-5" /> Tech Portal
          </h1>
          <div className="flex items-center gap-2">
            {pinTechInfo && (
              <Badge variant="outline" className="gap-1 no-default-hover-elevate no-default-active-elevate" data-testid="badge-pin-user">
                <KeyRound className="h-3 w-3" />
                {pinTechInfo.firstName} {pinTechInfo.lastName}
              </Badge>
            )}
            {activeSession && (
              <Badge variant="outline" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 no-default-hover-elevate no-default-active-elevate" data-testid="badge-active-timer">
                <Clock className="h-3 w-3" />
                {elapsedTime}
              </Badge>
            )}
            {pinTechInfo ? (
              <Button size="sm" variant="ghost" onClick={handlePinLogout} data-testid="button-pin-logout">
                Switch User
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setShowPinLogin(!showPinLogin)} data-testid="button-pin-login-toggle">
                <KeyRound className="h-4 w-4 mr-1" />
                PIN Login
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={fetchAll} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showPinLogin && (
          <Card data-testid="card-pin-login">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Quick PIN Login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                For shop floor tablets. Sign in with your employee number and optional PIN.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pin-emp-number" className="text-sm">Employee Number</Label>
                  <Input
                    id="pin-emp-number"
                    placeholder="e.g. 104"
                    value={pinEmployeeNumber}
                    onChange={(e) => setPinEmployeeNumber(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handlePinLogin(); }}
                    data-testid="input-pin-employee-number"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pin-code" className="text-sm">PIN (optional)</Label>
                  <Input
                    id="pin-code"
                    type="password"
                    placeholder="4-6 digits"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") handlePinLogin(); }}
                    data-testid="input-pin-code"
                  />
                </div>
              </div>
              {pinError && (
                <div className="flex items-center gap-2 text-sm text-destructive" data-testid="text-pin-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {pinError}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button onClick={handlePinLogin} disabled={pinLoggingIn} className="gap-2" data-testid="button-pin-submit">
                  {pinLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Sign In
                </Button>
                <Button variant="ghost" onClick={() => { setShowPinLogin(false); setPinError(""); }} data-testid="button-pin-cancel">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Session Card */}
        {activeSession && (
          <Card data-testid="card-active-session">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                Currently Clocked In
              </CardTitle>
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 no-default-hover-elevate no-default-active-elevate">
                Active
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium" data-testid="text-active-ro">
                  RO #{activeSession.roNumber}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-active-service">
                  {activeSession.serviceDescription}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-2xl font-mono font-bold tabular-nums" data-testid="text-active-elapsed">
                  {elapsedTime}
                </div>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={handleClockOut}
                  disabled={clockingOut}
                  data-testid="button-clock-out"
                >
                  {clockingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                  Clock Out
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clocked in at {formatTime(activeSession.session.clockIn)}
              </p>
            </CardContent>
          </Card>
        )}

        {!activeSession && (
          <Card data-testid="card-no-active-session">
            <CardContent className="py-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Not clocked in. Select a service line below to start.</p>
            </CardContent>
          </Card>
        )}

        {/* Assigned ROs */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-assigned-ros-title">
            <Car className="h-5 w-5" /> In-Progress Repair Orders
          </h2>

          {repairOrders.length === 0 && (
            <Card data-testid="card-no-ros">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No in-progress repair orders found.</p>
              </CardContent>
            </Card>
          )}

          {repairOrders.map((ro) => {
            const isExpanded = expandedRo === ro.id;
            const items = roLineItems[ro.id];
            return (
              <Card key={ro.id} data-testid={`card-ro-${ro.id}`}>
                <button
                  className="w-full text-left"
                  onClick={() => toggleExpand(ro.id)}
                  data-testid={`button-expand-ro-${ro.id}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="text-sm font-semibold" data-testid={`text-ro-number-${ro.id}`}>
                        RO #{ro.roNumber}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground" data-testid={`text-ro-vehicle-${ro.id}`}>
                        {vehicleLabel(ro.vehicle)}
                      </p>
                      {ro.customer && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-ro-customer-${ro.id}`}>
                          {ro.customer.firstName} {ro.customer.lastName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 no-default-hover-elevate no-default-active-elevate"
                        data-testid={`badge-ro-status-${ro.id}`}
                      >
                        IN PROGRESS
                      </Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-2" data-testid={`content-ro-lines-${ro.id}`}>
                    {loadingLineItems === ro.id && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {items && items.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-3">No line items.</p>
                    )}

                    {items && items.map((li) => {
                      const activeInfo = getLineActiveInfo(li.id);
                      const canClockIn =
                        li.approvalStatus === "approved" &&
                        !hasActiveSession &&
                        !activeInfo;

                      return (
                        <div
                          key={li.id}
                          className="border rounded-md p-3 space-y-2"
                          data-testid={`line-item-${li.id}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-sm font-medium" data-testid={`text-line-desc-${li.id}`}>
                                {li.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${APPROVAL_COLORS[li.approvalStatus] || ""} no-default-hover-elevate no-default-active-elevate`}
                                  data-testid={`badge-line-approval-${li.id}`}
                                >
                                  {(li.approvalStatus || "pending").toUpperCase()}
                                </Badge>
                                {li.laborHours && (
                                  <span className="text-xs text-muted-foreground" data-testid={`text-line-hours-${li.id}`}>
                                    Est. Time: {li.laborHours}h
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {activeInfo && activeInfo.isSelf && (
                                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-line-active-self-${li.id}`}>
                                  <Clock className="h-3 w-3" /> You
                                </Badge>
                              )}
                              {activeInfo && !activeInfo.isSelf && (
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 gap-1 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-line-active-other-${li.id}`}>
                                  <Wrench className="h-3 w-3" /> {activeInfo.techName}
                                </Badge>
                              )}
                              {canClockIn && (
                                <Button
                                  size="sm"
                                  className="gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClockIn(ro.id, li.id);
                                  }}
                                  disabled={clockingIn === li.id}
                                  data-testid={`button-clock-in-${li.id}`}
                                >
                                  {clockingIn === li.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                  Clock In
                                </Button>
                              )}
                              {li.approvalStatus !== "approved" && !activeInfo && (
                                <span className="text-xs text-muted-foreground italic" data-testid={`text-line-not-approved-${li.id}`}>
                                  Not approved
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Session History */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-history-title">
            <History className="h-5 w-5" /> Recent Sessions
          </h2>

          {sessionHistory.length === 0 && (
            <Card data-testid="card-no-history">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No session history yet.</p>
              </CardContent>
            </Card>
          )}

          {sessionHistory.length > 0 && (
            <Card data-testid="card-session-history">
              <CardContent className="p-0">
                <div className="divide-y">
                  {sessionHistory.map((s) => (
                    <div
                      key={s.session.id}
                      className="px-4 py-3 space-y-1"
                      data-testid={`history-session-${s.session.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium" data-testid={`text-history-ro-${s.session.id}`}>
                            RO #{s.roNumber}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-history-desc-${s.session.id}`}>
                            {s.serviceDescription}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground" data-testid={`text-history-date-${s.session.id}`}>
                            {formatDate(s.session.clockIn)}
                          </p>
                          <p className="text-xs font-medium" data-testid={`text-history-duration-${s.session.id}`}>
                            {formatDuration(s.session.durationMinutes)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span data-testid={`text-history-clockin-${s.session.id}`}>
                          In: {formatTime(s.session.clockIn)}
                        </span>
                        <span data-testid={`text-history-clockout-${s.session.id}`}>
                          Out: {formatTime(s.session.clockOut)}
                        </span>
                        {s.session.isActive && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs no-default-hover-elevate no-default-active-elevate">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AutoLayout>
  );
}
