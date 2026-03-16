import { PageTransition } from "@/components/page-transition";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageTransition>
      <div className="min-h-[80vh] w-full flex items-center justify-center">
        <Card className="w-full max-w-md bg-card/60 backdrop-blur border-border/50 shadow-2xl">
          <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-destructive/10 rounded-full text-destructive">
              <AlertCircle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold">404</h1>
              <p className="text-muted-foreground text-lg">The page you're looking for doesn't exist.</p>
            </div>
            <Link href="/">
              <Button className="h-11 px-8 rounded-xl font-medium mt-4">
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
