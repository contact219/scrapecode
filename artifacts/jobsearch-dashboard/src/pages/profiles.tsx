import { PageTransition } from "@/components/page-transition";
import { useListProfiles, useGetProfile, useCreateProfile, useUpdateProfile, useDeleteProfile, useGetActiveProfile, useSetActiveProfile } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, CheckCircle2, Save, FileEdit, AlertCircle, Users, Clock, LayoutTemplate } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const TEMPLATES = [
  {
    label: "Software Engineer",
    icon: "💻",
    description: "Full-stack, backend, frontend dev roles",
    values: {
      name: "Software Engineer",
      salary_min: 90000,
      work_type: "remote" as const,
      sources: ["indeed", "linkedin", "ziprecruiter", "glassdoor", "adzuna"],
      queries: [
        { query: "software engineer remote", category: "custom" },
        { query: "full stack developer remote", category: "custom" },
        { query: "backend engineer remote", category: "custom" },
        { query: "frontend developer react remote", category: "custom" },
      ],
    },
  },
  {
    label: "Product Manager",
    icon: "📊",
    description: "PM, APM, and product roles",
    values: {
      name: "Product Manager",
      salary_min: 100000,
      work_type: "remote" as const,
      sources: ["indeed", "linkedin", "glassdoor", "adzuna"],
      queries: [
        { query: "product manager remote", category: "custom" },
        { query: "senior product manager remote", category: "custom" },
        { query: "technical product manager remote", category: "custom" },
      ],
    },
  },
  {
    label: "Data Analyst",
    icon: "📈",
    description: "Data / BI / analytics roles",
    values: {
      name: "Data Analyst",
      salary_min: 70000,
      work_type: "remote" as const,
      sources: ["indeed", "linkedin", "ziprecruiter", "adzuna"],
      queries: [
        { query: "data analyst remote", category: "custom" },
        { query: "business intelligence analyst remote", category: "custom" },
        { query: "data scientist remote", category: "custom" },
      ],
    },
  },
  {
    label: "Marketing Manager",
    icon: "📣",
    description: "Digital & growth marketing roles",
    values: {
      name: "Marketing Manager",
      salary_min: 70000,
      work_type: "remote" as const,
      sources: ["indeed", "linkedin", "glassdoor", "adzuna"],
      queries: [
        { query: "marketing manager remote", category: "custom" },
        { query: "digital marketing manager remote", category: "custom" },
        { query: "growth marketing remote", category: "custom" },
      ],
    },
  },
  {
    label: "Finance / Procurement",
    icon: "💰",
    description: "Finance, supply chain & procurement",
    values: {
      name: "Finance Procurement",
      salary_min: 75000,
      work_type: "remote" as const,
      sources: ["indeed", "linkedin", "ziprecruiter", "glassdoor"],
      queries: [
        { query: "procurement manager remote", category: "custom" },
        { query: "financial analyst remote", category: "custom" },
        { query: "supply chain analyst remote", category: "custom" },
      ],
    },
  },
];

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  salary_min: z.coerce.number().min(0, "Must be positive"),
  work_type: z.enum(["remote", "hybrid", "both"]),
  sources: z.array(z.string()).min(1, "Select at least one source"),
  queries: z.array(z.object({
    query: z.string().min(1, "Query cannot be empty"),
    category: z.string().optional().default("custom")
  })),
  schedule: z.enum(["none", "daily", "weekly"]).default("none"),
  schedule_hour: z.coerce.number().min(0).max(23).default(8),
  schedule_minute: z.coerce.number().min(0).max(59).default(0),
  schedule_weekday: z.coerce.number().min(0).max(6).default(1),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profiles() {
  const { data: listRes, isLoading: listLoading } = useListProfiles();
  const { data: activeRes } = useGetActiveProfile();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!selectedName && !isCreating && listRes?.profiles?.length) {
      setSelectedName(listRes.profiles[0]);
    }
  }, [listRes, selectedName, isCreating]);

  const activeProfile = activeRes?.active;
  const profiles = listRes?.profiles || [];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Profiles</h1>
          <p className="text-muted-foreground mt-1 text-lg">Define criteria and queries to automate your job extraction.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-4">
            <Button className="w-full h-12 rounded-xl shadow-md border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:-translate-y-0.5 transition-all"
              variant="outline" onClick={() => { setIsCreating(true); setSelectedName(null); }}>
              <Plus className="w-5 h-5 mr-2" /> Create New Profile
            </Button>
            <div className="space-y-2">
              {listLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading profiles...</div>
              ) : profiles.length === 0 && !isCreating ? (
                <div className="p-8 text-center border border-dashed rounded-xl bg-card/20 text-muted-foreground">
                  No profiles found. Create one above.
                </div>
              ) : (
                profiles.map(name => {
                  const isSelected = selectedName === name && !isCreating;
                  const isActive = activeProfile === name;
                  return (
                    <div key={name} onClick={() => { setSelectedName(name); setIsCreating(false); }}
                      className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group
                        ${isSelected ? "bg-primary/5 border-primary shadow-md" : "bg-card/40 border-border/50 hover:border-primary/50 hover:bg-card"}`}>
                      <div className="flex items-center gap-3 truncate">
                        <FileEdit className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"}`} />
                        <span className={`font-medium truncate ${isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{name}</span>
                      </div>
                      {isActive && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-8">
            {isCreating ? (
              <ProfileEditor mode="create" onSuccess={(name) => { setIsCreating(false); setSelectedName(name); }} />
            ) : selectedName ? (
              <ProfileEditor key={selectedName} mode="edit" profileName={selectedName} isActive={activeProfile === selectedName} />
            ) : (
              <Card className="border-dashed bg-transparent border-2 border-border/50 h-[400px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a profile to edit</p>
                  <p className="text-sm">Or create a new one to get started.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function ProfileEditor({ mode, profileName, isActive, onSuccess }: {
  mode: "create" | "edit"; profileName?: string; isActive?: boolean; onSuccess?: (name: string) => void;
}) {
  const { data: profileData, isLoading } = useGetProfile(profileName || "", { query: { enabled: mode === "edit" && !!profileName } });
  const { mutate: createProfile, isPending: isCreating } = useCreateProfile();
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutate: deleteProfile, isPending: isDeleting } = useDeleteProfile();
  const { mutate: setActive } = useSetActiveProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showTemplates, setShowTemplates] = useState(mode === "create");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "", salary_min: 0, work_type: "remote",
      sources: ["indeed", "linkedin", "ziprecruiter", "glassdoor", "adzuna"],
      queries: [],
      schedule: "none", schedule_hour: 8, schedule_minute: 0, schedule_weekday: 1,
    }
  });

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "queries" });
  const formLoaded = useRef(false);

  useEffect(() => {
    if (mode === "edit" && profileData && !formLoaded.current) {
      formLoaded.current = true;
      form.reset({
        name: profileData.name,
        salary_min: profileData.salary_min || 0,
        work_type: (profileData.work_type as any) || "remote",
        sources: profileData.sources || [],
        queries: profileData.queries || [],
        schedule: (profileData.schedule as any) || "none",
        schedule_hour: profileData.schedule_hour ?? 8,
        schedule_minute: profileData.schedule_minute ?? 0,
        schedule_weekday: profileData.schedule_weekday ?? 1,
      });
    } else if (mode === "create") {
      form.reset({
        name: "", salary_min: 0, work_type: "remote",
        sources: ["indeed", "linkedin", "ziprecruiter", "glassdoor", "adzuna"],
        queries: [{ query: "procurement manager remote", category: "custom" }],
        schedule: "none", schedule_hour: 8, schedule_minute: 0, schedule_weekday: 1,
      });
    }
  }, [mode, profileData]);

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    form.reset({ ...tpl.values, schedule: "none", schedule_hour: 8, schedule_minute: 0, schedule_weekday: 1 });
    replace(tpl.values.queries);
    setShowTemplates(false);
    toast({ title: `Template applied: ${tpl.label}`, description: "Customize and save when ready." });
  };

  const onSubmit = (values: ProfileFormValues) => {
    if (mode === "create") {
      createProfile({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
          toast({ title: "Profile Created", description: `Successfully created ${values.name}` });
          if (onSuccess) onSuccess(values.name);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to create", variant: "destructive" })
      });
    } else {
      updateProfile({ name: profileName!, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
          queryClient.invalidateQueries({ queryKey: [`/api/profiles/${values.name}`] });
          toast({ title: "Profile Updated", description: "Changes saved successfully." });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to update", variant: "destructive" })
      });
    }
  };

  const handleDelete = () => {
    if (!profileName) return;
    if (confirm(`Are you sure you want to delete profile '${profileName}'?`)) {
      deleteProfile({ name: profileName }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
          toast({ title: "Profile Deleted" });
        }
      });
    }
  };

  const handleSetActive = () => {
    if (!profileName) return;
    setActive({ data: { name: profileName } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/profiles/active"] });
        toast({ title: "Active Profile Set", description: `${profileName} is now active.` });
      }
    });
  };

  if (mode === "edit" && isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading profile data...</div>;
  }

  const sourceOptions = ["indeed", "linkedin", "ziprecruiter", "glassdoor", "adzuna"];
  const schedule = form.watch("schedule");

  return (
    <Card className="shadow-2xl border-border/50 bg-card/60 backdrop-blur">
      <CardHeader className="border-b border-border/50 bg-muted/20 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{mode === "create" ? "Create Profile" : "Edit Profile"}</CardTitle>
            <CardDescription className="mt-1.5 text-base">Configure extraction parameters for this target persona.</CardDescription>
          </div>
          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <Button variant={isActive ? "secondary" : "outline"} onClick={handleSetActive} disabled={isActive}
                className={isActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" : ""}>
                {isActive ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Active</> : "Set Active"}
              </Button>
              <Button variant="destructive" size="icon" onClick={handleDelete} disabled={isDeleting} title="Delete Profile">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Templates section */}
      {mode === "create" && (
        <div className="border-b border-border/50">
          <button type="button" className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/20 transition-colors"
            onClick={() => setShowTemplates(!showTemplates)}>
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <LayoutTemplate className="w-4 h-4" />
              Quick Start Templates
            </div>
            <Badge variant="secondary" className="text-xs">{showTemplates ? "Hide" : "Show"}</Badge>
          </button>
          {showTemplates && (
            <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {TEMPLATES.map(tpl => (
                <button key={tpl.label} type="button" onClick={() => applyTemplate(tpl)}
                  className="text-left p-4 rounded-xl border border-border/50 bg-background/40 hover:border-primary/50 hover:bg-primary/5 transition-all group">
                  <div className="text-2xl mb-2">{tpl.icon}</div>
                  <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{tpl.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Profile Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Defense Contracts" className="h-12 bg-background/50 text-lg rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="salary_min" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Minimum Salary ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" className="h-12 bg-background/50 text-lg rounded-xl" {...field} />
                  </FormControl>
                  <FormDescription>Set to 0 to ignore salary.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="work_type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-semibold">Work Type Filter</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 bg-background/50 rounded-xl max-w-[240px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="remote">Remote Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid Only</SelectItem>
                    <SelectItem value="both">Both / Any</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-3 p-5 rounded-xl border border-border/50 bg-muted/20">
              <Label className="text-foreground font-semibold block mb-4">Job Board Sources</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {sourceOptions.map(source => (
                  <FormField key={source} control={form.control} name="sources" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-lg border border-border/40 bg-background/50 hover:border-primary/50 transition-colors">
                      <FormControl>
                        <Checkbox className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          checked={field.value?.includes(source)}
                          onCheckedChange={(checked) =>
                            checked
                              ? field.onChange([...(field.value || []), source])
                              : field.onChange(field.value?.filter(v => v !== source))
                          } />
                      </FormControl>
                      <FormLabel className="font-medium capitalize cursor-pointer mb-0">{source}</FormLabel>
                    </FormItem>
                  )} />
                ))}
              </div>
              {form.formState.errors.sources && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.sources.message as string}</p>
              )}
            </div>

            {/* Schedule section */}
            <div className="space-y-4 p-5 rounded-xl border border-border/50 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <Label className="text-foreground font-semibold">Scheduled Auto-Search</Label>
              </div>
              <FormField control={form.control} name="schedule" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 bg-background/50 rounded-xl max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Disabled</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              {schedule !== "none" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="schedule_hour" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Hour (0–23)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={23} className="h-11 bg-background/50 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="schedule_minute" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Minute (0–59)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={59} className="h-11 bg-background/50 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {schedule === "weekly" && (
                <FormField control={form.control} name="schedule_weekday" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">Day of Week</FormLabel>
                    <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-background/50 rounded-xl max-w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WEEKDAY_LABELS.map((d, i) => (
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}

              {schedule !== "none" && (
                <p className="text-xs text-muted-foreground">
                  {schedule === "daily"
                    ? `Will run every day at ${String(form.watch("schedule_hour")).padStart(2,"0")}:${String(form.watch("schedule_minute")).padStart(2,"0")}`
                    : `Will run every ${WEEKDAY_LABELS[form.watch("schedule_weekday")]} at ${String(form.watch("schedule_hour")).padStart(2,"0")}:${String(form.watch("schedule_minute")).padStart(2,"0")}`
                  }
                </p>
              )}
            </div>

            {/* Queries section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <Label className="text-foreground font-semibold text-lg">Search Queries</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ query: "", category: "custom" })} className="rounded-lg h-9">
                  <Plus className="w-4 h-4 mr-2" /> Add Query
                </Button>
              </div>
              {fields.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">No queries added. The search will not yield results without queries.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-3 p-1">
                      <FormField control={form.control} name={`queries.${index}.query`} render={({ field }) => (
                        <FormItem className="flex-1 space-y-0">
                          <FormControl>
                            <Input placeholder="e.g. procurement manager remote" className="h-11 bg-background/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}
                        className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="bg-muted/20 border-t border-border/50 px-6 py-4">
            <Button type="submit" disabled={isCreating || isUpdating}
              className="ml-auto rounded-xl px-8 h-12 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all font-semibold text-base">
              {isCreating || isUpdating ? "Saving..." : "Save Profile"} <Save className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
