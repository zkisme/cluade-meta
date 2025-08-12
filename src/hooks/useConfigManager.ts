import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ConfigItem, CreateConfigRequest, UpdateConfigRequest, ConfigType, BackupFile } from "@/types/config";

// Helper function to safely invoke Tauri commands
const invokeTauri = async <T,>(command: string, args?: any): Promise<T> => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(command, args);
  } catch (importError) {
    console.warn(`Failed to import Tauri API:`, importError);
    throw new Error('Tauri environment not available');
  }
};

// Helper function to check if we're in Tauri environment
const isTauriEnvironment = async (): Promise<boolean> => {
  try {
    // Use the official Tauri v2 isTauri() function
    const { isTauri } = await import('@tauri-apps/api/core');
    return isTauri();
  } catch {
    // Fallback: check if we can access Tauri APIs
    try {
      await import('@tauri-apps/api/core');
      return true;
    } catch {
      return false;
    }
  }
};

export function useConfigManager<T = any>(configType: ConfigType<T>) {
  const [items, setItems] = useState<ConfigItem<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem<T> | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);

  // Load active item ID from localStorage on mount
  useEffect(() => {
    const savedActiveItemId = localStorage.getItem(`active_${configType.id}`);
    if (savedActiveItemId) {
      setActiveItemId(savedActiveItemId);
    }
  }, [configType.id]);

  // Save active item ID to localStorage when it changes
  useEffect(() => {
    if (activeItemId) {
      localStorage.setItem(`active_${configType.id}`, activeItemId);
    } else {
      localStorage.removeItem(`active_${configType.id}`);
    }
  }, [activeItemId, configType.id]);

  // Sync active item with items list
  useEffect(() => {
    if (activeItemId && items.length > 0) {
      const activeItemExists = items.some(item => item.id === activeItemId);
      if (!activeItemExists) {
        setActiveItemId(null);
        localStorage.removeItem(`active_${configType.id}`);
      }
    }
  }, [items, activeItemId, configType.id]);

  const loadItems = useCallback(async () => {
    try {
      console.log(`Loading ${configType.name} items...`);
      
      // Check if we're in browser environment first
      const isTauri = await isTauriEnvironment();
      if (!isTauri) {
        console.log('Browser environment detected, skipping Tauri API calls');
        setItems([]);
        toast.info(`浏览器环境1：${configType.displayName}功能不可用`);
        return;
      }
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Loading timeout')), 5000);
      });
      
      const result = await Promise.race([
        invokeTauri<ConfigItem<T>[]>(configType.apiEndpoints.list),
        timeoutPromise
      ]) as ConfigItem<T>[];
      
      console.log(`Loaded ${result.length} ${configType.name} items`);
      setItems(result);
    } catch (error) {
      console.error(`Failed to load ${configType.name}:`, error);
      // In browser environment, set empty items instead of showing error
      if (error instanceof Error && error.message === 'Tauri environment not available') {
        setItems([]);
        toast.info(`浏览器环境2：${configType.displayName}功能不可用`);
      } else if (error instanceof Error && error.message === 'Loading timeout') {
        setItems([]);
        toast.error(`加载${configType.displayName}超时，请重试`);
      } else {
        setItems([]);
        toast.error(`加载${configType.displayName}失败`);
      }
    } finally {
      setLoading(false);
    }
  }, [configType.name, configType.displayName, configType.apiEndpoints.list]);

  // Load items on mount
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCreate = async (request: CreateConfigRequest<T>) => {
    try {
      const result = await invokeTauri<ConfigItem<T>>(configType.apiEndpoints.create, { request });
      setItems(prev => [result, ...prev]);
      setIsFormDialogOpen(false);
      setEditingItem(null);
      toast.success(`${configType.displayName}创建成功`);
    } catch (error) {
      console.error(`Failed to create ${configType.name}:`, error);
      if (error instanceof Error && error.message === 'Tauri environment not available') {
        toast.error(`浏览器环境3：无法创建${configType.displayName}`);
      } else {
        toast.error(`创建${configType.displayName}失败`);
      }
    }
  };

  const handleUpdate = async (id: string, request: UpdateConfigRequest<T>) => {
    try {
      const result = await invokeTauri<ConfigItem<T>>(configType.apiEndpoints.update, { id, request });
      setItems(prev => prev.map(item => item.id === id ? result : item));
      setIsFormDialogOpen(false);
      setEditingItem(null);
      toast.success(`${configType.displayName}更新成功`);
    } catch (error) {
      console.error(`Failed to update ${configType.name}:`, error);
      if (error instanceof Error && error.message === 'Tauri environment not available') {
        toast.error(`浏览器环境4：无法更新${configType.displayName}`);
      } else {
        toast.error(`更新${configType.displayName}失败`);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`确定要删除这个${configType.displayName}吗？`)) return;

    try {
      const deleted = await invokeTauri<boolean>(configType.apiEndpoints.delete, { id });
      if (deleted) {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success(`${configType.displayName}删除成功`);
      } else {
        toast.error(`未找到要删除的${configType.displayName}`);
      }
    } catch (error) {
      console.error(`Failed to delete ${configType.name}:`, error);
      if (error instanceof Error && error.message === 'Tauri environment not available') {
        toast.error(`浏览器环境5：无法删除${configType.displayName}`);
      } else {
        toast.error(`删除${configType.displayName}失败`);
      }
    }
  };

  const handleBackup = async () => {
    try {
      const timestamp = new Date();
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const day = String(timestamp.getDate()).padStart(2, '0');
      const hour = String(timestamp.getHours()).padStart(2, '0');
      const minute = String(timestamp.getMinutes()).padStart(2, '0');
      
      const backupFileName = `${configType.id}_${year}${month}${day}_${hour}_${minute}.json`;
      
      await invokeTauri<boolean>("backup_config_file", { backupFilename: backupFileName });
      toast.success(`${configType.displayName}配置已成功备份为: ${backupFileName}`);
    } catch (error) {
      console.error("Failed to backup config file:", error);
      if (error instanceof Error && error.message === 'Tauri environment not available') {
        toast.error(`浏览器环境：无法备份${configType.displayName}`);
      } else {
        toast.error(`备份失败，请重试`);
      }
    }
  };

  const handleRestore = async () => {
    try {
      const files = await invokeTauri<BackupFile[]>("get_backup_files");
      setBackupFiles(files);
      setIsRestoreDialogOpen(true);
    } catch (error) {
      console.error("Failed to get backup files:", error);
      if (error instanceof Error && error.message === 'Tauri environment not available') {
        toast.error(`浏览器环境：无法恢复${configType.displayName}`);
      } else {
        toast.error("获取备份文件失败，请重试");
      }
    }
  };

  const restoreFromBackup = async (filename: string) => {
    try {
      const result = await invokeTauri<boolean>("restore_config_file", { backupFilename: filename });
      if (result) {
        toast.success(`${configType.displayName}配置已从备份 ${filename} 恢复成功`);
        setIsRestoreDialogOpen(false);
        await loadItems();
      }
    } catch (error) {
      console.error("Failed to restore config file:", error);
      if (error instanceof Error && error.message === 'Tauri environment not available') {
        toast.error(`浏览器环境：无法恢复${configType.displayName}`);
      } else {
        toast.error(`恢复失败，请重试`);
      }
    }
  };

  const deleteBackupFile = async (filename: string) => {
    if (!confirm(`确定要删除备份文件 ${filename} 吗？此操作无法撤销。`)) return;

    try {
      const result = await invokeTauri<boolean>("delete_backup_file", { backupFilename: filename });
      if (result) {
        toast.success(`备份文件 ${filename} 已成功删除`);
        const files = await invokeTauri<BackupFile[]>("get_backup_files");
        setBackupFiles(files);
      } else {
        toast.error("未找到要删除的备份文件");
      }
    } catch (error) {
      console.error("Failed to delete backup file:", error);
      if (error instanceof Error && error.message === 'Tauri environment not available') {
        toast.error(`浏览器环境：无法删除备份文件`);
      } else {
        toast.error(`删除失败，请重试`);
      }
    }
  };

  const getBackupContent = async (filename: string) => {
    try {
      const content = await invokeTauri<string>("get_backup_content", { backupFilename: filename });
      return content;
    } catch (error) {
      console.error("Failed to get backup content:", error);
      if (error instanceof Error && error.message === 'Tauri environment not available') {
        toast.error(`浏览器环境：无法查看备份内容`);
      } else {
        toast.error(`获取备份内容失败，请重试`);
      }
      return null;
    }
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (item: ConfigItem<T>) => {
    setEditingItem(item);
    setIsFormDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return {
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
  };
}