import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Key, Copy, Eye, EyeOff, Upload, Clock } from "lucide-react";
import { ConfigEditor } from "@/components/ConfigEditor";
import { KeyFormDialog } from "@/components/KeyFormDialog";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface BackupFile {
  filename: string;
  path: string;
  size: number;
  created_at: string;
}


interface ApiKeyManagerProps {
  onOpenCreateDialog?: () => void;
  onViewConfig?: () => void;
  onBackup?: () => void;
  onOpenAdvancedEdit?: () => void;
}

export const ApiKeyManager = forwardRef<any, ApiKeyManagerProps>((_, ref) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isKeyFormDialogOpen, setIsKeyFormDialogOpen] = useState(false);
  const [isConfigViewDialogOpen, setIsConfigViewDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [configContent, setConfigContent] = useState("");
  const [configLoading, setConfigLoading] = useState(false);
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  const [isConfigEditorOpen, setIsConfigEditorOpen] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    onOpenCreateDialog: () => {
      setEditingKey(null);
      setIsKeyFormDialogOpen(true);
    },
    onViewConfig: handleViewConfig,
    onBackup: handleBackup,
    onRestore: handleRestore,
    onOpenAdvancedEdit: () => {
      setIsConfigEditorOpen(true);
    },
  }));
  
  
  const loadApiKeys = async () => {
    try {
      const keys = await invoke<ApiKey[]>("get_api_keys");
      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to load API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    console.log("Backup button clicked");
    
    try {
      const timestamp = new Date();
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const day = String(timestamp.getDate()).padStart(2, '0');
      const hour = String(timestamp.getHours()).padStart(2, '0');
      const minute = String(timestamp.getMinutes()).padStart(2, '0');
      
      const backupFileName = `settings_${year}${month}${day}_${hour}_${minute}.json`;
      console.log("Generated backup filename:", backupFileName);
      
      const result = await invoke<boolean>("backup_config_file", { backupFilename: backupFileName });
      console.log("Backup completed successfully, result:", result);
      
      // 显示成功消息
      toast.success(`配置文件已成功备份为: ${backupFileName}`);
    } catch (error) {
      console.error("Failed to backup config file:", error);
      toast.error(`备份失败，请重试\n错误: ${(error as any)?.message || error}`);
    }
  };

  const handleRestore = async () => {
    try {
      const files = await invoke<BackupFile[]>("get_backup_files");
      setBackupFiles(files);
      setIsRestoreDialogOpen(true);
    } catch (error) {
      console.error("Failed to get backup files:", error);
      toast.error("获取备份文件失败，请重试");
    }
  };

  const restoreFromBackup = async (filename: string) => {
    try {
      const result = await invoke<boolean>("restore_config_file", { backupFilename: filename });
      if (result) {
        toast.success(`配置文件已从备份 ${filename} 恢复成功`);
        setIsRestoreDialogOpen(false);
        // 刷新API密钥列表
        loadApiKeys();
      }
    } catch (error) {
      console.error("Failed to restore config file:", error);
      toast.error(`恢复失败，请重试\n错误: ${(error as any)?.message || error}`);
    }
  };

  const loadConfigContent = async () => {
    setConfigLoading(true);
    try {
      const content = await invoke<string>("get_config_file_content");
      setConfigContent(content);
    } catch (error) {
      console.error("Failed to load config content:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConfigContent(`Failed to load configuration file: ${errorMessage}`);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleViewConfig = () => {
    loadConfigContent();
    setIsConfigViewDialogOpen(true);
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个API密钥吗？")) return;

    try {
      // 使用新的SQLite后端函数
      const deleted = await invoke<boolean>("delete_api_key", { id });
      
      if (deleted) {
        loadApiKeys();
        toast.success("API密钥已成功删除");
      } else {
        toast.error("未找到要删除的API密钥");
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast.error("删除API密钥失败，请重试");
    }
  };

  const openEditDialog = (key: ApiKey) => {
    setEditingKey(key);
    setIsKeyFormDialogOpen(true);
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSwitchToggle = (id: string) => {
    if (activeKeyId === id) {
      setActiveKeyId(null);
    } else {
      setActiveKeyId(id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatBackupTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + "..." + key.substring(key.length - 4);
  };

  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* 添加按钮已移至标题栏 */}
        
              </div>

      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <Key className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium">暂无API密钥</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              点击上方"添加"按钮创建您的第一个API密钥
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <Card key={key.id} className="p-3 w-full">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <Switch
                        checked={activeKeyId === key.id}
                        onCheckedChange={() => handleSwitchToggle(key.id)}
                      />
                      <h3 className="text-sm font-medium truncate">{key.name}</h3>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs text-muted-foreground">密钥:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate flex-1">
                        {showKeys[key.id] ? key.key : maskKey(key.key)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowKey(key.id)}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        {showKeys[key.id] ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(key.key)}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {key.description && (
                      <div className="mb-1">
                        <span className="text-xs text-muted-foreground">描述: </span>
                        <span className="text-xs">{key.description}</span>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      创建时间: {formatDate(key.created_at)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(key)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(key.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <KeyFormDialog 
        open={isKeyFormDialogOpen}
        onOpenChange={setIsKeyFormDialogOpen}
        editingKey={editingKey}
        onKeySaved={() => {
          loadApiKeys();
          setEditingKey(null);
        }}
      />

      <Dialog open={isConfigViewDialogOpen} onOpenChange={setIsConfigViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>配置文件内容</DialogTitle>
            <DialogDescription>
              当前API密钥配置文件的JSON内容
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              {configLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">加载中...</div>
                </div>
              ) : (
                <pre className="text-sm overflow-auto max-h-60 whitespace-pre-wrap">
                  {configContent}
                </pre>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setIsConfigViewDialogOpen(false)}>
                关闭
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  navigator.clipboard.writeText(configContent);
                  toast.success('配置内容已复制到剪贴板');
                }}
              >
                复制内容
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 恢复对话框 */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>恢复配置文件</DialogTitle>
            <DialogDescription>
              选择一个备份文件来恢复配置文件
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {backupFiles.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium">暂无备份文件</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  请先备份配置文件
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {backupFiles.map((file) => (
                  <Card key={file.filename} className="p-3 w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-medium truncate">{file.filename}</h3>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>大小: {formatFileSize(file.size)}</span>
                          <span>创建时间: {formatBackupTime(file.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreFromBackup(file.filename)}
                          className="h-8 px-3"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          恢复
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsRestoreDialogOpen(false)}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 配置编辑器组件 */}
      <ConfigEditor 
        open={isConfigEditorOpen}
        onOpenChange={setIsConfigEditorOpen}
        onConfigSaved={() => {
          // 当配置保存后刷新API密钥列表
          loadApiKeys();
        }} 
      />
    </>
  );
});