import { PageTransition } from "@/components/page-transition";
import { useGetConfig, useUpdateConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings2, Mail, Lock, RotateCcw, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const configSchema = z.object({
  max_results_per_query: z.coerce.number().min(1).max(500),
  request_delay: z.coerce.number().min(0).max(10),
  email_enabled: z.boolean().default(false),
  email_from: z.string().optional(),
  email_to: z.string().optional(),
  smtp_host: z.string().optional(),
  smtp_port: z.coerce.number().optional(),
  smtp_user: z.string().optional(),
  smtp_password: z.string().optional(),
});

type ConfigValues = z.infer<typeof configSchema>;

function PasswordSection() {
  const { token, logout } = useAuth();
  const { toast } = useToast();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changePending, setChangePending] = useState(false);
  const [resetPending, setResetPending] = useState(false);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw || newPw.length < 4) {
      toast({ title: "Error", description: "New password must be at least 4 characters.", variant: "destructive" });
      return;
    }
    setChangePending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Password Changed", description: "Your password has been updated. Please sign in again." });
      setCurrentPw(""); setNewPw("");
      setTimeout(() => logout(), 1500);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to change password.", variant: "destructive" });
    } finally {
      setChangePending(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset password back to 'admin'? You will be signed out.")) return;
    setResetPending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Password Reset", description: "Password has been reset to 'admin'." });
      setTimeout(() => logout(), 1500);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Reset failed.", variant: "destructive" });
    } finally {
      setResetPending(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-xl bg-card/60 backdrop-blur">
      <CardHeader className="border-b border-border/50 pb-5">
        <CardTitle className="text-xl flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-500" /> Access & Security
        </CardTitle>
        <CardDescription>Change your dashboard password. You will be signed out after any change.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleChange} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="current-pw" className="font-semibold text-foreground">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  className="h-11 bg-background/50 pr-10"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw" className="font-semibold text-foreground">New Password</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Min. 4 characters"
                  className="h-11 bg-background/50 pr-10"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={changePending || !currentPw || !newPw}
              className="rounded-xl px-6 h-10 font-semibold shadow-md">
              {changePending ? "Updating..." : "Change Password"}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={resetPending}
              className="rounded-xl px-6 h-10 text-muted-foreground border-border/50 hover:border-destructive/50 hover:text-destructive hover:bg-destructive/10 gap-2">
              <RotateCcw className="w-4 h-4" />
              {resetPending ? "Resetting..." : "Reset to 'admin'"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { data: config, isLoading } = useGetConfig();
  const { mutate: updateConfig, isPending } = useUpdateConfig();
  const { toast } = useToast();

  const form = useForm<ConfigValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      max_results_per_query: 25,
      request_delay: 2,
      email_enabled: false,
    }
  });

  useEffect(() => {
    if (config) {
      form.reset({
        max_results_per_query: config.max_results_per_query,
        request_delay: config.request_delay,
        email_enabled: config.email_enabled || false,
        email_from: config.email_from || "",
        email_to: config.email_to || "",
        smtp_host: config.smtp_host || "smtp.gmail.com",
        smtp_port: config.smtp_port || 587,
        smtp_user: config.smtp_user || "",
        smtp_password: config.smtp_password || "",
      });
    }
  }, [config, form]);

  const onSubmit = (values: ConfigValues) => {
    updateConfig({ data: values }, {
      onSuccess: () => toast({ title: "Settings Saved", description: "Global configuration updated successfully." }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading settings...</div>;
  }

  return (
    <PageTransition>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1 text-lg">Configure scraping engine limits, notifications, and security.</p>
        </div>

        <PasswordSection />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card className="border-border/50 shadow-xl bg-card/60 backdrop-blur">
              <CardHeader className="border-b border-border/50 pb-5">
                <CardTitle className="text-xl flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" /> Extraction Engine</CardTitle>
                <CardDescription>Core parameters for the scraping jobs.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="max_results_per_query" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground">Max Results Per Query</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-11 bg-background/50" {...field} />
                      </FormControl>
                      <FormDescription>Limits how many jobs to pull per keyword, per source.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="request_delay" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground">Request Delay (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" className="h-11 bg-background/50" {...field} />
                      </FormControl>
                      <FormDescription>Pause between requests to avoid rate limiting.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-xl bg-card/60 backdrop-blur">
              <CardHeader className="border-b border-border/50 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2"><Mail className="w-5 h-5 text-amber-500" /> Email Notifications</CardTitle>
                    <CardDescription>Automatically send Excel reports via SMTP when searches finish.</CardDescription>
                  </div>
                  <FormField control={form.control} name="email_enabled" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormLabel className="font-semibold text-foreground cursor-pointer mb-0">Enabled</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </CardHeader>
              {form.watch("email_enabled") && (
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="email_from" render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Address</FormLabel>
                        <FormControl><Input className="h-11 bg-background/50" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email_to" render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Address (Recipient)</FormLabel>
                        <FormControl><Input className="h-11 bg-background/50" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="smtp_host" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Host</FormLabel>
                        <FormControl><Input className="h-11 bg-background/50" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="smtp_port" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Port</FormLabel>
                        <FormControl><Input type="number" className="h-11 bg-background/50" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="smtp_user" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Username</FormLabel>
                        <FormControl><Input className="h-11 bg-background/50" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="smtp_password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Password (App Password)</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" className="h-11 bg-background/50" {...field} value={field.value || ""} /></FormControl>
                        <FormDescription>Use an App Password if using Gmail.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              )}
            </Card>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-base">
                {isPending ? "Saving..." : "Save Configuration"} <Save className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </PageTransition>
  );
}
