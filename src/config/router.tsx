import { Router } from "lucide-react";
import { ClaudeCodeRouterManager } from "@/components/ClaudeCodeRouterManager";
import { ConfigType } from "@/types/config";

// 空的配置数据接口，因为 Claude Code Router 使用完整的配置文件管理
export interface RouterConfigData {}

export const routerConfigType: ConfigType<RouterConfigData> = {
  id: "claude-router",
  name: "claude-router", 
  displayName: "Claude Code Router",
  description: "Claude Code请求路由器，支持多模型提供商和智能路由",
  icon: Router,
  defaultData: {},
  
  // 使用自定义组件管理整个 Claude Code Router 配置
  formComponent: () => <div />,
  
  listComponent: () => <div />,
  
  // 自定义完整页面组件
  customPageComponent: () => <ClaudeCodeRouterManager />,
  
  apiEndpoints: {
    create: "create_router_config",
    list: "get_router_config", 
    update: "update_router_config",
    delete: "delete_router_config",
  },
  configPath: "~/.claude-code-router/config.json",
};