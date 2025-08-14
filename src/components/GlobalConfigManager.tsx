import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Settings, Shield, Globe, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { ClaudeCodeRouterConfig, CustomTransformer } from '@/types/claude-code-router';

interface GlobalConfigManagerProps {
  config: ClaudeCodeRouterConfig;
  onChange: (config: ClaudeCodeRouterConfig) => void;
}

export function GlobalConfigManager({ config, onChange }: GlobalConfigManagerProps) {
  const [formData, setFormData] = useState<ClaudeCodeRouterConfig>(config);
  const [transformersJson, setTransformersJson] = useState(() => 
    JSON.stringify(config.transformers || [], null, 2)
  );

  const handleSave = () => {
    let transformers: CustomTransformer[] | undefined;
    if (transformersJson.trim()) {
      try {
        transformers = JSON.parse(transformersJson);
        if (!Array.isArray(transformers)) {
          toast.error('自定义转换器必须是数组格式');
          return;
        }
      } catch (error) {
        toast.error('自定义转换器配置格式错误');
        return;
      }
    }

    const updatedConfig = {
      ...formData,
      transformers,
    };

    onChange(updatedConfig);
    toast.success('全局配置保存成功');
  };

  const handleReset = () => {
    setFormData(config);
    setTransformersJson(JSON.stringify(config.transformers || [], null, 2));
    toast.info('已重置为上次保存的配置');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">全局配置</h2>
          <p className="text-sm text-muted-foreground">
            Claude Code Router 的全局参数和高级设置
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

      <div className="space-y-4">
        {/* 安全设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              安全与认证
            </CardTitle>
            <CardDescription>
              API认证和访问控制配置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apikey">API密钥</Label>
              <Input
                id="apikey"
                type="password"
                value={formData.APIKEY || ''}
                onChange={(e) => setFormData({ ...formData, APIKEY: e.target.value })}
                placeholder="your-secret-key"
              />
              <p className="text-xs text-muted-foreground">
                设置后，客户端请求必须在Authorization或x-api-key头中提供此密钥
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="host">监听主机地址</Label>
              <Input
                id="host"
                value={formData.HOST || ''}
                onChange={(e) => setFormData({ ...formData, HOST: e.target.value })}
                placeholder="127.0.0.1"
              />
              <p className="text-xs text-muted-foreground">
                如果未设置API密钥，出于安全考虑将强制设置为127.0.0.1
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 网络设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              网络配置
            </CardTitle>
            <CardDescription>
              代理和网络连接相关设置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proxy">代理URL</Label>
              <Input
                id="proxy"
                value={formData.PROXY_URL || ''}
                onChange={(e) => setFormData({ ...formData, PROXY_URL: e.target.value })}
                placeholder="http://127.0.0.1:7890"
              />
              <p className="text-xs text-muted-foreground">
                为API请求设置HTTP代理，例如: http://127.0.0.1:7890
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">API超时时间 (毫秒)</Label>
              <Input
                id="timeout"
                type="number"
                value={formData.API_TIMEOUT_MS || 600000}
                onChange={(e) => setFormData({ ...formData, API_TIMEOUT_MS: parseInt(e.target.value) || 600000 })}
                placeholder="600000"
              />
              <p className="text-xs text-muted-foreground">
                API请求的超时时间，默认为600000毫秒(10分钟)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 系统设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              系统设置
            </CardTitle>
            <CardDescription>
              日志、调试和运行模式配置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="log">启用日志记录</Label>
                <p className="text-xs text-muted-foreground">
                  日志文件将保存在 ~/.claude-code-router.log
                </p>
              </div>
              <Switch
                id="log"
                checked={formData.LOG || false}
                onCheckedChange={(checked) => setFormData({ ...formData, LOG: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="non-interactive">非交互式模式</Label>
                <p className="text-xs text-muted-foreground">
                  兼容GitHub Actions、Docker等自动化环境
                </p>
              </div>
              <Switch
                id="non-interactive"
                checked={formData.NON_INTERACTIVE_MODE || false}
                onCheckedChange={(checked) => setFormData({ ...formData, NON_INTERACTIVE_MODE: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 高级路由设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              高级路由
            </CardTitle>
            <CardDescription>
              自定义路由逻辑和转换器配置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-router">自定义路由器脚本路径</Label>
              <Input
                id="custom-router"
                value={formData.CUSTOM_ROUTER_PATH || ''}
                onChange={(e) => setFormData({ ...formData, CUSTOM_ROUTER_PATH: e.target.value })}
                placeholder="$HOME/.claude-code-router/custom-router.js"
              />
              <p className="text-xs text-muted-foreground">
                JavaScript文件路径，用于实现复杂的路由逻辑
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transformers">自定义转换器配置</Label>
              <Textarea
                id="transformers"
                value={transformersJson}
                onChange={(e) => setTransformersJson(e.target.value)}
                placeholder='[{"path": "$HOME/.claude-code-router/plugins/custom.js", "options": {}}]'
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                JSON数组格式，每个对象包含path和可选的options字段
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 配置预览 */}
        <Card>
          <CardHeader>
            <CardTitle>全局配置预览</CardTitle>
            <CardDescription>
              当前全局设置的JSON格式预览
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <pre className="text-sm overflow-x-auto">
                <code>
                  {JSON.stringify({
                    APIKEY: formData.APIKEY ? '***' : undefined,
                    PROXY_URL: formData.PROXY_URL,
                    LOG: formData.LOG,
                    HOST: formData.HOST,
                    NON_INTERACTIVE_MODE: formData.NON_INTERACTIVE_MODE,
                    API_TIMEOUT_MS: formData.API_TIMEOUT_MS,
                    CUSTOM_ROUTER_PATH: formData.CUSTOM_ROUTER_PATH,
                    transformers: formData.transformers
                  }, null, 2)}
                </code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* 配置说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              配置说明
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>安全注意事项:</strong></p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                <li>API密钥用于保护Router服务，防止未授权访问</li>
                <li>未设置API密钥时，服务仅监听本地地址(127.0.0.1)</li>
                <li>设置API密钥后，可以通过HOST参数允许远程访问</li>
              </ul>
            </div>
            
            <Separator />
            
            <div className="text-sm space-y-2">
              <p><strong>自定义路由器示例:</strong></p>
              <div className="p-3 bg-muted rounded text-xs font-mono">
                <code>{`module.exports = async function router(req, config) {
  const userMessage = req.body.messages.find(m => m.role === 'user')?.content;
  
  if (userMessage && userMessage.includes('解释代码')) {
    return 'openrouter,anthropic/claude-3.5-sonnet';
  }
  
  return null; // 使用默认路由
};`}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}