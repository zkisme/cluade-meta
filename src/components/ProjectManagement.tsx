import { useState } from "react";
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
  FileText,
  Code,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Project, ScanOptions } from "@/types/project";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectScanSettings } from "./ProjectScanSettings";

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

  const handleScan = async () => {
    try {
      setError(null);
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "选择要扫描的文件夹",
      });

      if (typeof selectedPath === "string") {
        setIsLoading(true);
        const result = await invoke<Project[]>("scan_projects", {
          path: selectedPath,
          options: scanOptions,
        });
        setProjects(result);
      }
    } catch (err) {
      console.error("Scan failed:", err);
      setError(typeof err === "string" ? err : "扫描项目时发生未知错误。");
    } finally {
      setIsLoading(false);
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

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-xl font-bold">项目管理</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleScan} disabled={isLoading}>
              <FolderSearch className="h-4 w-4 mr-2" />
              扫描文件夹
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
          ) : projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((project) => (
                <Card key={project.path}>
                  <CardHeader>
                    <CardTitle className="truncate">{project.name}</CardTitle>
                    <CardDescription className="truncate" title={project.path}>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <span>
                            <Button variant="ghost" size="icon">
                              <Code className="h-4 w-4" />
                            </Button>
                          </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleOpenWithIDE(project.path, "vscode")
                            }
                          >
                            VS Code
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleOpenWithIDE(project.path, "cursor")
                            }
                          >
                            Cursor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleOpenWithIDE(project.path, "webstorm")
                            }
                          >
                            WebStorm
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleOpenWithIDE(project.path, "typora")
                            }
                          >
                            Typora
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleOpenWithIDE(project.path, "sublime")
                            }
                          >
                            Sublime Text
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleOpenWithIDE(project.path, "atom")
                            }
                          >
                            Atom
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

        <ProjectScanSettings
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          scanOptions={scanOptions}
          onScanOptionsChange={setScanOptions}
        />
      </div>
    </TooltipProvider>
  );
}
