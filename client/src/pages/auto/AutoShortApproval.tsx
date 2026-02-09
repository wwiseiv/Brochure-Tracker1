import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";

export default function AutoShortApproval() {
  const params = useParams<{ code: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/auto/public/approve-short/${params.code}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(data => {
        if (data.token) {
          window.location.replace(`/auto/approve/${data.token}`);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, [params.code]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div className="text-center space-y-3 px-6">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Estimate Not Available</h2>
          <p style={{ color: "#64748B", fontSize: 15, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
            This estimate link could not be found. Please contact the shop for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
