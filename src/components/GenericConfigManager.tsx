import { forwardRef, useImperativeHandle, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Copy, Eye, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ConfigType } from "@/types/config";
import { useConfigManager } from "@/hooks/useConfigManager";
import { ConfigFormDialog } from "@/components/ConfigFormDialog";

// Helper function to safely invoke Tauri commands
const invokeTauri = async <T,>(command: string, args?: any): Promise<T> => {
  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    if (await isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<T>(command, args);
    } else {
      throw new Error('Tauri environment not available');
    }
  } catch (importError) {
    console.warn(`Failed to import Tauri API:`, importError);
    throw new Error('Tauri environment not available');
  }
};

interface GenericConfigManagerProps<T = any> {
  configType: ConfigType<T>;
  onOpenCreateDialog?: () => void;
  onViewConfig?: () => void;
  onBackup?: () => void;
  onRestore?: () => void;
  onOpenAdvancedEdit?: () => void;
}

export const GenericConfigManager = forwardRef<any, GenericConfigManagerProps>(
  ({ configType }, ref) => {
    const {
      items,
      loading,
      isFormDialogOpen,
      setIsFormDialogOpen,
      editingItem,
      activeItemId,
      backupFiles,
      isRestoreDialogOpen,
      setIsRestoreDialogOpen,
      loadItems,
      handleCreate,
      handleUpdate,
      handleDelete,
      handleBackup,
      handleRestore,
      restoreFromBackup,
      deleteBackupFile,
      getBackupContent,
      openCreateDialog,
      openEditDialog,
      setActiveItemId,
      formatDate,
      formatFileSize,
    } = useConfigManager(configType);

    // State for view and advanced edit dialogs
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isAdvancedEditDialogOpen, setIsAdvancedEditDialogOpen] = useState(false);
    const [isBackupPreviewDialogOpen, setIsBackupPreviewDialogOpen] = useState(false);
    const [advancedEditContent, setAdvancedEditContent] = useState("");
    const [backupPreviewContent, setBackupPreviewContent] = useState("");
    const [backupPreviewFilename, setBackupPreviewFilename] = useState("");
    const [configPathInfo, setConfigPathInfo] = useState<string | null>(null);

    // Load items when component mounts
    useImperativeHandle(ref, () => ({
      onOpenCreateDialog: openCreateDialog,
      onViewConfig: handleViewConfig,
      onBackup: handleBackup,
      onRestore: handleRestore,
      onOpenAdvancedEdit: handleAdvancedEdit,
      loadItems: loadItems,
    }));

    // Load items are handled by the useConfigManager hook

    const handleToggleActive = async (id: string) => {
      const newActiveItemId = id === activeItemId ? null : id;
      setActiveItemId(newActiveItemId);
      
      // If config type has setActive endpoint, call it
      if (configType.apiEndpoints.setActive) {
        try {
          await invokeTauri<boolean>(configType.apiEndpoints.setActive, { id, active: id !== activeItemId });
          toast.success(`${configType.displayName}状态已更新`);
        } catch (error) {
          console.error("Failed to set active config:", error);
          if (error instanceof Error && error.message === 'Tauri environment not available') {
            toast.error(`浏览器环境：无法更新${configType.displayName}状态`);
          } else {
            toast.error("更新状态失败");
          }
        }
      }
      
      // If config type has onConfigUpdate, call it with the active item's data
      if (configType.onConfigUpdate) {
        try {
          // Get the actual config path from the backend
          const actualConfigPath = await invokeTauri<string>('get_config_path');
          const activeItem = newActiveItemId ? items.find(item => item.id === newActiveItemId) : null;
          if (activeItem) {
            await configType.onConfigUpdate(activeItem.data, actualConfigPath);
            toast.success(`${configType.displayName}配置文件已更新`);
          } else if (newActiveItemId === null) {
            // If no active item, update with default data
            await configType.onConfigUpdate(configType.defaultData, actualConfigPath);
            toast.success(`${configType.displayName}配置文件已重置为默认值`);
          }
        } catch (error) {
          console.error("Failed to update config file:", error);
          if (error instanceof Error && error.message === 'Tauri environment not available') {
            toast.error(`浏览器环境：无法更新${configType.displayName}配置文件`);
          } else {
            toast.error("更新配置文件失败");
          }
        }
      }
    };

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    };

    const handlePreviewBackup = async (filename: string) => {
      try {
        const content = await getBackupContent(filename);
        if (content) {
          setBackupPreviewContent(content);
          setBackupPreviewFilename(filename);
          setIsBackupPreviewDialogOpen(true);
        }
      } catch (error) {
        console.error("Failed to preview backup:", error);
        toast.error("预览备份失败");
      }
    };

    const handleViewConfig = async () => {
      try {
        // Check if we're in Tauri environment first
        const { isTauri } = await import('@tauri-apps/api/core');
        if (await isTauri()) {
          const { invoke } = await import('@tauri-apps/api/core');
          // Get the actual config path from the backend (database)
          const configPath = await invoke<string>('get_config_path');
          const fileContent = await invoke<string>('read_config_file', { configPath });
          setAdvancedEditContent(fileContent);
          setConfigPathInfo(configPath);
          setIsViewDialogOpen(true);
        } else {
          toast.error("浏览器环境：无法读取配置文件");
        }
      } catch (error) {
        console.error("Failed to read config file:", error);
        toast.error("读取配置文件失败");
      }
    };

    const handleAdvancedEdit = async () => {
      try {
        // Read the actual config file content for editing
        const { isTauri } = await import('@tauri-apps/api/core');
        if (await isTauri()) {
          const { invoke } = await import('@tauri-apps/api/core');
          // Get the actual config path from the backend (database)
          const configPath = await invoke<string>('get_config_path');
          const fileContent = await invoke<string>('read_config_file', { configPath });
          setAdvancedEditContent(fileContent);
          setConfigPathInfo(configPath);
          setIsAdvancedEditDialogOpen(true);
        } else {
          toast.error("浏览器环境：无法编辑配置文件");
        }
      } catch (error) {
        console.error("Failed to read config file:", error);
        toast.error("读取配置文件失败");
      }
    };

    const handleSaveAdvancedEdit = async () => {
      try {
        // Save the edited content back to the config file
        const { isTauri } = await import('@tauri-apps/api/core');
        if (await isTauri()) {
          const { invoke } = await import('@tauri-apps/api/core');
          // Get the actual config path from the backend (database)
          const configPath = await invoke<string>('get_config_path');
          await invoke('write_config_file', { 
            configPath, 
            content: advancedEditContent 
          });
          setIsAdvancedEditDialogOpen(false);
          toast.success("配置文件已保存");
          
          // Reload the items to reflect changes
          await loadItems();
        } else {
          toast.error("浏览器环境：无法保存配置文件");
        }
      } catch (error) {
        console.error("Failed to save config file:", error);
        toast.error("保存配置文件失败");
      }
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
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <div className="mx-auto h-12 w-12 text-muted-foreground flex items-center justify-center">
                <configType.icon className="h-8 w-8" />
              </div>
              <h3 className="mt-2 text-sm font-medium">暂无{configType.displayName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击上方"添加"按钮创建您的第一个{configType.displayName}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className="p-3 w-full">
                  {configType.listComponent ? (
                    <configType.listComponent
                      item={item}
                      isActive={activeItemId === item.id}
                      onToggleActive={handleToggleActive}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                    />
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Switch
                            checked={activeItemId === item.id}
                            onCheckedChange={() => handleToggleActive(item.id)}
                          />
                          <h3 className="text-sm font-medium truncate">{item.name}</h3>
                        </div>
                        
                        <div className="mb-1">
                          <span className="text-xs text-muted-foreground">数据: </span>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {JSON.stringify(item.data, null, 2)}
                          </code>
                        </div>
                        
                        {item.description && (
                          <div className="mb-1">
                            <span className="text-xs text-muted-foreground">描述: </span>
                            <span className="text-xs">{item.description}</span>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          创建时间: {formatDate(item.created_at)}
                        </div>
                      </div>
                      
                      <div className="flex space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(item.data))}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <ConfigFormDialog
          configType={configType}
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          editingItem={editingItem}
          onSave={(request) => {
            if ('id' in request) {
              handleUpdate(request.id, request.request);
            } else {
              handleCreate(request);
            }
          }}
        />

        {/* Restore Dialog */}
        <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>恢复{configType.displayName}配置</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {backupFiles.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-lg">
                  <div className="mx-auto h-12 w-12 text-muted-foreground">📅</div>
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
                            <span>创建时间: {formatDate(file.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewBackup(file.filename)}
                            className="h-8 w-8 p-0"
                            title="预览备份内容"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreFromBackup(file.filename)}
                            className="h-8 px-3"
                          >
                            恢复
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBackupFile(file.filename)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
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

        {/* View Config Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                查看配置文件
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">配置文件路径</h4>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm font-mono">{configPathInfo}</code>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">配置文件内容</h4>
                <div className="p-3 bg-muted rounded-md">
                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {advancedEditContent}
                  </pre>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => copyToClipboard(advancedEditContent)}
                >
                  复制内容
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsViewDialogOpen(false)}>
                  关闭
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Advanced Edit Dialog */}
        <Dialog open={isAdvancedEditDialogOpen} onOpenChange={setIsAdvancedEditDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                高级编辑配置文件
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">配置文件路径</h4>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm font-mono">{configPathInfo}</code>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">配置文件内容</h4>
                <textarea
                  value={advancedEditContent}
                  onChange={(e) => setAdvancedEditContent(e.target.value)}
                  className="w-full h-96 p-3 border border-border rounded-md font-mono text-sm bg-gray-900 text-gray-100 resize-none"
                  placeholder="请输入配置文件内容"
                />
                <p className="text-xs text-muted-foreground">
                  提示：直接编辑配置文件内容，支持JSON格式和其他配置格式
                </p>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  ⚠️ 警告：直接编辑配置文件可能会影响应用程序的正常运行，请谨慎操作
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAdvancedEditDialogOpen(false)}>
                    取消
                  </Button>
                  <Button size="sm" onClick={handleSaveAdvancedEdit}>
                    保存到文件
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Backup Preview Dialog */}
        <Dialog open={isBackupPreviewDialogOpen} onOpenChange={setIsBackupPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                预览备份内容
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">备份文件名</h4>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm font-mono">{backupPreviewFilename}</code>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">备份内容</h4>
                <div className="p-3 bg-muted rounded-md">
                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {backupPreviewContent}
                  </pre>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => copyToClipboard(backupPreviewContent)}
                >
                  复制内容
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsBackupPreviewDialogOpen(false)}>
                  关闭
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);