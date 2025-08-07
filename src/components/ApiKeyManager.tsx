import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Key, Copy, Eye, EyeOff, FolderOpen, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfigEditor } from "./ConfigEditor";

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

export function ApiKeyManager() {
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

  const handleConfigSaved = () => {
    loadApiKeys();
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
      // 生成UUID作为密钥ID
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const apiKeyId = generateUUID();
      const now = new Date().toISOString();
      
      // 创建Claude配置格式的对象
      const claudeConfig = {
        [apiKeyId]: {
          id: apiKeyId,
          name: createForm.name,
          key: createForm.key,
          description: createForm.description || "",
          api_url: createForm.api_url || "https://api.anthropic.com",
          model: createForm.model || "claude-3-5-sonnet-20241022",
          max_tokens: createForm.max_tokens || 4096,
          temperature: createForm.temperature || 0.7,
          top_p: createForm.top_p || 0.9,
          timeout: createForm.timeout || 30000,
          proxy_url: createForm.proxy_url || undefined,
          verbose: createForm.verbose || false,
          stream: createForm.stream || true,
          unsafe_html: createForm.unsafe_html || false,
          created_at: now,
          updated_at: now
        }
      };
      
      // 获取现有配置并合并
      const existingConfig = await invoke<string>("get_config_file_content");
      let mergedConfig;
      
      try {
        const parsedExisting = JSON.parse(existingConfig);
        mergedConfig = { ...parsedExisting, ...claudeConfig };
      } catch {
        // 如果现有配置无效，只使用新配置
        mergedConfig = claudeConfig;
      }
      
      // 保存合并后的配置
      await invoke<boolean>("save_config_file_content", { 
        content: JSON.stringify(mergedConfig, null, 2) 
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
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
  };

  const handleUpdate = async () => {
    if (!editingKey) return;

    try {
      // 获取现有配置
      const existingConfig = await invoke<string>("get_config_file_content");
      const parsedExisting = JSON.parse(existingConfig);
      
      // 更新特定密钥的配置
      const updatedConfig = {
        ...parsedExisting,
        [editingKey.id]: {
          ...parsedExisting[editingKey.id],
          name: editForm.name || editingKey.name,
          key: editForm.key || editingKey.key,
          description: editForm.description !== undefined ? editForm.description : editingKey.description,
          api_url: editForm.api_url || (parsedExisting[editingKey.id]?.api_url || "https://api.anthropic.com"),
          model: editForm.model || (parsedExisting[editingKey.id]?.model || "claude-3-5-sonnet-20241022"),
          max_tokens: editForm.max_tokens || (parsedExisting[editingKey.id]?.max_tokens || 4096),
          temperature: editForm.temperature || (parsedExisting[editingKey.id]?.temperature || 0.7),
          top_p: editForm.top_p || (parsedExisting[editingKey.id]?.top_p || 0.9),
          timeout: editForm.timeout || (parsedExisting[editingKey.id]?.timeout || 30000),
          proxy_url: editForm.proxy_url !== undefined ? editForm.proxy_url : parsedExisting[editingKey.id]?.proxy_url,
          verbose: editForm.verbose !== undefined ? editForm.verbose : (parsedExisting[editingKey.id]?.verbose || false),
          stream: editForm.stream !== undefined ? editForm.stream : (parsedExisting[editingKey.id]?.stream || true),
          unsafe_html: editForm.unsafe_html !== undefined ? editForm.unsafe_html : (parsedExisting[editingKey.id]?.unsafe_html || false),
          updated_at: new Date().toISOString()
        }
      };
      
      // 保存更新后的配置
      await invoke<boolean>("save_config_file_content", { 
        content: JSON.stringify(updatedConfig, null, 2) 
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
    } catch (error) {
      console.error("Failed to update API key:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个API密钥吗？")) return;

    try {
      // 获取现有配置
      const existingConfig = await invoke<string>("get_config_file_content");
      const parsedExisting = JSON.parse(existingConfig);
      
      // 删除指定密钥
      const { [id]: _, ...remainingConfig } = parsedExisting;
      
      // 保存更新后的配置
      await invoke<boolean>("save_config_file_content", { 
        content: JSON.stringify(remainingConfig, null, 2) 
      });
      
      loadApiKeys();
    } catch (error) {
      console.error("Failed to delete API key:", error);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleViewConfig}>
            <FileText className="mr-2 h-4 w-4" />
            查看
          </Button>
          <Button variant="outline" size="sm" onClick={handleBackup}>
            <Download className="mr-2 h-4 w-4" />
            备份
          </Button>
          <ConfigEditor onConfigSaved={handleConfigSaved} />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                添加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>添加新的API密钥配置</DialogTitle>
                <DialogDescription>
                  创建一个新的Claude API密钥配置，包含完整的API参数设置
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">基本信息</h4>
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
                    <label className="text-sm font-medium block mb-2">描述</label>
                    <Textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder="输入描述信息（可选）"
                      className="min-h-[60px]"
                    />
                  </div>
                </div>

                {/* API配置 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">API配置</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">模型</label>
                      <Input
                        value={createForm.model}
                        onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
                        placeholder="claude-3-5-sonnet-20241022"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">最大令牌数</label>
                      <Input
                        type="number"
                        value={createForm.max_tokens}
                        onChange={(e) => setCreateForm({ ...createForm, max_tokens: parseInt(e.target.value) || 4096 })}
                        placeholder="4096"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">温度</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={createForm.temperature}
                        onChange={(e) => setCreateForm({ ...createForm, temperature: parseFloat(e.target.value) || 0.7 })}
                        placeholder="0.7"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">Top P</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={createForm.top_p}
                        onChange={(e) => setCreateForm({ ...createForm, top_p: parseFloat(e.target.value) || 0.9 })}
                        placeholder="0.9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">超时时间 (ms)</label>
                      <Input
                        type="number"
                        value={createForm.timeout}
                        onChange={(e) => setCreateForm({ ...createForm, timeout: parseInt(e.target.value) || 30000 })}
                        placeholder="30000"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">代理URL</label>
                      <Input
                        value={createForm.proxy_url}
                        onChange={(e) => setCreateForm({ ...createForm, proxy_url: e.target.value })}
                        placeholder="http://proxy:port"
                      />
                    </div>
                  </div>
                </div>

                {/* 高级选项 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">高级选项</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="verbose"
                        checked={createForm.verbose}
                        onChange={(e) => setCreateForm({ ...createForm, verbose: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="verbose" className="text-sm">详细日志</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="stream"
                        checked={createForm.stream}
                        onChange={(e) => setCreateForm({ ...createForm, stream: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="stream" className="text-sm">流式输出</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="unsafe_html"
                        checked={createForm.unsafe_html}
                        onChange={(e) => setCreateForm({ ...createForm, unsafe_html: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="unsafe_html" className="text-sm">允许HTML</label>
                    </div>
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
            size="sm"
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

      <Card>
        <CardHeader>
          <CardTitle>API密钥列表</CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">暂无API密钥</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击上方"添加"按钮创建您的第一个API密钥
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">名称</TableHead>
                    <TableHead className="whitespace-nowrap">API密钥</TableHead>
                    <TableHead className="whitespace-nowrap">模型</TableHead>
                    <TableHead className="whitespace-nowrap">描述</TableHead>
                    <TableHead className="whitespace-nowrap">创建时间</TableHead>
                    <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium whitespace-nowrap">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 min-w-0">
                          <code className="text-sm bg-muted px-2 py-1 rounded truncate max-w-[150px]">
                            {showKeys[key.id] ? key.key : maskKey(key.key)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleShowKey(key.id)}
                          >
                            {showKeys[key.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(key.key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {(key as any).model || "claude-3-5-sonnet"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={key.description || ""}>
                        {key.description || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(key.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(key)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑API密钥配置</DialogTitle>
            <DialogDescription>
              修改Claude API密钥的配置信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">基本信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">API URL</label>
                <Input
                  value={editForm.api_url || ""}
                  onChange={(e) => setEditForm({ ...editForm, api_url: e.target.value })}
                  placeholder="https://api.anthropic.com"
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

            {/* API配置 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">API配置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-2">模型</label>
                  <Input
                    value={editForm.model || ""}
                    onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                    placeholder="claude-3-5-sonnet-20241022"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-2">最大令牌数</label>
                  <Input
                    type="number"
                    value={editForm.max_tokens || ""}
                    onChange={(e) => setEditForm({ ...editForm, max_tokens: parseInt(e.target.value) || 4096 })}
                    placeholder="4096"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">温度</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editForm.temperature || ""}
                    onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) || 0.7 })}
                    placeholder="0.7"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Top P</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editForm.top_p || ""}
                    onChange={(e) => setEditForm({ ...editForm, top_p: parseFloat(e.target.value) || 0.9 })}
                    placeholder="0.9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-2">超时时间 (ms)</label>
                  <Input
                    type="number"
                    value={editForm.timeout || ""}
                    onChange={(e) => setEditForm({ ...editForm, timeout: parseInt(e.target.value) || 30000 })}
                    placeholder="30000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">代理URL</label>
                  <Input
                    value={editForm.proxy_url || ""}
                    onChange={(e) => setEditForm({ ...editForm, proxy_url: e.target.value })}
                    placeholder="http://proxy:port"
                  />
                </div>
              </div>
            </div>

            {/* 高级选项 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">高级选项</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-verbose"
                    checked={editForm.verbose || false}
                    onChange={(e) => setEditForm({ ...editForm, verbose: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="edit-verbose" className="text-sm">详细日志</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-stream"
                    checked={editForm.stream || false}
                    onChange={(e) => setEditForm({ ...editForm, stream: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="edit-stream" className="text-sm">流式输出</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-unsafe_html"
                    checked={editForm.unsafe_html || false}
                    onChange={(e) => setEditForm({ ...editForm, unsafe_html: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="edit-unsafe_html" className="text-sm">允许HTML</label>
                </div>
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
    </div>
  );
}