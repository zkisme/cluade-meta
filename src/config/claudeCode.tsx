import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { ConfigType } from "@/types/config";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// 简化的全局重置机制
let globalResetTrigger = 1; // 从1开始，避免与初始useState(0)冲突
const resetListeners = new Set<() => void>();

export const resetAllKeyVisibility = () => {
  globalResetTrigger++;
  resetListeners.forEach(listener => listener());
};

const useGlobalReset = () => {
  const [resetTrigger, setResetTrigger] = useState(0);
  
  useEffect(() => {
    const listener = () => setResetTrigger(globalResetTrigger);
    resetListeners.add(listener);
    return () => resetListeners.delete(listener);
  }, []);
  
  return resetTrigger;
};

export interface ApiKeyData {
  ANTHROPIC_AUTH_TOKEN: string;
  ANTHROPIC_BASE_URL?: string;
}

export const claudeCodeConfigType: ConfigType<ApiKeyData> = {
  id: "claude-code",
  name: "claude-code",
  displayName: "Claude Code API密钥",
  description: "管理Claude Code的API密钥配置",
  icon: Key,
  defaultData: {
    ANTHROPIC_AUTH_TOKEN: "",
    ANTHROPIC_BASE_URL: "https://api.anthropic.com",
  },
  formComponent: ({ data, onChange }) => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">ANTHROPIC_AUTH_TOKEN</label>
        <input
          type="password"
          value={data.ANTHROPIC_AUTH_TOKEN}
          onChange={(e) => onChange({ ...data, ANTHROPIC_AUTH_TOKEN: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="请输入API密钥"
        />
      </div>
      <div>
        <label className="text-sm font-medium">ANTHROPIC_BASE_URL</label>
        <input
          type="text"
          value={data.ANTHROPIC_BASE_URL || ""}
          onChange={(e) => onChange({ ...data, ANTHROPIC_BASE_URL: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="https://api.anthropic.com"
        />
      </div>
          </div>
  ),
  listComponent: ({ item, isActive, onToggleActive, onEdit, onDelete }) => {
    const [showKey, setShowKey] = useState(false);
    const resetTrigger = useGlobalReset();
    
    // 当全局重置触发时，强制重置为false
    useEffect(() => {
      if (resetTrigger > 0) { // 只有实际重置时才执行，避免初始化干扰
        setShowKey(false);
      }
    }, [resetTrigger]);
    
    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    };

    const copyApiKey = () => {
      copyToClipboard(item.data.ANTHROPIC_AUTH_TOKEN);
    };

    const maskApiKey = (key: string) => {
      if (key.length <= 8) return key;
      const start = key.slice(0, 4);
      const end = key.slice(-4);
      const middle = '*'.repeat(Math.min(key.length - 8, 20));
      return `${start}${middle}${end}`;
    };

    const toggleKeyVisibility = () => {
      setShowKey(!showKey);
    };

    return (
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <Switch checked={isActive} onCheckedChange={() => onToggleActive(item.id)} />
            <h3 className="text-sm font-medium truncate">{item.name}</h3>
          </div>
          
          <div className="mb-1">
            <div className="text-xs text-muted-foreground mb-1">ANTHROPIC_AUTH_TOKEN:</div>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono block break-all whitespace-pre-wrap">
              {showKey ? item.data.ANTHROPIC_AUTH_TOKEN : maskApiKey(item.data.ANTHROPIC_AUTH_TOKEN)}
            </code>
          </div>
          
          {item.data.ANTHROPIC_BASE_URL && (
            <div className="mb-1">
              <span className="text-xs text-muted-foreground">ANTHROPIC_BASE_URL: </span>
              <span className="text-xs">{item.data.ANTHROPIC_BASE_URL}</span>
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
            onClick={toggleKeyVisibility} 
            className="h-6 w-6 p-0"
            title={showKey ? "隐藏密钥" : "显示密钥"}
          >
            {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
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
        const { ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = data;
        await invoke('update_config_env', { 
          configPath, 
          apiKey: ANTHROPIC_AUTH_TOKEN, 
          baseUrl: ANTHROPIC_BASE_URL
        });
      }
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  },
};