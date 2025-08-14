import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Download, 
  Upload, 
  FileText, 
  Copy, 
  Check, 
  AlertTriangle,
  Info,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

import { ClaudeCodeRouterConfig, PROVIDER_TEMPLATES } from '@/types/claude-code-router';

interface ConfigImportExportProps {
  config: ClaudeCodeRouterConfig;
  onImport: (config: ClaudeCodeRouterConfig) => void;
}

export function ConfigImportExport({ config, onImport }: ConfigImportExportProps) {
  const [importText, setImportText] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // 导出配置
  const exportConfig = () => {
    const exportData = {
      ...config,
      // 隐藏敏感信息
      APIKEY: config.APIKEY ? '***HIDDEN***' : undefined,
      Providers: config.Providers?.map(provider => ({
        ...provider,
        api_key: '***HIDDEN***'
      }))
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    
    // 复制到剪贴板
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true);
      toast.success('配置已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    });

    // 下载文件
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-code-router-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入配置
  const handleImport = () => {
    try {
      const importedConfig = JSON.parse(importText);
      
      // 基本验证
      if (!importedConfig.Providers || !Array.isArray(importedConfig.Providers)) {
        toast.error('导入失败: 配置格式不正确，缺少Providers数组');
        return;
      }

      if (!importedConfig.Router || typeof importedConfig.Router !== 'object') {
        toast.error('导入失败: 配置格式不正确，缺少Router对象');
        return;
      }

      onImport(importedConfig);
      setShowImportDialog(false);
      setImportText('');
      toast.success('配置导入成功');
    } catch (error) {
      toast.error('导入失败: JSON格式错误');
    }
  };

  // 加载示例配置
  const loadExample = () => {
    const exampleConfig: ClaudeCodeRouterConfig = {
      APIKEY: 'your-secret-key',
      PROXY_URL: 'http://127.0.0.1:7890',
      LOG: true,
      API_TIMEOUT_MS: 600000,
      NON_INTERACTIVE_MODE: false,
      Providers: [
        PROVIDER_TEMPLATES.openrouter,
        PROVIDER_TEMPLATES.deepseek,
        PROVIDER_TEMPLATES.ollama
      ],
      Router: {
        default: 'deepseek,deepseek-chat',
        background: 'ollama,qwen2.5-coder:latest',
        think: 'deepseek,deepseek-reasoner',
        longContext: 'openrouter,google/gemini-2.5-pro-preview',
        longContextThreshold: 60000,
        webSearch: 'openrouter,google/gemini-2.5-flash:online'
      }
    };

    setImportText(JSON.stringify(exampleConfig, null, 2));
  };

  // 快速配置模板
  const quickTemplates = [
    {
      name: '基础配置',
      description: '包含OpenRouter和DeepSeek的简单配置',
      config: {
        Providers: [
          { ...PROVIDER_TEMPLATES.openrouter, api_key: 'your-openrouter-key' },
          { ...PROVIDER_TEMPLATES.deepseek, api_key: 'your-deepseek-key' }
        ],
        Router: {
          default: 'deepseek,deepseek-chat',
          think: 'openrouter,anthropic/claude-3.5-sonnet'
        }
      }
    },
    {
      name: '本地开发',
      description: '包含Ollama本地模型的开发配置',
      config: {
        LOG: true,
        Providers: [
          PROVIDER_TEMPLATES.ollama
        ],
        Router: {
          default: 'ollama,qwen2.5-coder:latest',
          background: 'ollama,qwen2.5-coder:latest'
        }
      }
    },
    {
      name: '完整配置',
      description: '包含多个提供商的完整功能配置',
      config: {
        PROXY_URL: 'http://127.0.0.1:7890',
        LOG: true,
        API_TIMEOUT_MS: 600000,
        Providers: [
          { ...PROVIDER_TEMPLATES.openrouter, api_key: 'your-key' },
          { ...PROVIDER_TEMPLATES.deepseek, api_key: 'your-key' },
          { ...PROVIDER_TEMPLATES.gemini, api_key: 'your-key' },
          PROVIDER_TEMPLATES.ollama
        ],
        Router: {
          default: 'deepseek,deepseek-chat',
          background: 'ollama,qwen2.5-coder:latest',
          think: 'deepseek,deepseek-reasoner',
          longContext: 'openrouter,google/gemini-2.5-pro-preview',
          webSearch: 'gemini,gemini-2.5-flash'
        }
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">配置导入导出</h2>
        <p className="text-sm text-muted-foreground">
          备份、分享或恢复Claude Code Router配置
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 导出配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              导出配置
            </CardTitle>
            <CardDescription>
              将当前配置导出为JSON文件或复制到剪贴板
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Settings className="h-4 w-4" />
                <span>提供商数量: {config.Providers?.length || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Settings className="h-4 w-4" />
                <span>路由规则: {Object.keys(config.Router || {}).length}</span>
              </div>
            </div>

            <Button onClick={exportConfig} className="w-full">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  导出配置
                </>
              )}
            </Button>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">安全提醒</p>
                  <p className="text-amber-700">
                    导出的配置已隐藏API密钥等敏感信息
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 导入配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              导入配置
            </CardTitle>
            <CardDescription>
              从JSON文件或文本导入配置
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  导入配置
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>导入配置</DialogTitle>
                  <DialogDescription>
                    粘贴JSON配置内容，或使用快速模板
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>配置内容</Label>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadExample}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        加载示例
                      </Button>
                    </div>
                    <Textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="粘贴JSON配置..."
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleImport} disabled={!importText.trim()}>
                    导入
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* 快速配置模板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            快速配置模板
          </CardTitle>
          <CardDescription>
            选择预设模板快速开始配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {quickTemplates.map((template, index) => (
              <Card key={index} className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {template.config.Providers?.length || 0} 提供商
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {Object.keys(template.config.Router || {}).length} 路由
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onImport(template.config as ClaudeCodeRouterConfig)}
                  >
                    使用此模板
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            使用说明
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm">导出配置:</h4>
              <p className="text-xs text-muted-foreground">
                • 自动隐藏API密钥等敏感信息<br/>
                • 同时复制到剪贴板并下载文件<br/>
                • 文件名包含日期便于管理
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">导入配置:</h4>
              <p className="text-xs text-muted-foreground">
                • 支持完整JSON格式的配置文件<br/>
                • 自动验证配置格式的正确性<br/>
                • 导入后需要重新设置API密钥
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">快速模板:</h4>
              <p className="text-xs text-muted-foreground">
                • 提供常用场景的预设配置<br/>
                • 可以基于模板进行定制修改<br/>
                • 适合快速开始使用
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}