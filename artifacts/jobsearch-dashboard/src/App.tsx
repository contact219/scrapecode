import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/context/auth-context";
import { AppLayout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Profiles from "@/pages/profiles";
import SearchPage from "@/pages/search";
import Resume from "@/pages/resume";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    }
  }
});

function AuthenticatedApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/profiles" component={Profiles} />
        <Route path="/search" component={SearchPage} />
        <Route path="/resume" component={Resume} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthenticatedApp />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
