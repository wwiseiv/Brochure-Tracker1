import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. It may have been moved or doesn't exist.
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
