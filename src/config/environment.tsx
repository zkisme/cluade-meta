import { Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2 } from "lucide-react";
import { ConfigType } from "@/types/config";

export interface EnvironmentVariableData {
  key: string;
  value: string;
  scope: "global" | "project";
}

export const environmentConfigType: ConfigType<EnvironmentVariableData> = {
  id: "environment",
  name: "environment",
  displayName: "环境变量",
  description: "管理系统环境变量配置",
  icon: Variable,
  defaultData: {
    key: "",
    value: "",
    scope: "global",
  },
  formComponent: ({ data, onChange }) => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">变量名</label>
        <input
          type="text"
          value={data.key}
          onChange={(e) => onChange({ ...data, key: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="例如: NODE_ENV"
        />
      </div>
      <div>
        <label className="text-sm font-medium">变量值</label>
        <textarea
          value={data.value}
          onChange={(e) => onChange({ ...data, value: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="请输入变量值"
          rows={3}
        />
      </div>
      <div>
        <label className="text-sm font-medium">作用域</label>
        <select
          value={data.scope}
          onChange={(e) => onChange({ ...data, scope: e.target.value as "global" | "project" })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="global">全局</option>
          <option value="project">项目</option>
        </select>
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
          <span className="text-xs text-muted-foreground">键:</span>
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {item.data.key}
          </code>
        </div>
        
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xs text-muted-foreground">值:</span>
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate flex-1">
            {item.data.value}
          </code>
        </div>
        
        <div className="mb-1">
          <span className="text-xs text-muted-foreground">作用域: </span>
          <span className="text-xs">{item.data.scope === "global" ? "全局" : "项目"}</span>
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
    create: "create_environment_variable",
    list: "get_environment_variables_config",
    update: "update_environment_variable",
    delete: "delete_environment_variable",
  },
  configPath: "~/.config/environment.json",
};