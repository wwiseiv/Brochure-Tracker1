import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Check, Mail } from "lucide-react";
import pcbAutoLogo from "@assets/Untitled_design_1770609957209.png";

export default function AutoForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" data-testid="page-forgot-password">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={pcbAutoLogo} alt="PCB Auto" className="mx-auto h-24 object-contain" data-testid="forgot-password-logo" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <h1 className="text-lg font-semibold" data-testid="text-forgot-password-title">Reset Your Password</h1>
            <CardDescription>
              {sent ? "Check your email for the reset link" : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 justify-center">
                  <Check className="h-5 w-5" />
                  <p className="text-sm font-medium" data-testid="text-forgot-success">Reset link sent!</p>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  If an account exists with <strong>{email}</strong>, you'll receive a password reset link.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full gap-2" data-testid="button-back-to-login">
                    <ArrowLeft className="h-4 w-4" /> Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@shop.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-forgot-email"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive" data-testid="text-forgot-error">{error}</p>
                )}
                <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-send-reset">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send Reset Link
                </Button>
                <Link href="/login">
                  <Button variant="ghost" className="w-full gap-2" data-testid="button-back-to-login-form">
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
