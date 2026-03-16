import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetHistory, useGetActiveProfile, useListProfiles } from "@workspace/api-client-react";
import { Briefcase, Users, History, Activity, ArrowRight, Play } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: historyRes, isLoading: historyLoading } = useGetHistory();
  const { data: activeProfileRes, isLoading: activeLoading } = useGetActiveProfile();
  const { data: profilesRes, isLoading: profilesLoading } = useListProfiles();

  const totalJobs = historyRes?.history.reduce((acc, curr) => acc + curr.total, 0) || 0;
  const recentRuns = historyRes?.history.slice(0, 5) || [];
  const activeProfile = activeProfileRes?.active;

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, Hunter</h1>
            <p className="text-muted-foreground mt-1 text-lg">Your automated job search intelligence is ready.</p>
          </div>
          <Link href="/search">
            <Button className="rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all h-11 px-6 bg-gradient-to-r from-primary to-primary/80">
              <Play className="w-4 h-4 mr-2" />
              Quick Run Search
            </Button>
          </Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card/50 backdrop-blur border-border/50 shadow-xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Jobs Extracted</p>
                  <div className="text-4xl font-display font-bold">{historyLoading ? <Skeleton className="h-10 w-24" /> : totalJobs.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50 shadow-xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Search Profiles</p>
                  <div className="text-4xl font-display font-bold">{profilesLoading ? <Skeleton className="h-10 w-16" /> : profilesRes?.profiles.length || 0}</div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50 shadow-xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Searches Run</p>
                  <div className="text-4xl font-display font-bold">{historyLoading ? <Skeleton className="h-10 w-16" /> : historyRes?.history.length || 0}</div>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                  <History className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50 shadow-xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Active Profile</p>
                  <div className="text-xl font-display font-bold truncate pr-4 h-10 flex items-center">
                    {activeLoading ? <Skeleton className="h-6 w-32" /> : (activeProfile || "None")}
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RECENT RUNS */}
        <Card className="border-border/50 shadow-xl bg-card/40 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
            <CardTitle className="text-xl">Recent Searches</CardTitle>
            <Link href="/history" className="text-sm text-primary hover:text-primary/80 flex items-center transition-colors">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="p-8 flex justify-center"><Skeleton className="h-8 w-64" /></div>
            ) : recentRuns.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <History className="w-12 h-12 mb-4 opacity-20" />
                <p>No searches run yet. Go to Search to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentRuns.map((run, i) => (
                  <div key={i} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        {run.profile}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {run.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold text-xl text-emerald-400">{run.total}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Jobs Found</p>
                      </div>
                      {run.filepath && (
                        <a href={`/api/output/download/${run.filepath.split('/').pop()}`}>
                          <Button variant="secondary" size="sm" className="rounded-lg shadow-sm border border-border/50">
                            Download Excel
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
