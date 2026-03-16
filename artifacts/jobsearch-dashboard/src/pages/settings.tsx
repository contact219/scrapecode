import { PageTransition } from "@/components/page-transition";
import { useGetConfig, useUpdateConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings2, Mail } from "lucide-react";

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
          <p className="text-muted-foreground mt-1 text-lg">Configure scraping engine limits and notification preferences.</p>
        </div>

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
