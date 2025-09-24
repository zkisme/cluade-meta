import { useState, useRef, useEffect } from "react";
import { Outlet } from "@tanstack/react-router";
import { MainContent } from "@/components/MainContent";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, FileText, Download, Upload, MoreVertical } from "lucide-react";
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
  SidebarRail,
} from "@/components/ui/sidebar";
import { Settings, Home, FolderOpen } from "lucide-react";
import { ConfigPathManager } from "@/components/ConfigPathManager";
import { featureDetection, FeatureStatus } from "@/services/featureDetection";
import { Link } from "@tanstack/react-router";

import { configTypes } from "@/config/index";

function AppContent() {
  const apiKeyManagerRef = useRef<any>(null);
  const [showConfigPathManager, setShowConfigPathManager] = useState(false);
  const [installedFeatures, setInstalledFeatures] = useState<FeatureStatus[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // Check installed features on component mount
  useEffect(() => {
    const checkFeatures = async () => {
      try {
        const features = await featureDetection.getInstalledFeatures();
        setInstalledFeatures(features);
      } catch (error) {
        console.error("Failed to check installed features:", error);
      } finally {
        setLoading(false);
      }
    };

    checkFeatures();
  }, []);

  // Filter config types to only show installed features
  const availableConfigTypes = configTypes.filter((configType) => {
    // Check if the feature is installed
    return installedFeatures.some(
      (feature) => feature.feature_id === configType.id
    );
  });

  // Sort available config types by feature name
  const sortedConfigTypes = availableConfigTypes.sort((a, b) => {
    return a.displayName.localeCompare(b.displayName);
  });

  const items = sortedConfigTypes.map((configType) => ({
    title: configType.displayName,
    key: configType.id,
    icon: configType.icon,
  }));

  return (
    <div className="flex h-screen w-full">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Settings className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Claude Meta</span>
              <span className="truncate text-xs">Configuration Manager</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>系统信息</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/"
                      className="flex items-center gap-2"
                      activeProps={{
                        className: "bg-secondary text-secondary-foreground",
                      }}
                    >
                      <Home />
                      <span>概览</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/project-management"
                      className="flex items-center gap-2"
                      activeProps={{
                        className: "bg-secondary text-secondary-foreground",
                      }}
                    >
                      <FolderOpen />
                      <span>项目管理</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>配置管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={`/config/${item.key}`}
                        className="flex items-center gap-2"
                        activeProps={{
                          className: "bg-secondary text-secondary-foreground",
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <main className="flex flex-1 flex-col overflow-hidden p-6">
        <Outlet />
      </main>

      <ConfigPathManager
        open={showConfigPathManager}
        onOpenChange={setShowConfigPathManager}
      />
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
