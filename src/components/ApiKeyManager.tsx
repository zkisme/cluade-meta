import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Key, Copy, Eye, EyeOff, FolderOpen } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface CreateApiKeyRequest {
  name: string;
  key: string;
  description?: string;
  api_url?: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  timeout?: number;
  proxy_url?: string;
  verbose?: boolean;
  stream?: boolean;
  unsafe_html?: boolean;
}

interface UpdateApiKeyRequest {
  name?: string;
  key?: string;
  description?: string;
  api_url?: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  timeout?: number;
  proxy_url?: string;
  verbose?: boolean;
  stream?: boolean;
  unsafe_html?: boolean;
}

interface ApiKeyManagerProps {
  onOpenCreateDialog?: () => void;
  onViewConfig?: () => void;
  onBackup?: () => void;
}

export const ApiKeyManager = forwardRef<any, ApiKeyManagerProps>((_, ref) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfigViewDialogOpen, setIsConfigViewDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [configPath, setConfigPath] = useState("~/.claude/settings.json");
  const [configContent, setConfigContent] = useState("");
  const [configLoading, setConfigLoading] = useState(false);
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    onOpenCreateDialog: () => setIsCreateDialogOpen(true),
    onViewConfig: handleViewConfig,
    onBackup: handleBackup,
  }));
  
  const [createForm, setCreateForm] = useState<CreateApiKeyRequest>({
    name: "",
    key: "",
    description: "",
    api_url: "https://api.anthropic.com",
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 0.9,
    timeout: 30000,
    proxy_url: "",
    verbose: false,
    stream: true,
    unsafe_html: false
  });

  const [editForm, setEditForm] = useState<UpdateApiKeyRequest>({
    name: "",
    key: "",
    description: "",
    api_url: "",
    model: "",
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 0.9,
    timeout: 30000,
    proxy_url: "",
    verbose: false,
    stream: true,
    unsafe_html: false
  });

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

  const handleCreate = async () => {
    if (!createForm.name || !createForm.key) return;

    try {
      // 使用新的SQLite后端函数
      await invoke<ApiKey>("create_api_key", {
        request: {
          name: createForm.name,
          key: createForm.key,
          description: createForm.description || ""
        }
      });
      
      // 重置表单
      setCreateForm({
        name: "",
        key: "",
        description: "",
        api_url: "https://api.anthropic.com",
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.9,
        timeout: 30000,
        proxy_url: "",
        verbose: false,
        stream: true,
        unsafe_html: false
      });
      setIsCreateDialogOpen(false);
      loadApiKeys();
      
      // 显示成功消息
      toast.success("API密钥已成功创建");
    } catch (error) {
      console.error("Failed to create API key:", error);
      toast.error("创建API密钥失败，请重试");
    }
  };

  const handleUpdate = async () => {
    if (!editingKey) return;

    try {
      // 使用新的SQLite后端函数
      await invoke<ApiKey>("update_api_key", {
        id: editingKey.id,
        request: {
          name: editForm.name || editingKey.name,
          key: editForm.key || editingKey.key,
          description: editForm.description !== undefined ? editForm.description : editingKey.description
        }
      });
      
      setIsEditDialogOpen(false);
      setEditingKey(null);
      setEditForm({
        name: "",
        key: "",
        description: "",
        api_url: "",
        model: "",
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.9,
        timeout: 30000,
        proxy_url: "",
        verbose: false,
        stream: true,
        unsafe_html: false
      });
      loadApiKeys();
      
      // 显示成功消息
      toast.success("API密钥已成功更新");
    } catch (error) {
      console.error("Failed to update API key:", error);
      toast.error("更新API密钥失败，请重试");
    }
  };

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
    setEditForm({
      name: key.name,
      key: key.key,
      description: key.description,
      api_url: (key as any).api_url || "https://api.anthropic.com",
      model: (key as any).model || "claude-3-5-sonnet-20241022",
      max_tokens: (key as any).max_tokens || 4096,
      temperature: (key as any).temperature || 0.7,
      top_p: (key as any).top_p || 0.9,
      timeout: (key as any).timeout || 30000,
      proxy_url: (key as any).proxy_url || "",
      verbose: (key as any).verbose || false,
      stream: (key as any).stream || true,
      unsafe_html: (key as any).unsafe_html || false
    });
    setIsEditDialogOpen(true);
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
        
        {/* 创建对话框 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加新的API密钥配置</DialogTitle>
              <DialogDescription>
                创建一个新的Claude API密钥配置
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">名称 *</label>
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="输入配置名称"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">API密钥 *</label>
                    <Input
                      value={createForm.key}
                      onChange={(e) => setCreateForm({ ...createForm, key: e.target.value })}
                      placeholder="sk-ant-api03-..."
                      type="password"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">API URL</label>
                  <Input
                    value={createForm.api_url}
                    onChange={(e) => setCreateForm({ ...createForm, api_url: e.target.value })}
                    placeholder="https://api.anthropic.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">备注说明</label>
                  <Textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="输入描述信息（可选）"
                    className="min-h-[60px]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={!createForm.name || !createForm.key}>
                  创建配置
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">配置文件路径</label>
        <div className="flex gap-2">
          <Input
            value={configPath}
            onChange={(e) => setConfigPath(e.target.value)}
            placeholder="输入配置文件路径"
            className="flex-1"
          />
          <Button
            variant="outline"
            size="default"
            className="px-3"
            onClick={async () => {
              try {
                const selected = await invoke<string>("open_file_dialog");
                if (selected) {
                  setConfigPath(selected);
                }
              } catch (error) {
                console.error("Failed to open file dialog:", error);
                toast.error('文件选择功能暂不可用，请手动输入路径');
              }
            }}
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
        </div>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑API密钥配置</DialogTitle>
            <DialogDescription>
              修改Claude API密钥的配置信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">名称 *</label>
                <Input
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="输入配置名称"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">API密钥 *</label>
                <Input
                  value={editForm.key || ""}
                  onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                  placeholder="sk-ant-api03-..."
                  type="password"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">描述</label>
                <Textarea
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="输入描述信息（可选）"
                  className="min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button size="sm" onClick={handleUpdate} disabled={!editForm.name || !editForm.key}>
                更新配置
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
});