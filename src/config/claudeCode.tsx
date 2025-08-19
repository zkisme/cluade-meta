import { Key, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Copy, Eye, EyeOff, PowerOff } from "lucide-react";
import { ConfigType } from "@/types/config";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ClaudeCodeManager } from "@/components/ClaudeCodeManager";

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
    return () => {
      resetListeners.delete(listener);
    };
  }, []);
  
  return resetTrigger;
};

export interface ApiKeyData {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_BASE_URL?: string;
}

export const claudeCodeConfigType: ConfigType<ApiKeyData> = {
  id: "claude-code",
  name: "claude-code",
  displayName: "Claude Code API密钥",
  description: "管理Claude Code的API密钥配置",
  icon: Key,
  customPageComponent: ClaudeCodeManager,
  defaultData: {
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_BASE_URL: "https://api.anthropic.com",
  },
  formComponent: ({ data, onChange }) => {
    const [showPassword, setShowPassword] = useState(false);
    
    // Debug: 检查传入的数据
    console.log('formComponent received data:', data);
    
    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    };

    return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-primary" />
          ANTHROPIC_API_KEY
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={data?.ANTHROPIC_API_KEY || ""}
            onChange={(e) => onChange({ ...data, ANTHROPIC_API_KEY: e.target.value })}
            className="w-full px-3 py-2 pr-20 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background font-mono text-sm"
            placeholder="请输入API密钥"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword(!showPassword)}
              className="h-6 w-6 p-0 hover:bg-muted"
              title={showPassword ? "隐藏密钥" : "显示密钥"}
            >
              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(data?.ANTHROPIC_API_KEY || "")}
              className="h-6 w-6 p-0 hover:bg-muted"
              title="复制API密钥"
              disabled={!data?.ANTHROPIC_API_KEY}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-primary" />
          ANTHROPIC_BASE_URL
        </label>
        <div className="relative">
          <input
            type="text"
            value={data?.ANTHROPIC_BASE_URL || ""}
            onChange={(e) => onChange({ ...data, ANTHROPIC_BASE_URL: e.target.value })}
            className="w-full px-3 py-2 pr-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-sm"
            placeholder="https://api.anthropic.com"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(data?.ANTHROPIC_BASE_URL || "")}
              className="h-6 w-6 p-0 hover:bg-muted"
              title="复制BASE_URL"
              disabled={!data?.ANTHROPIC_BASE_URL}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
    );
  },
  listComponent: ({ item, isActive, onToggleActive, onEdit, onDelete }) => {
    const [showKey, setShowKey] = useState(false);
    const resetTrigger = useGlobalReset();
    
    const handleToggleActive = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('toggle_api_key_active', { id: item.id });
        toast.success(item.is_active ? '密钥已弃用' : '密钥已启用');
        
        // Trigger a refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('refresh-config-items'));
      } catch (error) {
        toast.error('操作失败');
        console.error('Failed to toggle key active status:', error);
      }
    };
    
    // 当全局重置触发时，强制重置为false
    useEffect(() => {
      if (resetTrigger > 0) { // 只有实际重置时才执行，避免初始化干扰
        setShowKey(false);
      }
    }, [resetTrigger]);
    
    // 当item数据更新时，不重置密钥显示状态，保持用户的选择
    // This was removed to fix the issue of key visibility being reset after editing
    
    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    };

    const copyApiKey = () => {
      if (item?.data?.ANTHROPIC_API_KEY) {
        copyToClipboard(item.data.ANTHROPIC_API_KEY);
      }
    };

    const maskApiKey = (key: string) => {
      if (!key || key.length <= 8) return key || '';
      const start = key.slice(0, 4);
      const end = key.slice(-4);
      const middle = '*'.repeat(Math.min(key.length - 8, 20));
      return `${start}${middle}${end}`;
    };

    const toggleKeyVisibility = () => {
      setShowKey(!showKey);
    };

    return (
      <div className={`flex items-start justify-between ${item.is_active === false ? 'opacity-60' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <Switch checked={isActive} onCheckedChange={() => onToggleActive(item.id)} disabled={item.is_active === false} />
            <h3 className="text-sm font-medium truncate">{item.name}</h3>
            {item.is_active === false && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">已弃用</span>
            )}
          </div>
          
          <div className="mb-1">
            <div className="text-xs text-muted-foreground mb-1">ANTHROPIC_API_KEY:</div>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono block break-all whitespace-pre-wrap">
              {item?.data?.ANTHROPIC_API_KEY ? 
                (showKey ? item.data.ANTHROPIC_API_KEY : maskApiKey(item.data.ANTHROPIC_API_KEY)) : 
                '未设置'
              }
            </code>
          </div>
          
          {item?.data?.ANTHROPIC_BASE_URL && (
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
            disabled={!item?.data?.ANTHROPIC_API_KEY}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleToggleActive} 
            className={`h-6 w-6 p-0 ${item.is_active === false ? 'text-red-600 hover:text-red-700' : 'text-gray-600 hover:text-gray-700'}`}
            title={item.is_active === false ? "启用密钥" : "弃用密钥"}
          >
            <PowerOff className="h-3 w-3" />
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
    toggleActive: "toggle_api_key_active",
  },
  configPath: "~/.claude/settings.json",
  onConfigUpdate: async (data: ApiKeyData, configPath: string) => {
    try {
      // Only invoke Tauri command if running in Tauri environment
      const { isTauri } = await import('@tauri-apps/api/core');
      if (await isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        const { ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL } = data;
        await invoke('update_config_env', { 
          configPath, 
          apiKey: ANTHROPIC_API_KEY, 
          baseUrl: ANTHROPIC_BASE_URL
        });
      }
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  },
};