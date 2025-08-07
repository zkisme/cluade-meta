import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, RefreshCw, Eye, EyeOff } from "lucide-react";

interface ClaudeSettings {
  api_key?: string;
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

interface ClaudeSettingsProps {
  trigger?: React.ReactNode;
}

export function ClaudeSettingsConfig({ trigger }: ClaudeSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ClaudeSettings>({});
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [configPath] = useState("~/.claude/settings.json");
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setError(null);
    try {
      const content = await invoke<string>("get_claude_settings", { path: configPath });
      const parsedSettings = JSON.parse(content);
      setSettings(parsedSettings);
    } catch (error) {
      console.error("Failed to load Claude settings:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`加载设置失败: ${errorMessage}`);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      await invoke<boolean>("save_claude_settings", { 
        path: configPath, 
        settings: settings 
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to save Claude settings:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`保存设置失败: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ClaudeSettings>(key: K, value: ClaudeSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetSettings = () => {
    setSettings({
      api_key: "",
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
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Settings className="mr-2 h-4 w-4" />
      Claude设置
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claude API 配置设置</DialogTitle>
          <DialogDescription>
            配置 Claude API 的各项参数，这些设置将保存到 ~/.claude/settings.json 文件中
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-sm text-red-800">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* API 基础设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API 基础设置</CardTitle>
              <CardDescription>
                配置 API 访问的基本参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API 密钥</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    value={settings.api_key || ""}
                    onChange={(e) => updateSetting("api_key", e.target.value)}
                    placeholder="输入您的 Claude API 密钥"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-url">API 地址</Label>
                <Input
                  id="api-url"
                  value={settings.api_url || ""}
                  onChange={(e) => updateSetting("api_url", e.target.value)}
                  placeholder="https://api.anthropic.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">模型</Label>
                <Input
                  id="model"
                  value={settings.model || ""}
                  onChange={(e) => updateSetting("model", e.target.value)}
                  placeholder="claude-3-5-sonnet-20241022"
                />
              </div>
            </CardContent>
          </Card>

          {/* 请求参数设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">请求参数</CardTitle>
              <CardDescription>
                配置 API 请求的参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-tokens">最大令牌数</Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    value={settings.max_tokens || ""}
                    onChange={(e) => updateSetting("max_tokens", parseInt(e.target.value) || undefined)}
                    placeholder="4096"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">温度 (0-1)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={settings.temperature || ""}
                    onChange={(e) => updateSetting("temperature", parseFloat(e.target.value) || undefined)}
                    placeholder="0.7"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="top-p">Top P (0-1)</Label>
                  <Input
                    id="top-p"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={settings.top_p || ""}
                    onChange={(e) => updateSetting("top_p", parseFloat(e.target.value) || undefined)}
                    placeholder="0.9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">超时时间 (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={settings.timeout || ""}
                    onChange={(e) => updateSetting("timeout", parseInt(e.target.value) || undefined)}
                    placeholder="30000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 高级设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">高级设置</CardTitle>
              <CardDescription>
                配置高级选项和代理设置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proxy-url">代理地址</Label>
                <Input
                  id="proxy-url"
                  value={settings.proxy_url || ""}
                  onChange={(e) => updateSetting("proxy_url", e.target.value)}
                  placeholder="http://proxy.example.com:8080"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>详细日志</Label>
                    <p className="text-sm text-muted-foreground">启用详细的调试日志</p>
                  </div>
                  <Switch
                    checked={settings.verbose || false}
                    onCheckedChange={(checked) => updateSetting("verbose", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>流式输出</Label>
                    <p className="text-sm text-muted-foreground">启用流式响应</p>
                  </div>
                  <Switch
                    checked={settings.stream !== false}
                    onCheckedChange={(checked) => updateSetting("stream", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>允许不安全 HTML</Label>
                    <p className="text-sm text-muted-foreground">允许渲染不安全的 HTML 内容</p>
                  </div>
                  <Switch
                    checked={settings.unsafe_html || false}
                    onCheckedChange={(checked) => updateSetting("unsafe_html", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={resetSettings}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重置为默认值
            </Button>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={saveSettings}
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "保存中..." : "保存设置"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}