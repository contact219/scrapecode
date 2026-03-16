import { PageTransition } from "@/components/page-transition";
import { useGetActiveProfile, useRunSearch, useGetSearchResults, useGetProfile } from "@workspace/api-client-react";
import { useState } from "react";
import { useSearchStream } from "@/hooks/use-search-stream";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Search, AlertCircle, FileSpreadsheet, Building2, MapPin, Briefcase } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function SearchPage() {
  const { data: activeRes } = useGetActiveProfile();
  const activeProfileName = activeRes?.active;
  const { data: profile } = useGetProfile(activeProfileName || "", { query: { enabled: !!activeProfileName } });
  
  const { mutate: runSearch, isPending: isStarting } = useRunSearch();
  const [jobId, setJobId] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const { toast } = useToast();

  const { progress, done, error, result } = useSearchStream(jobId);
  const { data: resultsData } = useGetSearchResults(jobId!, { query: { enabled: done && !!jobId } });

  const handleRunSearch = () => {
    if (!activeProfileName) {
      toast({ title: "No active profile", description: "Please set an active profile first.", variant: "destructive" });
      return;
    }
    runSearch({ data: { profile_name: activeProfileName, mock } }, {
      onSuccess: (res) => {
        setJobId(res.job_id);
      },
      onError: (err: any) => {
        toast({ title: "Error starting search", description: err.message, variant: "destructive" });
      }
    });
  };

  const isRunning = jobId && !done;
  const showResults = done && resultsData && resultsData.jobs;

  return (
    <PageTransition>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Run Extraction</h1>
            <p className="text-muted-foreground mt-1 text-lg">Execute the scraping pipeline based on your active profile.</p>
          </div>
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
                
                <div className="flex items-center space-x-3 pt-4">
                  <Checkbox 
                    id="mock" 
                    checked={mock} 
                    onCheckedChange={(c) => setMock(!!c)} 
                    disabled={isRunning}
                    className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                  />
                  <Label htmlFor="mock" className="font-medium text-muted-foreground cursor-pointer">
                    Developer Mode: Use Mock Data (Test without scraping)
                  </Label>
                </div>
              </div>

              <div className="flex flex-col items-center lg:items-end justify-center">
                <Button 
                  onClick={handleRunSearch} 
                  disabled={isStarting || isRunning || !activeProfileName}
                  className="w-full lg:w-auto h-16 px-12 text-lg rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_rgba(59,130,246,0.5)] transition-all font-bold bg-primary text-primary-foreground hover:-translate-y-1"
                >
                  {isRunning ? (
                    <><div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-3"/> Running...</>
                  ) : (
                    <><Play className="w-6 h-6 mr-3 fill-current" /> Execute Extraction</>
                  )}
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
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="bg-emerald-500/10 text-emerald-500 p-2 rounded-lg border border-emerald-500/20"><CheckCircle2 className="w-6 h-6" /></span>
                Extracted {resultsData.total} Opportunities
              </h2>
              {resultsData.filepath && (
                <a href={`/api/output/download/${resultsData.filepath.split('/').pop()}`}>
                  <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                    <FileSpreadsheet className="w-5 h-5 mr-2" /> Download Excel Report
                  </Button>
                </a>
              )}
            </div>

            <Card className="border-border/50 shadow-xl overflow-hidden bg-card/60 backdrop-blur">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold text-foreground py-4">Job Title</TableHead>
                      <TableHead className="font-semibold text-foreground">Company</TableHead>
                      <TableHead className="font-semibold text-foreground">Location</TableHead>
                      <TableHead className="font-semibold text-foreground">Source</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultsData.jobs.slice(0, 100).map((job, idx) => {
                      const isRemote = job.location.toLowerCase().includes('remote');
                      const isHybrid = job.location.toLowerCase().includes('hybrid');
                      return (
                        <TableRow key={idx} className="border-border/50 hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-primary truncate max-w-[300px]">{job.title}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">{job.query}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2 text-foreground font-medium">
                              <Briefcase className="w-4 h-4 text-muted-foreground" /> {job.company}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{job.location}</span>
                              {isRemote && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Remote</Badge>}
                              {isHybrid && <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20">Hybrid</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize bg-background/50">{job.source}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <a href={job.url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="secondary" className="rounded-lg shadow-sm">View Post</Button>
                            </a>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {resultsData.jobs.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/20 border-t border-border/50">
                  Showing 100 of {resultsData.total} results. Download the Excel file for the complete dataset.
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

// Temporary icon imports to fix above file
import { CheckCircle2, Activity } from "lucide-react";
