import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

// Components
import { AppLayout } from "@/components/layout";

// Pages
import Dashboard from "@/pages/dashboard";
import Profiles from "@/pages/profiles";
import SearchPage from "@/pages/search";
import Resume from "@/pages/resume";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    }
  }
});

function App() {
  // Force dark mode consistently for the professional dashboard aesthetic
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
