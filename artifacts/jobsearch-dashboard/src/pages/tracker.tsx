import { PageTransition } from "@/components/page-transition";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Briefcase, MapPin, ExternalLink, Trash2, ChevronRight, ChevronLeft, StickyNote } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "saved" | "applied" | "interview" | "offer" | "rejected";

interface TrackedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  salary: string;
  profile: string;
  status: Status;
  notes: string;
  added_at: string;
}

const COLUMNS: { key: Status; label: string; color: string; bg: string }[] = [
  { key: "saved",     label: "Saved",     color: "text-blue-400",    bg: "border-blue-500/20 bg-blue-500/5" },
  { key: "applied",   label: "Applied",   color: "text-yellow-400",  bg: "border-yellow-500/20 bg-yellow-500/5" },
  { key: "interview", label: "Interview", color: "text-purple-400",  bg: "border-purple-500/20 bg-purple-500/5" },
  { key: "offer",     label: "Offer",     color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/5" },
  { key: "rejected",  label: "Rejected",  color: "text-red-400",     bg: "border-red-500/20 bg-red-500/5" },
];

export default function TrackerPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tracker`, { headers });
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const moveJob = async (id: string, newStatus: Status) => {
    try {
      await fetch(`${API_BASE}/api/tracker/${id}`, {
        method: "PUT", headers, body: JSON.stringify({ status: newStatus })
      });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j));
    } catch { toast({ title: "Error", description: "Failed to update status", variant: "destructive" }); }
  };

  const deleteJob = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/tracker/${id}`, { method: "DELETE", headers });
      setJobs(prev => prev.filter(j => j.id !== id));
      toast({ title: "Removed from tracker" });
    } catch { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
  };

  const saveNotes = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/tracker/${id}`, {
        method: "PUT", headers, body: JSON.stringify({ notes: noteText })
      });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, notes: noteText } : j));
      setEditingNotes(null);
    } catch { toast({ title: "Error", description: "Failed to save notes", variant: "destructive" }); }
  };

  const getStatusIndex = (status: Status) => COLUMNS.findIndex(c => c.key === status);

  const totalJobs = jobs.length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Tracker</h1>
            <p className="text-muted-foreground mt-1 text-lg">Move opportunities through your pipeline. {totalJobs > 0 && `${totalJobs} job${totalJobs !== 1 ? "s" : ""} tracked.`}</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">Loading tracker...</div>
        ) : totalJobs === 0 ? (
          <Card className="border-border/50 bg-card/40 backdrop-blur">
            <CardContent className="p-16 text-center text-muted-foreground">
              <Briefcase className="w-14 h-14 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No jobs tracked yet</p>
              <p className="text-sm mt-1">Use the "Track" button in Run Search results to add jobs here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
            {COLUMNS.map((col) => {
              const colJobs = jobs.filter(j => j.status === col.key);
              const colIdx = COLUMNS.indexOf(col);
              return (
                <div key={col.key} className="space-y-3">
                  <div className={`rounded-xl border px-4 py-2.5 ${col.bg} flex items-center justify-between`}>
                    <span className={`font-semibold text-sm ${col.color}`}>{col.label}</span>
                    <Badge variant="secondary" className="text-xs font-bold">{colJobs.length}</Badge>
                  </div>
                  <div className="space-y-3 min-h-[120px]">
                    {colJobs.map(job => (
                      <Card key={job.id} className="border-border/50 bg-card/60 shadow-sm hover:shadow-md transition-shadow backdrop-blur">
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <p className="font-semibold text-sm text-foreground leading-snug">{job.title}</p>
                            <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                              <Briefcase className="w-3 h-3" /> {job.company}
                            </p>
                            {job.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" /> {job.location}
                              </p>
                            )}
                            {job.salary && <p className="text-xs text-emerald-400 font-medium mt-0.5">{job.salary}</p>}
                          </div>

                          {editingNotes === job.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Add notes..."
                                className="text-xs min-h-[60px] bg-background/50"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button size="sm" className="h-7 text-xs flex-1" onClick={() => saveNotes(job.id)}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotes(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : job.notes ? (
                            <p className="text-xs text-muted-foreground italic bg-muted/30 rounded-lg p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => { setEditingNotes(job.id); setNoteText(job.notes); }}>
                              {job.notes}
                            </p>
                          ) : null}

                          <div className="flex items-center gap-1 flex-wrap">
                            {colIdx > 0 && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => moveJob(job.id, COLUMNS[colIdx - 1].key)} title={`Move to ${COLUMNS[colIdx - 1].label}`}>
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {colIdx < COLUMNS.length - 1 && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => moveJob(job.id, COLUMNS[colIdx + 1].key)} title={`Move to ${COLUMNS[colIdx + 1].label}`}>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => { setEditingNotes(job.id); setNoteText(job.notes || ""); }} title="Add notes">
                              <StickyNote className="w-3.5 h-3.5" />
                            </Button>
                            {job.url && (
                              <a href={job.url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" title="Open posting">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </a>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive ml-auto"
                              onClick={() => deleteJob(job.id)} title="Remove">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
