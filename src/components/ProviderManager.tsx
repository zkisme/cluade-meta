import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Server, Key, Eye, EyeOff, Copy, ChevronDown, ChevronRight, Globe, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { Provider, PROVIDER_TEMPLATES, Transformer } from '@/types/claude-code-router';

interface ProviderManagerProps {
  providers: Provider[];
  onChange: (providers: Provider[]) => void;
}

export function ProviderManager({ providers, onChange }: ProviderManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  const handleAdd = () => {
    setEditingProvider({
      name: '',
      api_base_url: '',
      api_key: '',
      models: [],
    });
    setShowDialog(true);
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider({ ...provider });
    setShowDialog(true);
  };

  const handleDelete = (providerName: string) => {
    onChange(providers.filter(p => p.name !== providerName));
    toast.success('提供商删除成功');
  };

  const handleSave = (provider: Provider) => {
    const existingIndex = providers.findIndex(p => p.name === provider.name);
    
    if (existingIndex >= 0) {
      // 更新现有提供商
      const updatedProviders = [...providers];
      updatedProviders[existingIndex] = provider;
      onChange(updatedProviders);
    } else {
      // 添加新提供商
      onChange([...providers, provider]);
    }
    
    setShowDialog(false);
    setEditingProvider(null);
    toast.success(existingIndex >= 0 ? '提供商更新成功' : '提供商添加成功');
  };

  const toggleApiKeyVisibility = (providerName: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerName]: !prev[providerName]
    }));
  };

  const toggleProviderExpand = (providerName: string) => {
    setExpandedProviders(prev => ({
      ...prev,
      [providerName]: !prev[providerName]
    }));
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API Key 已复制到剪贴板');
  };

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return apiKey;
    return apiKey.slice(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.slice(-4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">模型提供商配置</h2>
          <p className="text-sm text-muted-foreground">
            管理不同AI模型提供商的配置信息
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          添加提供商
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
            <Server className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold mb-3">暂无提供商配置</h3>
          <p className="text-muted-foreground text-center mb-8 max-w-md">
            开始添加您的第一个AI模型提供商，如OpenRouter、DeepSeek或本地Ollama等
          </p>
          <Button onClick={handleAdd} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="h-5 w-5 mr-2" />
            添加提供商
          </Button>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">推荐的提供商类型：</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['OpenRouter', 'DeepSeek', 'Ollama', 'Gemini'].map((name) => (
                <div key={name} className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {providers.map((provider) => (
            <Card key={provider.name} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProviderExpand(provider.name)}
                      className="h-8 w-8 p-0 hover:bg-blue-100"
                    >
                      {expandedProviders[provider.name] ? 
                        <ChevronDown className="h-5 w-5 text-blue-600" /> : 
                        <ChevronRight className="h-5 w-5 text-blue-600" />
                      }
                    </Button>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                        <Server className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {provider.name}
                          <Badge variant="secondary" className="text-xs">
                            {provider.models?.length || 0} 模型
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {provider.api_base_url}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(provider)}
                      className="h-9 w-9 p-0 hover:bg-blue-100"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(provider.name)}
                      className="h-9 w-9 p-0 hover:bg-red-100 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedProviders[provider.name] && (
                <CardContent className="pt-0 space-y-6">
                  {/* API Key 显示 */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Key className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">API 密钥</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-sm font-mono bg-white px-3 py-2 rounded border text-gray-800">
                        {showApiKeys[provider.name] ? provider.api_key : maskApiKey(provider.api_key)}
                      </code>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleApiKeyVisibility(provider.name)}
                          className="h-8 w-8 p-0 bg-white hover:bg-gray-50"
                        >
                          {showApiKeys[provider.name] ? 
                            <EyeOff className="h-3 w-3" /> : 
                            <Eye className="h-3 w-3" />
                          }
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyApiKey(provider.api_key)}
                          className="h-8 w-8 p-0 bg-white hover:bg-gray-50"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 模型列表 */}
                  {provider.models && provider.models.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-green-600" />
                        <Label className="text-sm font-medium text-gray-700">可用模型</Label>
                        <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                          {provider.models.length} 个
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {provider.models.map((model) => (
                          <div key={model} className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-100">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm text-green-800 truncate">{model}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 转换器配置 */}
                  {provider.transformer && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-purple-600" />
                        <Label className="text-sm font-medium text-gray-700">转换器配置</Label>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                        <pre className="text-sm text-purple-800 whitespace-pre-wrap font-mono overflow-x-auto">
                          {JSON.stringify(provider.transformer, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <ProviderEditDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        provider={editingProvider}
        onSave={handleSave}
      />
    </div>
  );
}

interface ProviderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider | null;
  onSave: (provider: Provider) => void;
}

function ProviderEditDialog({ open, onOpenChange, provider, onSave }: ProviderEditDialogProps) {
  const [formData, setFormData] = useState<Provider>({
    name: '',
    api_base_url: '',
    api_key: '',
    models: [],
  });
  const [modelsText, setModelsText] = useState('');
  const [transformerJson, setTransformerJson] = useState('');

  React.useEffect(() => {
    if (provider) {
      setFormData(provider);
      setModelsText(provider.models?.join('\n') || '');
      setTransformerJson(provider.transformer ? JSON.stringify(provider.transformer, null, 2) : '');
    } else {
      setFormData({
        name: '',
        api_base_url: '',
        api_key: '',
        models: [],
      });
      setModelsText('');
      setTransformerJson('');
    }
  }, [provider]);

  const handleSave = () => {
    const models = modelsText
      .split('\n')
      .map(m => m.trim())
      .filter(Boolean);

    let transformer: Transformer | undefined;
    if (transformerJson.trim()) {
      try {
        transformer = JSON.parse(transformerJson);
      } catch (error) {
        toast.error('转换器配置格式错误');
        return;
      }
    }

    onSave({
      ...formData,
      models,
      transformer,
    });
  };

  const loadTemplate = (templateKey: string) => {
    const template = PROVIDER_TEMPLATES[templateKey as keyof typeof PROVIDER_TEMPLATES];
    if (template) {
      setFormData(template);
      setModelsText(template.models.join('\n'));
      setTransformerJson(template.transformer ? JSON.stringify(template.transformer, null, 2) : '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {provider ? '编辑提供商' : '添加提供商'}
          </DialogTitle>
          <DialogDescription>
            配置AI模型提供商的基本信息和连接参数
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 模板选择 */}
          <div className="space-y-2">
            <Label>快速模板</Label>
            <Select onValueChange={loadTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="选择预设模板..." />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PROVIDER_TEMPLATES).map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">提供商名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="openrouter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_base_url">API 基础URL *</Label>
              <Input
                id="api_base_url"
                value={formData.api_base_url}
                onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
                placeholder="https://api.example.com/v1/chat/completions"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">API 密钥 *</Label>
            <Input
              id="api_key"
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="models">可用模型 (每行一个)</Label>
            <Textarea
              id="models"
              value={modelsText}
              onChange={(e) => setModelsText(e.target.value)}
              placeholder="gpt-4&#10;gpt-3.5-turbo&#10;claude-3-sonnet"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transformer">转换器配置 (JSON格式)</Label>
            <Textarea
              id="transformer"
              value={transformerJson}
              onChange={(e) => setTransformerJson(e.target.value)}
              placeholder='{"use": ["openrouter"]}'
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            {provider ? '保存' : '添加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}