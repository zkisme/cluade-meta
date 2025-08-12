import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Copy } from "lucide-react";
import { ConfigType } from "@/types/config";
import { toast } from "sonner";

export interface ApiKeyData {
  anthropic_auth_token: string;
  anthropic_base_url?: string;
}

export const claudeCodeConfigType: ConfigType<ApiKeyData> = {
  id: "claude-code",
  name: "claude-code",
  displayName: "Claude Code API密钥",
  description: "管理Claude Code的API密钥配置",
  icon: Key,
  defaultData: {
    anthropic_auth_token: "",
    anthropic_base_url: "https://api.anthropic.com",
  },
  formComponent: ({ data, onChange }) => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">ANTHROPIC_AUTH_TOKEN</label>
        <input
          type="password"
          value={data.anthropic_auth_token}
          onChange={(e) => onChange({ ...data, anthropic_auth_token: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="请输入API密钥"
        />
      </div>
      <div>
        <label className="text-sm font-medium">ANTHROPIC_BASE_URL</label>
        <input
          type="text"
          value={data.anthropic_base_url || ""}
          onChange={(e) => onChange({ ...data, anthropic_base_url: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="https://api.anthropic.com"
        />
      </div>
    </div>
  ),
  listComponent: ({ item, isActive, onToggleActive, onEdit, onDelete }) => {
    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    };

    const copyApiKey = () => {
      copyToClipboard(item.data.anthropic_auth_token);
    };

    return (
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <Switch checked={isActive} onCheckedChange={() => onToggleActive(item.id)} />
            <h3 className="text-sm font-medium truncate">{item.name}</h3>
          </div>
          
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-muted-foreground">ANTHROPIC_AUTH_TOKEN:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate flex-1">
              {item.data.anthropic_auth_token}
            </code>
          </div>
          
          {item.data.anthropic_base_url && (
            <div className="mb-1">
              <span className="text-xs text-muted-foreground">ANTHROPIC_BASE_URL: </span>
              <span className="text-xs">{item.data.anthropic_base_url}</span>
            </div>
          )}
          
          {item.description && (
            <div className="mb-1">
              <span className="text-xs text-muted-foreground">描述: </span>
              <span className="text-xs">{item.description}</span>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            创建时间: {new Date(item.created_at).toLocaleString('zh-CN')}
          </div>
        </div>
        
        <div className="flex space-x-1 ml-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={copyApiKey} 
            className="h-6 w-6 p-0"
            title="复制API密钥"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-6 w-6 p-0">
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="h-6 w-6 p-0">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  },
  apiEndpoints: {
    create: "create_api_key",
    list: "get_api_keys_config",
    update: "update_api_key",
    delete: "delete_api_key",
  },
  configPath: "~/.claude/settings.json",
  onConfigUpdate: async (data: ApiKeyData, configPath: string) => {
    try {
      // Only invoke Tauri command if running in Tauri environment
      const { isTauri } = await import('@tauri-apps/api/core');
      if (await isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        const { anthropic_auth_token, anthropic_base_url } = data;
        await invoke('update_config_env', { 
          configPath, 
          apiKey: anthropic_auth_token, 
          baseUrl: anthropic_base_url 
        });
      }
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  },
};