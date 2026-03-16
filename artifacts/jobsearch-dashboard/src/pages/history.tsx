import { PageTransition } from "@/components/page-transition";
import { useGetHistory, useListOutputFiles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, History as HistoryIcon, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function HistoryPage() {
  const { data: historyRes, isLoading: historyLoading } = useGetHistory();
  const { data: filesRes, isLoading: filesLoading } = useListOutputFiles();

  return (
    <PageTransition>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Run History</h1>
          <p className="text-muted-foreground mt-1 text-lg">Review past extractions and download historical reports.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Execution History */}
          <Card className="border-border/50 shadow-xl bg-card/60 backdrop-blur">
            <CardHeader className="border-b border-border/50 pb-5">
              <CardTitle className="text-xl flex items-center gap-2"><HistoryIcon className="w-5 h-5 text-primary" /> Execution Log</CardTitle>
              <CardDescription>The last 20 automated search runs.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Loading logs...</div>
              ) : !historyRes?.history.length ? (
                <div className="p-12 text-center text-muted-foreground">No searches run yet.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-border/50">
                      <TableHead>Date / Time</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead className="text-right">Jobs Found</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRes.history.map((run, i) => (
                      <TableRow key={i} className="border-border/50 hover:bg-muted/30">
                        <TableCell className="font-medium text-muted-foreground">
                          {run.date}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">{run.profile}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-400">{run.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Generated Files */}
          <Card className="border-border/50 shadow-xl bg-card/60 backdrop-blur">
            <CardHeader className="border-b border-border/50 pb-5">
              <CardTitle className="text-xl flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Excel Reports</CardTitle>
              <CardDescription>Download generated data exports.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filesLoading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Loading files...</div>
              ) : !filesRes?.files.length ? (
                <div className="p-12 text-center text-muted-foreground">No files generated yet.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filesRes.files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground truncate max-w-[250px] sm:max-w-sm" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {file.modified}</span>
                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <a href={file.download_url}>
                        <Button size="sm" variant="outline" className="shrink-0 h-9 rounded-lg hover:text-primary hover:border-primary/50">
                          <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
