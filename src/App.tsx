import { useState } from "react";
import { MainContent } from "@/components/MainContent";
import { Toaster } from "@/components/ui/sonner";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail
} from "@/components/ui/sidebar";
import { 
  Settings, 
  Code, 
  Router, 
  Variable,
  Home
} from "lucide-react";

// Menu items.
const items = [
  {
    title: "Claude Code",
    key: "claude-code",
    icon: Code,
  },
  {
    title: "Claude Code Router",
    key: "claude-router",
    icon: Router,
  },
  {
    title: "环境变量",
    key: "environment",
    icon: Variable,
  },
];

type ActiveView = 'overview' | 'claude-code' | 'claude-router' | 'environment';

function AppContent() {
  const [activeView, setActiveView] = useState<ActiveView>('overview');

  const handleMenuClick = (key: string) => {
    setActiveView(key as ActiveView);
  };

  return (
    <div className="flex h-screen w-full">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Settings className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Config Meta</span>
              <span className="truncate text-xs">Configuration Manager</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>配置管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton 
                      asChild
                      isActive={activeView === item.key}
                      onClick={() => handleMenuClick(item.key)}
                    >
                      <a href="#" className="flex items-center gap-2">
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
          <SidebarGroup>
            <SidebarGroupLabel>系统信息</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    isActive={activeView === 'overview'}
                    onClick={() => setActiveView('overview')}
                  >
                    <a href="#" className="flex items-center gap-2">
                      <Home />
                      <span>概览</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b">
          <div className="flex items-center gap-2 px-4">
            <h1 className="text-xl font-semibold" id="main-title">概览</h1>
          </div>
        </header>
        
        <MainContent activeView={activeView} />
      </main>
    </div>
  );
}

function App() {
  return (
    <SidebarProvider>
      <AppContent />
      <Toaster />
    </SidebarProvider>
  );
}

export default App;