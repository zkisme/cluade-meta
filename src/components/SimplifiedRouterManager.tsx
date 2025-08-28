import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  ChevronDown,
  ChevronRight,
  Server,
  Route,
  Settings,
  Globe,
  Eye,
  EyeOff,
  Copy,
  Check,
  Info,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';

import { 
  ClaudeCodeRouterConfig, 
  Provider, 
  RouterConfig,
  PROVIDER_TEMPLATES
} from '@/types/claude-code-router';

export function SimplifiedRouterManager() {
  console.log('SimplifiedRouterManager 组件开始渲染');
  
  const [config, setConfig] = useState<ClaudeCodeRouterConfig>({
    Providers: [],
    Router: {
      default: '',
      longContextThreshold: 60000,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    providers: true,
    router: false,
    global: false,
  });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string>('');
  
  // 弹框相关状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProviderIndex, setEditingProviderIndex] = useState<number>(-1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formData, setFormData] = useState<Provider>({
    name: '',
    api_base_url: '',
    api_key: '',
    models: [],
  });

  // 加载配置
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      console.log('开始加载路由配置...');
      const result = await invoke<ClaudeCodeRouterConfig>('get_router_config');
      console.log('路由配置加载结果:', result);
      setConfig(result || {
        Providers: [],
        Router: {
          default: '',
          longContextThreshold: 60000,
        },
      });
      console.log('路由配置设置完成');
    } catch (error) {
      console.error('加载配置失败:', error);
      toast.error('加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async () => {
    try {
      console.log('=== SimplifiedRouterManager saveConfig called ===');
      console.log('Current config:', config);
      console.log('Providers count:', config.Providers?.length || 0);
      await invoke('update_router_config', { config });
      toast.success('配置保存成功');
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error('保存配置失败');
    }
  };

  // 重置配置
  const resetConfig = async () => {
    try {
      await loadConfig();
      toast.success('配置已重置');
    } catch (error) {
      toast.error('重置配置失败');
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // 切换区域展开状态
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // 打开添加提供商弹框
  const openAddDialog = () => {
    setSelectedTemplate('none');
    setFormData({
      name: '',
      api_base_url: '',
      api_key: '',
      models: [],
    });
    setIsAddDialogOpen(true);
  };

  // 选择模板
  const selectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templateName && templateName !== 'none' && PROVIDER_TEMPLATES[templateName as keyof typeof PROVIDER_TEMPLATES]) {
      const template = PROVIDER_TEMPLATES[templateName as keyof typeof PROVIDER_TEMPLATES];
      setFormData({ ...template });
    } else {
      setFormData({
        name: '',
        api_base_url: '',
        api_key: '',
        models: [],
      });
    }
  };

  // 确认添加提供商
  const confirmAddProvider = () => {
    if (!formData.name.trim()) {
      toast.error('提供商名称不能为空');
      return;
    }
    if (!formData.api_base_url.trim()) {
      toast.error('API基础URL不能为空');
      return;
    }
    
    // 过滤空行和空白模型，只在提交时进行
    const filteredModels = (formData.models || []).filter(m => m.trim());
    
    console.log('=== Adding provider ===');
    console.log('Form data:', formData);
    console.log('Filtered models:', filteredModels);
    console.log('Current providers count before adding:', config.Providers?.length || 0);
    
    setConfig(prev => {
      const newConfig = {
        ...prev,
        Providers: [...(prev.Providers || []), { ...formData, models: filteredModels }]
      };
      console.log('New config after adding provider:', newConfig);
      console.log('New providers count:', newConfig.Providers?.length || 0);
      return newConfig;
    });
    
    setIsAddDialogOpen(false);
    toast.success('提供商添加成功');
  };

  // 打开编辑提供商弹框
  const openEditDialog = (index: number) => {
    const provider = config.Providers[index];
    setEditingProviderIndex(index);
    setFormData({ ...provider });
    
    // 尝试匹配当前配置到预设模板
    const matchedTemplate = Object.keys(PROVIDER_TEMPLATES).find(templateName => {
      const template = PROVIDER_TEMPLATES[templateName as keyof typeof PROVIDER_TEMPLATES];
      return template.name === provider.name && template.api_base_url === provider.api_base_url;
    });
    setSelectedTemplate(matchedTemplate || 'none');
    
    setIsEditDialogOpen(true);
  };

  // 确认编辑提供商
  const confirmEditProvider = () => {
    if (!formData.name.trim()) {
      toast.error('提供商名称不能为空');
      return;
    }
    if (!formData.api_base_url.trim()) {
      toast.error('API基础URL不能为空');
      return;
    }

    // 过滤空行和空白模型，只在提交时进行
    const filteredModels = (formData.models || []).filter(m => m.trim());

    setConfig(prev => ({
      ...prev,
      Providers: prev.Providers.map((provider, i) => 
        i === editingProviderIndex ? { ...formData, models: filteredModels } : provider
      )
    }));

    setIsEditDialogOpen(false);
    setEditingProviderIndex(-1);
    toast.success('提供商更新成功');
  };

  // 删除提供商
  const removeProvider = (index: number) => {
    setConfig(prev => ({
      ...prev,
      Providers: prev.Providers.filter((_, i) => i !== index)
    }));
    toast.success('提供商已删除');
  };

  // 更新路由配置
  const updateRouter = (updates: Partial<RouterConfig>) => {
    // 将 "none" 值转换为空字符串或 undefined
    const processedUpdates: Partial<RouterConfig> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'none') {
        processedUpdates[key as keyof RouterConfig] = undefined as any;
      } else {
        processedUpdates[key as keyof RouterConfig] = value as any;
      }
    });
    
    setConfig(prev => ({
      ...prev,
      Router: { ...prev.Router, ...processedUpdates }
    }));
  };

  // 更新全局配置
  const updateGlobalConfig = (key: keyof ClaudeCodeRouterConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 切换API密钥显示
  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  // 复制API密钥
  const copyApiKey = async (key: string, providerId: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(providerId);
      toast.success('API密钥已复制到剪贴板');
      setTimeout(() => setCopiedKey(''), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 获取提供商-模型选项
  const getProviderModelOptions = () => {
    if (!config.Providers || config.Providers.length === 0) {
      return [];
    }
    
    return config.Providers.flatMap(provider => {
      if (!provider.models || provider.models.length === 0 || !provider.name) {
        return [];
      }
      return provider.models
        .filter(model => model && model.trim()) // 过滤空模型
        .map(model => ({
          value: `${provider.name},${model}`,
          label: `${provider.name} - ${model}`
        }));
    });
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

  // 添加错误边界处理
  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">配置加载失败</p>
          <Button onClick={loadConfig}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Server className="h-3 w-3" />
            {(config.Providers || []).length} 个提供商
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Globe className="h-3 w-3" />
            {(config.Providers || []).reduce((total, p) => total + ((p.models || []).length), 0)} 个模型
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetConfig}>
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </Button>
          <Button onClick={saveConfig} size="sm">
            <Save className="h-4 w-4 mr-2" />
            保存配置
          </Button>
        </div>
      </div>

      {/* 提供商配置 */}
      <Card>
        <Collapsible open={expandedSections.providers} onOpenChange={() => toggleSection('providers')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  模型提供商 ({config.Providers.length})
                </div>
                {expandedSections.providers ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* 添加按钮 */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  已配置 {(config.Providers || []).length} 个提供商
                </p>
                <Button onClick={openAddDialog} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  添加提供商
                </Button>
                
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>添加模型提供商</DialogTitle>
                      <DialogDescription>
                        选择预设模板或自定义配置新的模型提供商
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* 模板选择 */}
                      <div className="space-y-2">
                        <Label>选择预设模板</Label>
                        <Select value={selectedTemplate} onValueChange={selectTemplate}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择一个预设模板或自定义配置" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">自定义配置</SelectItem>
                            {Object.keys(PROVIDER_TEMPLATES).map(template => (
                              <SelectItem key={template} value={template}>
                                {template}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          选择预设模板会自动填充对应的配置信息
                        </p>
                      </div>
                      
                      <Separator />
                      
                      {/* 表单内容 */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="add-name">名称 *</Label>
                            <Input
                              id="add-name"
                              value={formData.name || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="例如: openrouter"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="add-url">API基础URL *</Label>
                            <Input
                              id="add-url"
                              value={formData.api_base_url || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, api_base_url: e.target.value }))}
                              placeholder="https://api.example.com/v1/chat/completions"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="add-key">API密钥</Label>
                          <Input
                            id="add-key"
                            type="password"
                            value={formData.api_key || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                            placeholder="sk-..."
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="add-models">
                            模型列表 <span className="text-xs text-muted-foreground">(每行一个)</span>
                          </Label>
                          <Textarea
                            id="add-models"
                            value={(formData.models || []).join('\n')}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              models: e.target.value.split('\n') // 保持原始格式，不过滤空行
                            }))}
                            onKeyDown={(e) => {
                              // 阻止回车键触发表单提交，让浏览器默认换行行为生效
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                // 让浏览器处理默认的回车换行行为
                              }
                            }}
                            placeholder="deepseek-chat&#10;deepseek-reasoner"
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={confirmAddProvider}>
                        添加提供商
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Separator />
              
              {/* 提供商列表 */}
              <div className="space-y-2">
                {(config.Providers || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>还没有配置任何提供商</p>
                    <p className="text-sm">点击上方按钮添加一个模型提供商</p>
                  </div>
                ) : (
                  (config.Providers || []).map((provider, index) => (
                    <Card key={`provider-${index}`} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {provider.name || '未命名提供商'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {(provider.models || []).length} 个模型
                                </Badge>
                                <span className="text-xs text-muted-foreground truncate">
                                  {provider.api_base_url}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProvider(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* 编辑提供商弹框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑模型提供商</DialogTitle>
            <DialogDescription>
              修改提供商的配置信息或切换到其他预设模板
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 模板选择 */}
            <div className="space-y-2">
              <Label>选择预设模板</Label>
              <Select value={selectedTemplate} onValueChange={selectTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="选择一个预设模板或自定义配置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">自定义配置</SelectItem>
                  {Object.keys(PROVIDER_TEMPLATES).map(template => (
                    <SelectItem key={template} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                选择预设模板会自动填充对应的配置信息
              </p>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如: openrouter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-url">API基础URL *</Label>
                <Input
                  id="edit-url"
                  value={formData.api_base_url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, api_base_url: e.target.value }))}
                  placeholder="https://api.example.com/v1/chat/completions"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-key">API密钥</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-key"
                  type={showApiKeys['edit-form'] ? 'text' : 'password'}
                  value={formData.api_key || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder="sk-..."
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleApiKeyVisibility('edit-form')}
                >
                  {showApiKeys['edit-form'] ? 
                    <EyeOff className="h-4 w-4" /> : 
                    <Eye className="h-4 w-4" />
                  }
                </Button>
                {(formData.api_key || '').trim() && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyApiKey(formData.api_key || '', 'edit-form')}
                  >
                    {copiedKey === 'edit-form' ? 
                      <Check className="h-4 w-4" /> : 
                      <Copy className="h-4 w-4" />
                    }
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-models">
                模型列表 <span className="text-xs text-muted-foreground">(每行一个)</span>
              </Label>
              <Textarea
                id="edit-models"
                value={(formData.models || []).join('\n')}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  models: e.target.value.split('\n') // 保持原始格式，不过滤空行
                }))}
                onKeyDown={(e) => {
                  // 阻止回车键触发表单提交，让浏览器默认换行行为生效
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    // 让浏览器处理默认的回车换行行为
                  }
                }}
                placeholder="deepseek-chat&#10;deepseek-reasoner"
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmEditProvider}>
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 路由规则配置 */}
      <Card>
        <Collapsible open={expandedSections.router} onOpenChange={() => toggleSection('router')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  路由规则
                </div>
                {expandedSections.router ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-route">默认模型 *</Label>
                  <Select 
                    value={config.Router.default || 'none'} 
                    onValueChange={(value) => updateRouter({ default: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择默认模型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不使用（不推荐）</SelectItem>
                      {getProviderModelOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="background-route">后台模型</Label>
                  <Select 
                    value={config.Router.background || 'none'} 
                    onValueChange={(value) => updateRouter({ background: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择后台模型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不使用</SelectItem>
                      {getProviderModelOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="think-route">思考模型</Label>
                  <Select 
                    value={config.Router.think || 'none'} 
                    onValueChange={(value) => updateRouter({ think: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择思考模型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不使用</SelectItem>
                      {getProviderModelOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="long-context-route">长上下文模型</Label>
                  <Select 
                    value={config.Router.longContext || 'none'} 
                    onValueChange={(value) => updateRouter({ longContext: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择长上下文模型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不使用</SelectItem>
                      {getProviderModelOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="web-search-route">网络搜索模型</Label>
                  <Select 
                    value={config.Router.webSearch || 'none'} 
                    onValueChange={(value) => updateRouter({ webSearch: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择网络搜索模型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不使用</SelectItem>
                      {getProviderModelOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="long-context-threshold">长上下文阈值</Label>
                  <Input
                    id="long-context-threshold"
                    type="number"
                    value={config.Router.longContextThreshold || 60000}
                    onChange={(e) => updateRouter({ longContextThreshold: parseInt(e.target.value) })}
                    placeholder="60000"
                  />
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-900">路由规则说明：</p>
                    <ul className="mt-1 space-y-1 text-blue-800">
                      <li>• <strong>默认模型</strong>: 用于常规任务的主要模型</li>
                      <li>• <strong>后台模型</strong>: 用于后台任务，通常选择成本较低的模型</li>
                      <li>• <strong>思考模型</strong>: 用于推理密集型任务，如规划模式</li>
                      <li>• <strong>长上下文模型</strong>: 当输入超过阈值时自动切换</li>
                      <li>• <strong>网络搜索模型</strong>: 支持网络搜索功能的模型</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* 全局设置 */}
      <Card>
        <Collapsible open={expandedSections.global} onOpenChange={() => toggleSection('global')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  全局设置
                </div>
                {expandedSections.global ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proxy-url">代理地址</Label>
                  <Input
                    id="proxy-url"
                    value={config.PROXY_URL || ''}
                    onChange={(e) => updateGlobalConfig('PROXY_URL', e.target.value || undefined)}
                    placeholder="http://127.0.0.1:7890"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="host">主机地址</Label>
                  <Input
                    id="host"
                    value={config.HOST || ''}
                    onChange={(e) => updateGlobalConfig('HOST', e.target.value || undefined)}
                    placeholder="127.0.0.1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeout">API超时时间 (毫秒)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={config.API_TIMEOUT_MS || ''}
                    onChange={(e) => updateGlobalConfig('API_TIMEOUT_MS', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="600000"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="logging"
                      checked={config.LOG !== false}
                      onCheckedChange={(checked) => updateGlobalConfig('LOG', checked)}
                    />
                    <Label htmlFor="logging">启用日志记录</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="non-interactive"
                      checked={config.NON_INTERACTIVE_MODE === true}
                      onCheckedChange={(checked) => updateGlobalConfig('NON_INTERACTIVE_MODE', checked)}
                    />
                    <Label htmlFor="non-interactive">非交互式模式</Label>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="custom-router">自定义路由器脚本路径</Label>
                <Input
                  id="custom-router"
                  value={config.CUSTOM_ROUTER_PATH || ''}
                  onChange={(e) => updateGlobalConfig('CUSTOM_ROUTER_PATH', e.target.value || undefined)}
                  placeholder="/path/to/custom-router.js"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  留空使用默认路由逻辑
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}