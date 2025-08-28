import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Key, 
  Route,
  Globe,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Download,
  Loader2
} from "lucide-react";
import { configTypes } from "@/config/index";
import { FeatureStatus, featureDetection } from "@/services/featureDetection";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface OverviewProps {
  onNavigate: (view: 'overview' | 'claude-code' | 'claude-router') => void;
  installedFeatures?: FeatureStatus[];
  onFeatureInstalled?: () => void;
}

export function Overview({ onNavigate, installedFeatures = [], onFeatureInstalled }: OverviewProps) {
  const [allFeatures, setAllFeatures] = useState<FeatureStatus[]>([]);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  
  // Fetch all features (including uninstalled ones) on component mount
  useEffect(() => {
    const fetchAllFeatures = async () => {
      try {
        const features = await featureDetection.checkAllFeatures();
        setAllFeatures(features);
      } catch (error) {
        console.error('Failed to fetch feature status:', error);
      }
    };
    
    fetchAllFeatures();
  }, [installedFeatures]);
  
  const handleInstallFeature = async (featureId: string) => {
    try {
      setInstalling(prev => new Set([...prev, featureId]));
      toast.info(`正在安装 ${getFeatureDisplayName(featureId)}...`);
      
      await featureDetection.installFeature(featureId);
      
      toast.success(`${getFeatureDisplayName(featureId)} 安装成功！`);
      
      // Refresh features
      if (onFeatureInstalled) {
        onFeatureInstalled();
      }
    } catch (error) {
      console.error('Failed to install feature:', error);
      toast.error(`安装 ${getFeatureDisplayName(featureId)} 失败`);
    } finally {
      setInstalling(prev => {
        const newSet = new Set(prev);
        newSet.delete(featureId);
        return newSet;
      });
    }
  };
  
  const getFeatureDisplayName = (featureId: string) => {
    const configType = configTypes.find(ct => ct.id === featureId);
    return configType?.displayName || featureId;
  };
  
  const getFeatureStatus = (featureId: string) => {
    return allFeatures.find(f => f.feature_id === featureId);
  };

  const configStats = allFeatures.map(feature => {
    const configType = configTypes.find(ct => ct.id === feature.feature_id);
    if (!configType) return null;
    
    let icon = Key;
    let color = "text-blue-600";
    let bgColor = "bg-blue-50";
    
    switch (feature.feature_id) {
      case "claude-code":
        icon = Key;
        color = "text-blue-600";
        bgColor = "bg-blue-50";
        break;
      case "claude-router":
        icon = Route;
        color = "text-green-600";
        bgColor = "bg-green-50";
        break;
      default:
        icon = Globe;
        color = "text-gray-600";
        bgColor = "bg-gray-50";
        break;
    }
    
    return {
      id: feature.feature_id as 'claude-code' | 'claude-router',
      title: configType.displayName,
      description: feature.description,
      icon,
      status: feature.is_installed ? "installed" : "not_installed",
      color,
      bgColor,
      canInstall: feature.can_install,
      isInstalling: installing.has(feature.feature_id),
    };
  }).filter((config): config is NonNullable<typeof config> => config !== null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "installed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "not_installed":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, isInstalling: boolean = false) => {
    if (isInstalling) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">安装中...</Badge>;
    }
    
    switch (status) {
      case "installed":
        return <Badge variant="default" className="bg-green-100 text-green-800">已安装</Badge>;
      case "not_installed":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">未安装</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">配置管理概览</h1>
          <p className="text-muted-foreground mt-1">
            Claude Meta - Claude Code 桌面配置管理器
          </p>
        </div>
      </div>

      {/* 配置状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configStats.map((config) => {
          const IconComponent = config.icon;
          const isInstalled = config.status === "installed";
          const canNavigate = isInstalled;
          
          return (
            <Card 
              key={config.id}
              className={`transition-all border-l-4 ${canNavigate ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : 'opacity-80'}`}
              style={{ borderLeftColor: config.color.includes('blue') ? '#2563eb' : config.color.includes('green') ? '#16a34a' : '#6b7280' }}
              onClick={() => {
                if (canNavigate) {
                  onNavigate(config.id);
                }
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <IconComponent className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(config.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(config.status, config.isInstalling)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isInstalled ? (
                      <Button variant="outline" size="sm" className="h-8 px-3">
                        <ArrowRight className="h-4 w-4 mr-1" />
                        进入
                      </Button>
                    ) : config.canInstall ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInstallFeature(config.id);
                        }}
                        disabled={config.isInstalling}
                      >
                        {config.isInstalling ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            安装中
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            安装
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 应用信息 */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Settings className="h-6 w-6 text-muted-foreground" />
              <span className="text-xl font-semibold">Claude Meta</span>
            </div>
            <p className="text-muted-foreground">
              基于 Tauri + React 的桌面配置管理工具
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
              <span>版本 0.1.0</span>
              <span>•</span>
              <span>开源项目</span>
              <span>•</span>
              <span>MIT 协议</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}