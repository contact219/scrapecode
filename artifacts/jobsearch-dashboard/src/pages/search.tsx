import { PageTransition } from "@/components/page-transition";
import { useGetActiveProfile, useRunSearch, useGetSearchResults, useGetProfile } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { useSearchStream } from "@/hooks/use-search-stream";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Download, Search, AlertCircle, FileSpreadsheet, Building2, MapPin, Briefcase, CheckCircle2, Activity, Sparkles, BookmarkPlus, DollarSign, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function parseSalaryNumber(salary: string): number | null {
  if (!salary || salary === "N/A") return null;
  const clean = salary.replace(/,/g, "");
  const match = clean.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  if (/\/hr|\/hour|hourly/i.test(salary)) return n * 2080;
  if (n < 500) return n * 2080;
  return n;
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function fireNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.svg" });
  }
}

export default function SearchPage() {
  const { token } = useAuth();
  const { data: activeRes } = useGetActiveProfile();
  const activeProfileName = activeRes?.active;
  const { data: profile } = useGetProfile(activeProfileName || "", { query: { enabled: !!activeProfileName } });

  const { mutate: runSearch, isPending: isStarting } = useRunSearch();
  const [jobId, setJobId] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [minSalary, setMinSalary] = useState("");
  const [tracked, setTracked] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const notifiedRef = useRef(false);

  const { progress, done, error } = useSearchStream(jobId);
  const { data: resultsData } = useGetSearchResults(jobId!, { query: { enabled: done && !!jobId } });

  useEffect(() => {
    if (done && resultsData && !notifiedRef.current) {
      notifiedRef.current = true;
      const newCount = (resultsData as any).new_count ?? resultsData.total;
      fireNotification(
        "ScrapeCode — Extraction Complete",
        `Found ${resultsData.total} jobs (${newCount} new) for ${activeProfileName}`
      );
    }
  }, [done, resultsData, activeProfileName]);

  const handleRunSearch = () => {
    if (!activeProfileName) {
      toast({ title: "No active profile", description: "Please set an active profile first.", variant: "destructive" });
      return;
    }
    requestNotificationPermission();
    notifiedRef.current = false;
    setTracked(new Set());
    runSearch({ data: { profile_name: activeProfileName, mock } }, {
      onSuccess: (res) => setJobId(res.job_id),
      onError: (err: any) => toast({ title: "Error starting search", description: err.message, variant: "destructive" })
    });
  };

  const handleTrack = async (job: any, idx: number) => {
    try {
      await fetch(`${API_BASE}/api/tracker`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: job.title, company: job.company, location: job.location,
          url: job.url, source: job.source, salary: job.salary || "",
          profile: activeProfileName || ""
        }),
      });
      setTracked(prev => new Set(prev).add(idx));
      toast({ title: "Added to tracker", description: `${job.title} at ${job.company}` });
    } catch {
      toast({ title: "Error", description: "Failed to add to tracker", variant: "destructive" });
    }
  };

  const isRunning = jobId && !done;

  const allJobs = resultsData?.jobs ?? [];
  const minSalaryNum = minSalary ? parseInt(minSalary.replace(/,/g, ""), 10) : null;
  const filteredJobs = minSalaryNum
    ? allJobs.filter(job => {
        const s = parseSalaryNumber((job as any).salary || "");
        return s === null || s >= minSalaryNum;
      })
    : allJobs;

  const showResults = done && resultsData?.jobs;
  const newCount = (resultsData as any)?.new_count ?? 0;

  return (
    <PageTransition>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Run Extraction</h1>
          <p className="text-muted-foreground mt-1 text-lg">Execute the scraping pipeline based on your active profile.</p>
        </div>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-2xl border-border/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
          <CardContent className="p-8 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-2">Active Target</h3>
                  <div className="text-4xl font-display font-bold text-foreground">
                    {activeProfileName || "No Profile Selected"}
                  </div>
                </div>
                {profile && (
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary" className="px-3 py-1.5 text-sm bg-muted/50 border-border/50"><Search className="w-3.5 h-3.5 mr-2 text-primary" /> {profile.queries.length} Queries</Badge>
                    <Badge variant="secondary" className="px-3 py-1.5 text-sm bg-muted/50 border-border/50"><Building2 className="w-3.5 h-3.5 mr-2 text-primary" /> {profile.sources.length} Sources</Badge>
                    <Badge variant="secondary" className="px-3 py-1.5 text-sm bg-muted/50 border-border/50"><MapPin className="w-3.5 h-3.5 mr-2 text-primary" /> {profile.work_type.toUpperCase()}</Badge>
                  </div>
                )}
                <div className="flex items-center space-x-3 pt-2">
                  <Checkbox id="mock" checked={mock} onCheckedChange={(c) => setMock(!!c)} disabled={!!isRunning}
                    className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500" />
                  <Label htmlFor="mock" className="font-medium text-muted-foreground cursor-pointer">
                    Developer Mode: Use Mock Data
                  </Label>
                </div>
              </div>
              <div className="flex flex-col items-center lg:items-end justify-center">
                <Button onClick={handleRunSearch} disabled={isStarting || !!isRunning || !activeProfileName}
                  className="w-full lg:w-auto h-16 px-12 text-lg rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_rgba(59,130,246,0.5)] transition-all font-bold bg-primary text-primary-foreground hover:-translate-y-1">
                  {isRunning
                    ? <><div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-3" /> Running...</>
                    : <><Play className="w-6 h-6 mr-3 fill-current" /> Execute Extraction</>}
                </Button>
              </div>
            </div>

            {isRunning && (
              <div className="mt-10 p-6 rounded-2xl bg-background/50 border border-border/50 space-y-4 shadow-inner">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-primary animate-pulse flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Live Extraction
                  </span>
                  <span className="text-foreground">{progress.pct}%</span>
                </div>
                <Progress value={progress.pct} className="h-3" />
                <p className="text-sm text-muted-foreground font-mono">{progress.msg}</p>
              </div>
            )}
            {error && (
              <div className="mt-8 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {showResults && resultsData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 flex-wrap">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="bg-emerald-500/10 text-emerald-500 p-2 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </span>
                Extracted {resultsData.total} Opportunities
                {newCount > 0 && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> {newCount} New
                  </Badge>
                )}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Min salary..."
                    value={minSalary}
                    onChange={e => setMinSalary(e.target.value)}
                    className="h-8 w-32 border-0 bg-transparent p-0 focus-visible:ring-0 text-sm"
                  />
                  {minSalary && (
                    <button onClick={() => setMinSalary("")} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                  )}
                </div>
                {resultsData.filepath && (
                  <a href={`${API_BASE}/api/output/download/${resultsData.filepath.split('/').pop()}`}>
                    <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                      <FileSpreadsheet className="w-5 h-5 mr-2" /> Download Excel
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {minSalaryNum && (
              <p className="text-sm text-muted-foreground">
                Showing {filteredJobs.length} of {resultsData.total} jobs with salary ≥ ${minSalaryNum.toLocaleString()}
              </p>
            )}

            <Card className="border-border/50 shadow-xl overflow-hidden bg-card/60 backdrop-blur">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold text-foreground py-4">Job Title</TableHead>
                      <TableHead className="font-semibold text-foreground">Company</TableHead>
                      <TableHead className="font-semibold text-foreground">Location</TableHead>
                      <TableHead className="font-semibold text-foreground">Salary</TableHead>
                      <TableHead className="font-semibold text-foreground">Source</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.slice(0, 100).map((job: any, idx: number) => {
                      const isRemote = job.location?.toLowerCase().includes("remote");
                      const isHybrid = job.location?.toLowerCase().includes("hybrid");
                      const isNew = job.is_new === true;
                      const isTracked = tracked.has(idx);
                      return (
                        <TableRow key={idx} className="border-border/50 hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-primary truncate max-w-[240px]">{job.title}</span>
                                {isNew && (
                                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] px-1.5 py-0 h-4 shrink-0">
                                    <Sparkles className="w-2.5 h-2.5 mr-1" />NEW
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground truncate max-w-[240px]">{job.query}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2 text-foreground font-medium">
                              <Briefcase className="w-4 h-4 text-muted-foreground" /> {job.company}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-muted-foreground text-sm">{job.location}</span>
                              {isRemote && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Remote</Badge>}
                              {isHybrid && <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Hybrid</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-emerald-400 font-medium">{job.salary || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize bg-background/50">{job.source}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant={isTracked ? "secondary" : "outline"}
                                disabled={isTracked}
                                onClick={() => handleTrack(job, idx)}
                                className="rounded-lg h-8 text-xs gap-1.5">
                                <BookmarkPlus className="w-3.5 h-3.5" />
                                {isTracked ? "Tracked" : "Track"}
                              </Button>
                              <a href={job.url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="secondary" className="rounded-lg h-8 text-xs">View</Button>
                              </a>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredJobs.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/20 border-t border-border/50">
                  Showing 100 of {filteredJobs.length} results. Download the Excel file for the complete dataset.
                </div>
              )}
              {filteredJobs.length === 0 && minSalaryNum && (
                <div className="p-8 text-center text-muted-foreground">
                  No results match your salary filter. Try lowering the minimum.
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
