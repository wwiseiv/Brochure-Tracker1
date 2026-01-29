import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, Home } from "lucide-react";
import { Link } from "wouter";

interface AccessDeniedProps {
  feature?: string;
}

export default function AccessDenied({ feature = "this feature" }: AccessDeniedProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-center">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <ShieldX className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-xl font-bold">Access Restricted</h1>
          </div>

          <p className="text-sm text-muted-foreground">
            Sorry, {feature} is only available to administrators. If you believe you should have access, please contact your organization admin.
          </p>

          <Link href="/">
            <Button className="mt-6 w-full" data-testid="button-go-home">
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
