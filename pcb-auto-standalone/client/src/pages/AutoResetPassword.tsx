import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Check, KeyRound } from "lucide-react";
import pcbAutoLogo from "@assets/Untitled_design_1770609957209.png";

export default function AutoResetPassword() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" data-testid="page-reset-password">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={pcbAutoLogo} alt="PCB Auto" className="mx-auto h-24 object-contain" data-testid="reset-password-logo" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <h1 className="text-lg font-semibold" data-testid="text-reset-password-title">Set New Password</h1>
            <CardDescription>
              {success ? "Your password has been reset" : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 justify-center">
                  <Check className="h-5 w-5" />
                  <p className="text-sm font-medium" data-testid="text-reset-success">Password reset successfully!</p>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  You can now sign in with your new password.
                </p>
                <Link href="/login">
                  <Button className="w-full gap-2" data-testid="button-go-to-login">
                    <ArrowLeft className="h-4 w-4" /> Sign In
                  </Button>
                </Link>
              </div>
            ) : !token ? (
              <div className="space-y-4">
                <p className="text-sm text-destructive text-center" data-testid="text-invalid-token">
                  Invalid reset link. Please request a new password reset.
                </p>
                <Link href="/forgot-password">
                  <Button variant="outline" className="w-full" data-testid="button-request-new-reset">
                    Request New Reset Link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive" data-testid="text-reset-error">{error}</p>
                )}
                <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-reset-password">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Reset Password
                </Button>
                <Link href="/login">
                  <Button variant="ghost" className="w-full gap-2" data-testid="button-back-to-login-reset">
                    <ArrowLeft className="h-4 w-4" /> Back to Sign In
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
