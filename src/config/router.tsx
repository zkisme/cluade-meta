import { Router } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2 } from "lucide-react";
import { ConfigType } from "@/types/config";

export interface RouteConfigData {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  handler: string;
  middleware?: string[];
  auth_required: boolean;
}

export const routerConfigType: ConfigType<RouteConfigData> = {
  id: "claude-router",
  name: "claude-router",
  displayName: "Claude Code Router",
  description: "管理Claude Code的路由配置",
  icon: Router,
  defaultData: {
    path: "",
    method: "GET",
    handler: "",
    middleware: [],
    auth_required: false,
  },
  formComponent: ({ data, onChange }) => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">路径</label>
        <input
          type="text"
          value={data.path}
          onChange={(e) => onChange({ ...data, path: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="/api/example"
        />
      </div>
      <div>
        <label className="text-sm font-medium">HTTP方法</label>
        <select
          value={data.method}
          onChange={(e) => onChange({ ...data, method: e.target.value as any })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">处理器</label>
        <input
          type="text"
          value={data.handler}
          onChange={(e) => onChange({ ...data, handler: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="handler_function"
        />
      </div>
      <div>
        <label className="text-sm font-medium">中间件 (逗号分隔)</label>
        <input
          type="text"
          value={data.middleware?.join(", ") || ""}
          onChange={(e) => onChange({ 
            ...data, 
            middleware: e.target.value.split(",").map(m => m.trim()).filter(Boolean) 
          })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="auth, logging, cors"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={data.auth_required}
          onChange={(e) => onChange({ ...data, auth_required: e.target.checked })}
          className="rounded border-border"
        />
        <label className="text-sm font-medium">需要认证</label>
      </div>
    </div>
  ),
  listComponent: ({ item, isActive, onToggleActive, onEdit, onDelete }) => (
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <Switch checked={isActive} onCheckedChange={() => onToggleActive(item.id)} />
          <h3 className="text-sm font-medium truncate">{item.name}</h3>
        </div>
        
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xs text-muted-foreground">路径:</span>
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {item.data.path}
          </code>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {item.data.method}
          </span>
        </div>
        
        <div className="mb-1">
          <span className="text-xs text-muted-foreground">处理器: </span>
          <span className="text-xs">{item.data.handler}</span>
        </div>
        
        {item.data.middleware && item.data.middleware.length > 0 && (
          <div className="mb-1">
            <span className="text-xs text-muted-foreground">中间件: </span>
            <span className="text-xs">{item.data.middleware.join(", ")}</span>
          </div>
        )}
        
        <div className="mb-1">
          <span className="text-xs text-muted-foreground">认证: </span>
          <span className={`text-xs ${item.data.auth_required ? 'text-green-600' : 'text-gray-500'}`}>
            {item.data.auth_required ? "需要" : "不需要"}
          </span>
        </div>
        
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
        <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-6 w-6 p-0">
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="h-6 w-6 p-0">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  ),
  apiEndpoints: {
    create: "create_route_config",
    list: "get_route_configs_config",
    update: "update_route_config",
    delete: "delete_route_config",
  },
  configPath: "~/.claude/router.json",
};