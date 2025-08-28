import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Settings, Server, Route, Globe, Eye, Save, RotateCcw, FolderOpen, Edit3, FileText, Upload, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { ClaudeCodeRouterConfig } from '@/types/claude-code-router';
import { ProviderManager } from './ProviderManager';
import { RouterRulesManager } from './RouterRulesManager';
import { GlobalConfigManager } from './GlobalConfigManager';
import { ConfigImportExport } from './ConfigImportExport';

interface RouterBackupFile {
  filename: string;
  path: string;
  size: number;
  created_at: string;
}

export function ClaudeCodeRouterManager() {
  const [config, setConfig] = useState<ClaudeCodeRouterConfig>({
    Providers: [],
    Router: {
      default: '',
      longContextThreshold: 60000,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('providers');
  const [configPath, setConfigPath] = useState<string>('');
  const [isViewingConfig, setIsViewingConfig] = useState(false);
  const [rawConfigContent, setRawConfigContent] = useState<string>('');
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isSelectingBackup, setIsSelectingBackup] = useState(false);
  const [backupFiles, setBackupFiles] = useState<RouterBackupFile[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [isViewingBackup, setIsViewingBackup] = useState(false);

  // 加载配置
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const result = await invoke<ClaudeCodeRouterConfig>('get_router_config');
      setConfig(result || {
        Providers: [],
        Router: {
          default: '',
          longContextThreshold: 60000,
        },
      });
    } catch (error) {
      console.error('加载配置失败:', error);
      toast.error('加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async (newConfig: ClaudeCodeRouterConfig) => {
    try {
      console.log('=== FRONTEND saveConfig called ===');
      console.log('Config being saved:', newConfig);
      console.log('Providers count:', newConfig.Providers?.length || 0);
      await invoke('update_router_config', { config: newConfig });
      setConfig(newConfig);
      toast.success('配置保存成功');
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error('保存配置失败');
    }
  };

  useEffect(() => {
    loadConfig();
    // 同时加载配置文件路径
    const loadConfigPath = async () => {
      try {
        const path = await invoke<string>('get_router_config_path_command');
        setConfigPath(path);
      } catch (error) {
        console.error('获取配置文件路径失败:', error);
      }
    };
    loadConfigPath();
  }, []);

  const handleConfigChange = (newConfig: ClaudeCodeRouterConfig) => {
    console.log('=== handleConfigChange called ===');
    console.log('New config:', newConfig);
    console.log('New providers count:', newConfig.Providers?.length || 0);
    saveConfig(newConfig);
  };

  // 查看配置文件内容
  const viewConfigFile = async () => {
    try {
      const content = await invoke<string>('get_raw_router_config');
      const path = configPath || await invoke<string>('get_router_config_path_command');
      setRawConfigContent(content);
      if (!configPath) setConfigPath(path);
      setIsViewingConfig(true);
    } catch (error) {
      console.error('获取配置文件失败:', error);
      toast.error('获取配置文件失败');
    }
  };

  // 备份配置文件
  const backupConfig = async () => {
    try {
      const result = await invoke<string>('backup_router_config');
      toast.success(`配置已备份至: ${result}`);
    } catch (error) {
      console.error('备份配置失败:', error);
      toast.error('备份配置失败');
    }
  };

  // 恢复配置文件
  const restoreConfig = async () => {
    try {
      // 先获取备份文件列表
      const files = await invoke<RouterBackupFile[]>('get_router_backup_files');
      if (files.length === 0) {
        toast.error('没有找到备份文件');
        return;
      }
      setBackupFiles(files);
      setIsSelectingBackup(true);
    } catch (error) {
      console.error('获取备份文件列表失败:', error);
      toast.error('获取备份文件列表失败');
    }
  };

  // 从指定备份恢复配置
  const restoreFromBackup = async (backupFilename: string) => {
    try {
      await invoke('restore_router_config_from_file', { backupFilename });
      await loadConfig();
      setIsSelectingBackup(false);
      toast.success('配置已恢复');
    } catch (error) {
      console.error('恢复配置失败:', error);
      toast.error('恢复配置失败');
    }
  };

  // 查看备份内容
  const viewBackupContent = async (backupFilename: string) => {
    try {
      const content = await invoke<string>('get_router_backup_content', { backupFilename });
      setRawConfigContent(content);
      setSelectedBackup(backupFilename);
      setIsViewingBackup(true);
    } catch (error) {
      console.error('获取备份内容失败:', error);
      toast.error('获取备份内容失败');
    }
  };

  // 删除备份文件
  const deleteBackup = async (backupFilename: string) => {
    try {
      await invoke('delete_router_backup', { backupFilename });
      // 刷新备份文件列表
      const files = await invoke<RouterBackupFile[]>('get_router_backup_files');
      setBackupFiles(files);
      toast.success('备份文件已删除');
    } catch (error) {
      console.error('删除备份文件失败:', error);
      toast.error('删除备份文件失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期时间
  const formatDateTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  // 设置配置文件路径
  const selectConfigPath = async () => {
    try {
      const path = await invoke<string>('select_router_config_path');
      if (path) {
        setConfigPath(path); // 更新本地状态
        await loadConfig();
        toast.success(`配置文件路径已更新: ${path}`);
      }
    } catch (error) {
      console.error('设置配置文件路径失败:', error);
      toast.error('设置配置文件路径失败');
    }
  };

  // 保存编辑的原始配置
  const saveRawConfig = async () => {
    try {
      await invoke('save_raw_router_config', { content: rawConfigContent });
      await loadConfig();
      setIsEditingConfig(false);
      toast.success('配置文件已保存');
    } catch (error) {
      console.error('保存配置文件失败:', error);
      toast.error('保存配置文件失败');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 配置文件管理工具栏 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 gap-3">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
            <Settings className="h-4 w-4" />
            配置文件管理
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={backupConfig}
              className="bg-white/50 border-green-200 hover:bg-green-100 text-green-700 h-7 px-2 text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              备份配置
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={restoreConfig}
              className="bg-white/50 border-orange-200 hover:bg-orange-100 text-orange-700 h-7 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              恢复配置
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                viewConfigFile().then(() => setIsEditingConfig(true));
              }}
              className="bg-white/50 border-red-200 hover:bg-red-100 text-red-700 h-7 px-2 text-xs"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              高级编辑
            </Button>
          </div>
          {configPath && (
            <div className="mt-2 p-1.5 bg-white/30 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-800">
                  <FileText className="h-2.5 w-2.5 inline mr-1" />
                  配置文件路径: <code className="bg-white/50 px-1 py-0.5 rounded text-[10px]">{configPath}</code>
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={viewConfigFile}
                    className="h-5 px-2 py-0 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-100/50"
                  >
                    查看
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectConfigPath}
                    className="h-5 px-2 py-0 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-100/50"
                  >
                    修改
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 配置文件查看/编辑对话框 */}
      {isViewingConfig && (
        <Card className="fixed inset-4 z-50 bg-background shadow-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              {isEditingConfig ? (
                <>
                  <Edit3 className="h-5 w-5" />
                  高级编辑配置文件
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  查看配置文件
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isEditingConfig && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={saveRawConfig}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewingConfig(false);
                  setIsEditingConfig(false);
                }}
              >
                关闭
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-full">
            <div className="h-[calc(100vh-12rem)] overflow-hidden">
              {isEditingConfig ? (
                <textarea
                  value={rawConfigContent}
                  onChange={(e) => setRawConfigContent(e.target.value)}
                  className="w-full h-full p-4 font-mono text-sm bg-gray-50 border-none resize-none focus:outline-none focus:ring-0"
                  placeholder="配置文件内容..."
                />
              ) : (
                <pre className="w-full h-full p-4 font-mono text-sm bg-gray-50 overflow-auto whitespace-pre-wrap">
                  {rawConfigContent}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 备份选择对话框 */}
      {isSelectingBackup && (
        <Card className="fixed inset-4 z-50 bg-background shadow-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              选择要恢复的备份
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSelectingBackup(false)}
            >
              关闭
            </Button>
          </CardHeader>
          <CardContent className="p-6 h-[calc(100vh-12rem)] overflow-auto">
            {backupFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-16 w-16 mb-4" />
                <p>没有找到备份文件</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backupFiles.map((backup) => (
                  <Card key={backup.filename} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <h4 className="font-medium text-sm">{backup.filename}</h4>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>创建时间: {formatDateTime(backup.created_at)}</p>
                          <p>文件大小: {formatFileSize(backup.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewBackupContent(backup.filename)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          查看
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreFromBackup(backup.filename)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          恢复
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBackup(backup.filename)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          删除
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 备份内容查看对话框 */}
      {isViewingBackup && (
        <Card className="fixed inset-4 z-50 bg-background shadow-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              备份内容 - {selectedBackup}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => restoreFromBackup(selectedBackup)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                恢复此备份
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewingBackup(false);
                  setSelectedBackup('');
                }}
              >
                关闭
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-full">
            <div className="h-[calc(100vh-12rem)] overflow-hidden">
              <pre className="w-full h-full p-4 font-mono text-sm bg-gray-50 overflow-auto whitespace-pre-wrap">
                {rawConfigContent}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 覆盖层 */}
      {isViewingConfig && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={() => {
            setIsViewingConfig(false);
            setIsEditingConfig(false);
          }}
        />
      )}

      {/* 覆盖层 */}
      {(isSelectingBackup || isViewingBackup) && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={() => {
            setIsSelectingBackup(false);
            setIsViewingBackup(false);
            setSelectedBackup('');
          }}
        />
      )}
      {/* 概览统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">提供商数量</CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <Server className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{config.Providers?.length || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">已配置的模型提供商</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">模型总数</CardTitle>
            <div className="p-2 bg-green-100 rounded-full">
              <Globe className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {config.Providers?.reduce((total, provider) => total + (provider.models?.length || 0), 0) || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">可用的AI模型</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">路由规则</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
              <Route className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {Object.keys(config.Router || {}).filter(key => key !== 'longContextThreshold' && config.Router?.[key as keyof typeof config.Router]).length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">配置的路由规则</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">配置状态</CardTitle>
            <div className={`p-2 rounded-full ${config.Router?.default ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <Settings className={`h-4 w-4 ${config.Router?.default ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${config.Router?.default ? 'text-emerald-600' : 'text-amber-600'}`}>
              {config.Router?.default ? '已配置' : '待配置'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">默认路由设置</p>
          </CardContent>
          <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${config.Router?.default ? 'from-emerald-400 to-emerald-600' : 'from-amber-400 to-amber-600'}`}></div>
        </Card>
      </div>

      {/* 主要配置选项卡 */}
      <Card className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b bg-muted/30">
            <div className="flex items-center justify-between px-6 py-4">
              <TabsList className="grid w-auto grid-cols-4 bg-background/50 backdrop-blur-sm">
                <TabsTrigger value="providers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  提供商配置
                </TabsTrigger>
                <TabsTrigger value="routing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  路由规则
                </TabsTrigger>
                <TabsTrigger value="global" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  全局设置
                </TabsTrigger>
                <TabsTrigger value="import-export" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  导入/导出
                </TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('import-export')}
                className="bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                备份配置
              </Button>
            </div>
          </div>

          <div className="p-6">
            <TabsContent value="providers" className="mt-0 space-y-6">
              <ProviderManager
                providers={config.Providers || []}
                onChange={(providers) => handleConfigChange({ ...config, Providers: providers })}
              />
            </TabsContent>

            <TabsContent value="routing" className="mt-0 space-y-6">
              <RouterRulesManager
                router={config.Router || {}}
                providers={config.Providers || []}
                onChange={(router) => handleConfigChange({ ...config, Router: router })}
              />
            </TabsContent>

            <TabsContent value="global" className="mt-0 space-y-6">
              <GlobalConfigManager
                config={config}
                onChange={handleConfigChange}
              />
            </TabsContent>

            <TabsContent value="import-export" className="mt-0 space-y-6">
              <ConfigImportExport
                config={config}
                onImport={(importedConfig) => {
                  setConfig(importedConfig);
                  saveConfig(importedConfig);
                }}
              />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}