import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Route, Settings, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

import { RouterConfig, Provider } from '@/types/claude-code-router';

interface RouterRulesManagerProps {
  router: RouterConfig;
  providers: Provider[];
  onChange: (router: RouterConfig) => void;
}

export function RouterRulesManager({ router, providers, onChange }: RouterRulesManagerProps) {
  const [formData, setFormData] = useState<RouterConfig>(router);

  // 获取所有可用的模型选项 (格式: provider,model)
  const getModelOptions = () => {
    const options: Array<{ value: string; label: string; provider: string }> = [];
    providers.forEach(provider => {
      provider.models?.forEach(model => {
        options.push({
          value: `${provider.name},${model}`,
          label: `${provider.name} - ${model}`,
          provider: provider.name
        });
      });
    });
    return options;
  };

  const modelOptions = getModelOptions();

  const handleSave = () => {
    onChange(formData);
    toast.success('路由规则保存成功');
  };

  const handleReset = () => {
    setFormData(router);
    toast.info('已重置为上次保存的配置');
  };

  const routeTypes = [
    {
      key: 'default' as keyof RouterConfig,
      title: '默认路由',
      description: '未匹配其他规则时使用的默认模型',
      icon: Route,
      required: true
    },
    {
      key: 'background' as keyof RouterConfig,
      title: '后台任务',
      description: '用于后台任务的轻量级模型，可节省成本',
      icon: Settings,
      required: false
    },
    {
      key: 'think' as keyof RouterConfig,
      title: '推理任务',
      description: '用于复杂推理和计划模式的强大模型',
      icon: AlertCircle,
      required: false
    },
    {
      key: 'longContext' as keyof RouterConfig,
      title: '长上下文',
      description: '处理长上下文内容的专用模型',
      icon: Info,
      required: false
    },
    {
      key: 'webSearch' as keyof RouterConfig,
      title: '网络搜索',
      description: '支持网络搜索功能的模型',
      icon: Info,
      required: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">路由规则配置</h2>
          <p className="text-sm text-muted-foreground">
            为不同场景配置合适的模型路由规则
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <Button onClick={handleSave}>
            保存配置
          </Button>
        </div>
      </div>

      {providers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Route className="h-8 w-8 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">请先配置提供商</h3>
            <p className="text-muted-foreground text-center">
              需要先添加模型提供商才能配置路由规则
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 路由规则配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                场景路由配置
              </CardTitle>
              <CardDescription>
                为不同使用场景选择合适的模型
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {routeTypes.map((routeType) => {
                const IconComponent = routeType.icon;
                const currentValue = formData[routeType.key] as string || '';
                
                return (
                  <div key={routeType.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      <Label className="font-medium">{routeType.title}</Label>
                      {routeType.required && (
                        <Badge variant="secondary" className="text-xs">必需</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {routeType.description}
                    </p>
                    <Select
                      value={currentValue}
                      onValueChange={(value) => 
                        setFormData({ ...formData, [routeType.key]: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择模型..." />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {option.provider}
                              </Badge>
                              <span className="text-sm">{option.label.split(' - ')[1]}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 高级配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                高级配置
              </CardTitle>
              <CardDescription>
                路由行为的详细参数配置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="longContextThreshold">长上下文阈值 (Token数)</Label>
                <Input
                  id="longContextThreshold"
                  type="number"
                  value={formData.longContextThreshold || 60000}
                  onChange={(e) => 
                    setFormData({ 
                      ...formData, 
                      longContextThreshold: parseInt(e.target.value) || 60000 
                    })
                  }
                  placeholder="60000"
                />
                <p className="text-xs text-muted-foreground">
                  当上下文超过此阈值时，自动使用长上下文模型
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 当前配置预览 */}
          <Card>
            <CardHeader>
              <CardTitle>配置预览</CardTitle>
              <CardDescription>
                当前路由规则的JSON格式预览
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg">
                <pre className="text-sm overflow-x-auto">
                  <code>{JSON.stringify(formData, null, 2)}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p><strong>动态切换模型:</strong></p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  /model provider_name,model_name
                </code>
                <p className="text-xs text-muted-foreground">
                  例如: /model openrouter,anthropic/claude-3.5-sonnet
                </p>
              </div>
              
              <Separator />
              
              <div className="text-sm space-y-2">
                <p><strong>子代理路由:</strong></p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  &lt;CCR-SUBAGENT-MODEL&gt;provider,model&lt;/CCR-SUBAGENT-MODEL&gt;
                </code>
                <p className="text-xs text-muted-foreground">
                  在子代理提示词开头指定特定模型
                </p>
              </div>
              
              <Separator />
              
              <div className="text-sm space-y-2">
                <p><strong>网络搜索模型:</strong></p>
                <p className="text-xs text-muted-foreground">
                  OpenRouter模型需要在后面添加 :online 后缀以启用网络搜索
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}