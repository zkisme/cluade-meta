import { useEffect } from "react";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Router, Variable, Home, Settings } from "lucide-react";

type ActiveView = 'overview' | 'claude-code' | 'claude-router' | 'environment';

interface MainContentProps {
  activeView: ActiveView;
  apiKeyManagerRef?: React.RefObject<any>;
}

export function MainContent({ activeView, apiKeyManagerRef }: MainContentProps) {
  const updateTitle = (title: string) => {
    const titleElement = document.getElementById('main-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  };

  useEffect(() => {
    switch (activeView) {
      case 'claude-code':
        updateTitle('Claude Code API 密钥管理');
        break;
      case 'claude-router':
        updateTitle('Claude Code Router');
        break;
      case 'environment':
        updateTitle('环境变量');
        break;
      default:
        updateTitle('概览');
    }
  }, [activeView]);
  const renderContent = () => {
    switch (activeView) {
      case 'claude-code':
        return <ApiKeyManager 
          ref={apiKeyManagerRef}
          onOpenCreateDialog={() => {}}
          onViewConfig={() => {}}
          onBackup={() => {}}
          onOpenAdvancedEdit={() => {}}
        />;
      
      case 'claude-router':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">
                  配置Claude Code的路由设置和请求处理
                </p>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>路由配置</CardTitle>
                <CardDescription>
                  管理API请求的路由规则和配置
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Router className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">路由配置功能开发中</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    此功能将在后续版本中提供
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'environment':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">
                  管理应用程序的环境变量和配置文件
                </p>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>环境变量管理</CardTitle>
                <CardDescription>
                  配置和管理系统环境变量
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Variable className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">环境变量功能开发中</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    此功能将在后续版本中提供
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">
                  Config Meta - Claude Code配置管理器
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tauri</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">v2</div>
                  <p className="text-xs text-muted-foreground">Desktop framework</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">React</CardTitle>
                  <Code className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">18</div>
                  <p className="text-xs text-muted-foreground">Frontend framework</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tailwind</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">v4</div>
                  <p className="text-xs text-muted-foreground">CSS framework</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>功能特性</CardTitle>
                <CardDescription>
                  Config Meta 提供的主要功能
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Claude Code 配置</h4>
                    <p className="text-sm text-muted-foreground">
                      管理 Claude Code API 密钥，支持安全的存储和检索
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">路由管理</h4>
                    <p className="text-sm text-muted-foreground">
                      配置 API 请求的路由规则和参数设置
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">环境变量</h4>
                    <p className="text-sm text-muted-foreground">
                      管理应用程序的环境变量配置
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">桌面应用</h4>
                    <p className="text-sm text-muted-foreground">
                      基于 Tauri 的跨平台桌面应用
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}