import { Link, useLocation } from "wouter";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarTrigger, 
  SidebarHeader 
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Users, 
  Search, 
  FileText, 
  History, 
  Settings 
} from "lucide-react";
import { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  
  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profiles", label: "Profiles", icon: Users },
    { href: "/search", label: "Run Search", icon: Search },
    { href: "/resume", label: "Resume Parser", icon: FileText },
    { href: "/history", label: "Run History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border/40">
          <SidebarHeader className="flex items-center pt-6 pb-4 px-4">
            <div className="flex items-center gap-3 font-display font-bold text-xl text-primary w-full overflow-hidden">
              <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <span className="truncate">JobSearch Pro</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3 py-2">
            <SidebarGroup>
              <SidebarMenu className="space-y-1">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive} 
                        tooltip={item.label}
                        className={`transition-all duration-200 rounded-xl py-6 ${isActive ? 'bg-primary/10 text-primary hover:bg-primary/15 font-medium' : 'hover:bg-muted font-normal'}`}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-[15px]">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex-1 flex flex-col overflow-hidden relative w-full">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-screen" />
          
          <header className="h-16 shrink-0 flex items-center justify-between border-b border-border/40 px-6 bg-background/60 backdrop-blur-xl sticky top-0 z-20">
            <SidebarTrigger className="hover:bg-primary/20 transition-colors w-10 h-10 rounded-xl" />
            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                Pro Network Connected
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-0">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
