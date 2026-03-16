import { PageTransition } from "@/components/page-transition";
import { useParseResume, useGetActiveProfile, useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, CheckCircle2, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Resume() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { mutate: parse, isPending, data: parsedData } = useParseResume();
  const { data: activeRes } = useGetActiveProfile();
  const activeProfileName = activeRes?.active;
  const { data: profile } = useGetProfile(activeProfileName || "", { query: { enabled: !!activeProfileName } });
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.pdf') || droppedFile.name.endsWith('.docx')) {
        setFile(droppedFile);
      } else {
        toast({ title: "Invalid File", description: "Only PDF and DOCX files are supported.", variant: "destructive" });
      }
    }
  };

  const handleProcess = () => {
    if (!file) return;
    setSelectedQueries(new Set());
    parse({ data: { file } }, {
      onError: (err: any) => toast({ title: "Parsing Failed", description: err.message, variant: "destructive" })
    });
  };

  const toggleQuery = (q: string) => {
    const next = new Set(selectedQueries);
    if (next.has(q)) next.delete(q);
    else next.add(q);
    setSelectedQueries(next);
  };

  const handleAddToProfile = () => {
    if (!activeProfileName || !profile || selectedQueries.size === 0) return;
    
    const newQueries = Array.from(selectedQueries).map(q => ({ query: q, category: "resume" }));
    const merged = [...profile.queries, ...newQueries];
    // Deduplicate by query string
    const unique = Array.from(new Map(merged.map(item => [item.query, item])).values());
    
    updateProfile({ name: profile.name, data: { ...profile, queries: unique } }, {
      onSuccess: () => {
        toast({ title: "Queries Added", description: `Added ${selectedQueries.size} queries to ${profile.name}` });
        setSelectedQueries(new Set());
        queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.name}`] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const DataGroup = ({ title, items, colorClass }: { title: string, items: string[], colorClass: string }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-3 p-5 rounded-xl border border-border/50 bg-background/50">
        <h4 className="font-semibold text-foreground uppercase tracking-wider text-xs">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <Badge key={item} className={`px-3 py-1 bg-opacity-10 border ${colorClass} bg-transparent`}>
              {item}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resume Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-lg">Extract skills and generate optimized search queries from a CV.</p>
        </div>

        <Card className="border-border/50 shadow-2xl bg-card/60 backdrop-blur overflow-hidden">
          <CardContent className="p-8">
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${dragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border/60 bg-background/30 hover:bg-background/50 hover:border-primary/50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.docx,.doc" 
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                }}
              />
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                {file ? <FileText className="w-10 h-10" /> : <UploadCloud className="w-10 h-10" />}
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {file ? file.name : "Drag & drop resume here"}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {file ? "Ready to parse. Click the button below to extract insights." : "Supports PDF and DOCX formats. Click to browse."}
              </p>
            </div>

            <div className="mt-8 flex justify-center">
              <Button 
                size="lg" 
                onClick={handleProcess} 
                disabled={!file || isPending}
                className="h-14 px-12 rounded-xl text-lg font-bold shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:-translate-y-1 transition-all"
              >
                {isPending ? (
                  <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Extracting Insights...</>
                ) : (
                  <><Search className="w-5 h-5 mr-3" /> Process Resume</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {parsedData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-2xl font-bold border-b border-border/50 pb-4">Extraction Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DataGroup title="Target Titles" items={parsedData.titles} colorClass="border-blue-500/30 text-blue-400" />
              <DataGroup title="Core Skills" items={parsedData.skills} colorClass="border-emerald-500/30 text-emerald-400" />
              <DataGroup title="Tools & Systems" items={parsedData.tools} colorClass="border-purple-500/30 text-purple-400" />
              <DataGroup title="Certifications" items={parsedData.certifications} colorClass="border-amber-500/30 text-amber-400" />
              <DataGroup title="Industries" items={parsedData.industries} colorClass="border-rose-500/30 text-rose-400" />
            </div>

            <Card className="border-primary/20 shadow-xl bg-primary/5">
              <CardHeader className="pb-4 border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Generated Queries</CardTitle>
                    <CardDescription className="text-primary/70 mt-1">Select the best queries to add to your active profile.</CardDescription>
                  </div>
                  <Button 
                    onClick={handleAddToProfile} 
                    disabled={selectedQueries.size === 0 || !activeProfileName || isUpdating}
                    className="shadow-md"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add ({selectedQueries.size}) to Profile
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!activeProfileName && (
                  <div className="p-4 bg-destructive/10 text-destructive text-sm font-medium">
                    Warning: You must select an Active Profile before you can add queries. Go to Profiles.
                  </div>
                )}
                <div className="divide-y divide-primary/10">
                  {parsedData.suggested_queries.map((q, idx) => (
                    <label key={idx} className="flex items-center gap-4 p-4 hover:bg-primary/10 cursor-pointer transition-colors group">
                      <Checkbox 
                        checked={selectedQueries.has(q)}
                        onCheckedChange={() => toggleQuery(q)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary w-5 h-5"
                      />
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors text-lg">{q}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
