import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Save, RotateCcw, FolderOpen, Edit3, FileText, Settings, Trash2, Clock, Upload, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { GenericConfigManager } from './GenericConfigManager';
import { claudeCodeConfigType } from '@/config/claudeCode';
import { forwardRef } from 'react';

interface ClaudeBackupFile {
  filename: string;
  path: string;
  size: number;
  created_at: string;
}

interface ClaudeCodeManagerProps {
  ref?: React.Ref<any>;
  onOpenCreateDialog?: () => void;
}

export const ClaudeCodeManager = forwardRef<any, ClaudeCodeManagerProps>(({ onOpenCreateDialog, ...props }, ref) => {
  const [configPath, setConfigPath] = useState<string>('');
  const [isViewingConfig, setIsViewingConfig] = useState(false);
  const [rawConfigContent, setRawConfigContent] = useState<string>('');
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isSelectingBackup, setIsSelectingBackup] = useState(false);
  const [backupFiles, setBackupFiles] = useState<ClaudeBackupFile[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [isViewingBackup, setIsViewingBackup] = useState(false);

  // 组件加载时获取配置文件路径
  useEffect(() => {
    const loadConfigPath = async () => {
      try {
        const path = await invoke<string>('get_config_path');
        setConfigPath(path);
      } catch (error) {
        console.error('获取配置文件路径失败:', error);
      }
    };
    loadConfigPath();
  }, []);

  // 查看配置文件内容
  const viewConfigFile = async () => {
    try {
      const path = configPath || await invoke<string>('get_config_path');
      const content = await invoke<string>('read_config_file', { configPath: path });
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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFilename = `claude_config_backup_${timestamp}.json`;
      await invoke<boolean>('backup_config_file', { backupFilename });
      toast.success(`配置已备份: ${backupFilename}`);
    } catch (error) {
      console.error('备份配置失败:', error);
      toast.error('备份配置失败');
    }
  };

  // 恢复配置文件
  const restoreConfig = async () => {
    try {
      // 先获取备份文件列表
      const files = await invoke<ClaudeBackupFile[]>('get_backup_files');
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
      await invoke('restore_config_file', { backupFilename });
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
      const content = await invoke<string>('get_backup_content', { backupFilename });
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
      await invoke('delete_backup_file', { backupFilename });
      // 刷新备份文件列表
      const files = await invoke<ClaudeBackupFile[]>('get_backup_files');
      setBackupFiles(files);
      toast.success('备份文件已删除');
    } catch (error) {
      console.error('删除备份文件失败:', error);
      toast.error('删除备份文件失败');
    }
  };

  // 设置配置文件路径
  const selectConfigPath = async () => {
    try {
      const path = await invoke<string>('open_file_dialog');
      if (path) {
        await invoke('save_config_path', { path });
        setConfigPath(path); // 更新本地状态
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
      const path = await invoke<string>('get_config_path');
      await invoke('write_config_file', { configPath: path, content: rawConfigContent });
      setIsEditingConfig(false);
      toast.success('配置文件已保存');
    } catch (error) {
      console.error('保存配置文件失败:', error);
      toast.error('保存配置文件失败');
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

  return (
    <div className="space-y-6">
      {/* 配置文件管理工具栏 */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 gap-3">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-green-900 text-base">
            <Settings className="h-4 w-4" />
            Claude Code 配置文件管理
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenCreateDialog?.()}
              className="bg-white/50 border-emerald-200 hover:bg-emerald-100 text-emerald-700 h-7 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              新增密钥
            </Button>
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
                <p className="text-xs text-green-800">
                  <FileText className="h-2.5 w-2.5 inline mr-1" />
                  配置文件路径: <code className="bg-white/50 px-1 py-0.5 rounded text-[10px]">{configPath}</code>
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={viewConfigFile}
                    className="h-5 px-2 py-0 text-xs text-green-700 hover:text-green-800 hover:bg-green-100/50"
                  >
                    查看
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectConfigPath}
                    className="h-5 px-2 py-0 text-xs text-green-700 hover:text-green-800 hover:bg-green-100/50"
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

      {/* 原有的GenericConfigManager */}
      <GenericConfigManager 
        ref={ref}
        configType={claudeCodeConfigType}
      />
    </div>
  );
});

ClaudeCodeManager.displayName = 'ClaudeCodeManager';