import { useState, useEffect } from "react";

import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings,
  FolderSearch,
  AlertCircle,
  Folder,
  Terminal,
  Code,
  FileText,
  RefreshCw,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Project, ScanOptions } from "@/types/project";
import { projectsApi } from "@/api/projects";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { CustomCategory } from "@/types/project";
import { ProjectScanSettings } from "./ProjectScanSettings";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { CategoryFilter } from "./CategoryFilter";

// Helper function to get IDE icon
const getIdeIcon = (ide: string) => {
  switch (ide) {
    case "vscode":
    case "cursor":
      return <Code className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

// Helper function to get IDE display name
const getIdeDisplayName = (ide: string) => {
  switch (ide) {
    case "vscode":
      return "VS Code";
    case "cursor":
      return "Cursor";
    case "webstorm":
      return "WebStorm";
    case "typora":
      return "Typora";
    case "sublime":
      return "Sublime Text";
    case "atom":
      return "Atom";
    default:
      return ide;
  }
};

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scanOptions, setScanOptions] = useState<ScanOptions>({
    marker_files: [
      "package.json",
      "index.html",
      "docker-compose.yml",
      "Dockerfile",
      "Cargo.toml",
    ],
    ignore_patterns: [".git", "node_modules", "target", "dist"],
    max_depth: 5,
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(
    []
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const filteredProjects = selectedCategory
    ? projects.filter((project) => project.category === selectedCategory)
    : projects;

  const handleScan = async () => {
    try {
      setError(null);
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "选择要扫描的文件夹",
      });

      if (typeof selectedPath === "string") {
        console.log("DEBUG: Starting scan for path:", selectedPath);
        setIsLoading(true);
        const result = await projectsApi.scanAndSaveProjects(selectedPath, scanOptions);
        console.log("DEBUG: Scan completed, result:", result);
        setProjects(result);
        // 刷新分类列表以包含新创建的分类
        console.log("DEBUG: Refreshing custom categories after scan...");
        fetchCustomCategories();
      }
    } catch (err) {
      console.error("Scan failed:", err);
      setError(typeof err === "string" ? err : "扫描项目时发生未知错误。");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const result = await projectsApi.getProjects();
      setProjects(result);
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  };

  const handleOpenFolder = async (path: string) => {
    try {
      await invoke("open_in_explorer", { path });
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  };

  const handleOpenTerminal = async (path: string) => {
    try {
      await invoke("open_in_terminal", { path });
    } catch (err) {
      console.error("Failed to open terminal:", err);
    }
  };

  const handleOpenWithIDE = async (path: string, ide: string) => {
    try {
      await invoke("open_with_ide", { path, ide });
    } catch (err) {
      console.error(`Failed to open with ${ide}:`, err);
    }
  };

  const fetchCustomCategories = async () => {
    try {
      console.log("DEBUG: Fetching custom categories...");
      const result = await invoke<CustomCategory[]>("get_custom_categories");
      console.log("DEBUG: Fetched custom categories:", result);
      setCustomCategories(result);
    } catch (err) {
      console.error("Failed to fetch custom categories:", err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Category name cannot be empty.");
      return;
    }
    try {
      await invoke("add_custom_category", { name: newCategoryName });
      setNewCategoryName("");
      setIsAddCategoryDialogOpen(false);
      fetchCustomCategories(); // Refresh the list
    } catch (err) {
      console.error("Failed to add custom category:", err);
      alert(typeof err === "string" ? err : "Failed to add custom category.");
    }
  };

  
  const handleDeleteCategory = async (categoryName: string) => {
    try {
      // 检查是否有项目使用此分类
      const projectsInCategory = projects.filter(p => p.category === categoryName);
      
      if (projectsInCategory.length > 0) {
        // 显示确认对话框
        const confirmDelete = confirm(
          `确定要删除分类"${categoryName}"吗？\n\n此操作将同时删除 ${projectsInCategory.length} 个相关项目记录，但不会影响本地项目文件。`
        );
        
        if (!confirmDelete) {
          return; // 用户取消删除
        }
        
        // 级联删除分类和相关项目
        await invoke("delete_custom_category_with_projects", { name: categoryName });
        
        // 刷新项目列表
        loadProjects();
      } else {
        // 没有项目，直接删除分类
        await invoke("delete_custom_category", { name: categoryName });
      }
      
      fetchCustomCategories(); // Refresh the list
      
      // 如果当前选中的是被删除的分类，清除选择
      if (selectedCategory === categoryName) {
        setSelectedCategory(null);
      }
    } catch (err) {
      console.error("Failed to delete custom category:", err);
      alert(typeof err === "string" ? err : "Failed to delete custom category.");
    }
  };

  useEffect(() => {
    fetchCustomCategories();
    loadProjects();
  }, []); // Only run once on mount

  // Update sidebar collapse state based on projects and categories
  useEffect(() => {
    if (projects.length === 0 && customCategories.length === 0) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [projects.length, customCategories.length]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between p-4 px-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            {" "}
            {/* New div to group title and toggle button */}
            <h1 className="text-xl font-bold">项目管理</h1>
            {/* Toggle button for sidebar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="ml-2"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}{" "}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleScan} disabled={isLoading}>
              <FolderSearch className="h-4 w-4 mr-2" />
              扫描文件夹
            </Button>
            <Button variant="outline" onClick={loadProjects}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
              <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 grow-0 overflow-hidden" style={{flex: 1}}>
          <Collapsible
            open={!isSidebarCollapsed}
            onOpenChange={setIsSidebarCollapsed}
          >
            <CollapsibleContent className="flex flex-col flex-none w-64 border-r h-full data-[state=closed]:w-0 data-[state=closed]:p-0 data-[state=closed]:border-r-0 transition-all duration-300 ease-in-out box-border p-4 pl-0">
              <div className="flex-grow flex-1 overflow-y-auto space-y-4">
                {" "}
                {/* CategoryFilter and its buttons will scroll here */}
                {(projects.length > 0 || customCategories.length > 0) && (
                  <CategoryFilter
                    projects={projects}
                    onSelectCategory={setSelectedCategory}
                    selectedCategory={selectedCategory}
                    customCategories={customCategories}
                    onDeleteCategory={handleDeleteCategory}
                  />
                )}
              </div>
              <div className="px-0 pb-4">
                {" "}
                {/* This div will stick to the bottom */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAddCategoryDialogOpen(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  新增分类
                </Button>
              </div>
            </CollapsibleContent>{" "}
          </Collapsible>

          {/* Right content area for Project List */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {" "}
            {error && (
              <div className="flex flex-col items-center justify-center text-destructive bg-red-50 p-4 rounded-md">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="font-semibold">扫描失败</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full mt-1" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-5 w-1/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProjects.map((project) => (
                  <Card key={project.path}>
                    <CardHeader>
                      <CardTitle className="truncate">{project.name}</CardTitle>
                      <CardDescription
                        className="truncate"
                        title={project.path}
                      >
                        {project.path}
                      </CardDescription>
                      {/* Tags below title, single line, overflow hidden, jelly-like colors */}
                      <div className="flex gap-1 mt-2 overflow-hidden whitespace-nowrap text-ellipsis">
                        {project.project_type && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                            {project.project_type}
                          </Badge>
                        )}
                        {project.frameworks.map((framework) => {
                          let frameworkColorClass =
                            "bg-gray-100 text-gray-800 hover:bg-gray-200"; // Default
                          switch (framework.toLowerCase()) {
                            case "react":
                            case "nextjs":
                              frameworkColorClass =
                                "bg-cyan-100 text-cyan-800 hover:bg-cyan-200";
                              break;
                            case "vue":
                            case "nuxt":
                              frameworkColorClass =
                                "bg-green-100 text-green-800 hover:bg-green-200";
                              break;
                            case "tauri":
                            case "electron":
                              frameworkColorClass =
                                "bg-purple-100 text-purple-800 hover:bg-purple-200";
                              break;
                            case "astro":
                              frameworkColorClass =
                                "bg-orange-100 text-orange-800 hover:bg-orange-200";
                              break;
                            case "typescript":
                              frameworkColorClass =
                                "bg-blue-100 text-blue-800 hover:bg-blue-200";
                              break;
                            case "tailwindcss":
                              frameworkColorClass =
                                "bg-teal-100 text-teal-800 hover:bg-teal-200";
                              break;
                            case "vite":
                              frameworkColorClass =
                                "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
                              break;
                            // Add more cases for other frameworks with jelly-like colors
                          }
                          return (
                            <Badge
                              key={framework}
                              className={frameworkColorClass}
                            >
                              {framework}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-grow">
                      {" "}
                      {/* Added flex-col and flex-grow */}
                      {/* Project description, max two lines, ellipsis, hover for full text */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] flex-grow">
                            {" "}
                            {/* min-h for placeholder, added flex-grow */}
                            {project.description}
                          </p>
                        </TooltipTrigger>
                        {project.description && (
                          <TooltipContent>
                            <p>{project.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <div className="flex items-center justify-end gap-2 mt-4">
                        {" "}
                        {/* Moved buttons to bottom right */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenFolder(project.path)}
                              >
                                <Folder className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>打开文件夹</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenTerminal(project.path)}
                              >
                                <Terminal className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>在终端中打开</p>
                          </TooltipContent>
                        </Tooltip>
                        <HoverCard openDelay={300}>
                          <HoverCardTrigger asChild>
                            <span>
                              <Button variant="ghost" size="icon">
                                <Code className="h-4 w-4" />
                              </Button>
                            </span>
                          </HoverCardTrigger>
                          <HoverCardContent align="end" className="w-auto p-2">
                            <div className="grid gap-1">
                              {[
                                "vscode",
                                "cursor",
                                "webstorm",
                                "typora",
                                "sublime",
                                "atom",
                              ].map((ide) => (
                                <button
                                  key={ide}
                                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                  onClick={() =>
                                    handleOpenWithIDE(project.path, ide)
                                  }
                                >
                                  {getIdeIcon(ide)} {getIdeDisplayName(ide)}
                                </button>
                              ))}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              !error && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>还没有项目，请先扫描文件夹。</p>
                </div>
              )
            )}
          </div>
        </div>

        <ProjectScanSettings
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          scanOptions={scanOptions}
          onScanOptionsChange={setScanOptions}
        />

        <Dialog
          open={isAddCategoryDialogOpen}
          onOpenChange={setIsAddCategoryDialogOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>新增分类</DialogTitle>
              <DialogDescription>输入新的分类名称。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryName" className="text-right">
                  名称
                </Label>
                <Input
                  id="categoryName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddCategory}>
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
