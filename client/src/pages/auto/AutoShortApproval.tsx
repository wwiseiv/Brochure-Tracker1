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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Link Not Found</h2>
          <p className="text-muted-foreground">This approval link is invalid or has expired.</p>
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
