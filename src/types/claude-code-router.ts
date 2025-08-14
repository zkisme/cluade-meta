// Claude Code Router 配置数据结构

export interface Transformer {
  use: (string | [string, Record<string, any>])[];
  [modelName: string]: {
    use: (string | [string, Record<string, any>])[];
  } | any;
}

export interface Provider {
  name: string;
  api_base_url: string;
  api_key: string;
  models: string[];
  transformer?: Transformer;
}

export interface RouterConfig {
  default?: string;
  background?: string;
  think?: string;
  longContext?: string;
  longContextThreshold?: number;
  webSearch?: string;
}

export interface CustomTransformer {
  path: string;
  options?: Record<string, any>;
}

export interface ClaudeCodeRouterConfig {
  // 全局配置
  APIKEY?: string;
  PROXY_URL?: string;
  LOG?: boolean;
  HOST?: string;
  NON_INTERACTIVE_MODE?: boolean;
  API_TIMEOUT_MS?: number;
  CUSTOM_ROUTER_PATH?: string;
  
  // 提供商配置
  Providers: Provider[];
  
  // 路由配置
  Router: RouterConfig;
  
  // 自定义转换器
  transformers?: CustomTransformer[];
}

// 内置转换器列表
export const BUILT_IN_TRANSFORMERS = [
  'Anthropic',
  'deepseek',
  'gemini', 
  'openrouter',
  'groq',
  'maxtoken',
  'tooluse',
  'gemini-cli',
  'reasoning',
  'sampling',
  'enhancetool',
  'cleancache',
  'vertex-gemini',
  'qwen-cli'
] as const;

// 常用模型提供商
export const PROVIDER_TEMPLATES = {
  openrouter: {
    name: 'openrouter',
    api_base_url: 'https://openrouter.ai/api/v1/chat/completions',
    api_key: '',
    models: [
      'google/gemini-2.5-pro-preview',
      'anthropic/claude-sonnet-4',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3.7-sonnet:thinking'
    ],
    transformer: {
      use: ['openrouter']
    }
  } as Provider,
  deepseek: {
    name: 'deepseek',
    api_base_url: 'https://api.deepseek.com/chat/completions',
    api_key: '',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    transformer: {
      use: ['deepseek'],
      'deepseek-chat': {
        use: ['tooluse']
      }
    }
  } as Provider,
  ollama: {
    name: 'ollama',
    api_base_url: 'http://localhost:11434/v1/chat/completions',
    api_key: 'ollama',
    models: ['qwen2.5-coder:latest'],
  } as Provider,
  gemini: {
    name: 'gemini',
    api_base_url: 'https://generativelanguage.googleapis.com/v1beta/models/',
    api_key: '',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    transformer: {
      use: ['gemini']
    }
  } as Provider,
  volcengine: {
    name: 'volcengine',
    api_base_url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    api_key: '',
    models: ['deepseek-v3-250324', 'deepseek-r1-250528'],
    transformer: {
      use: ['deepseek']
    }
  } as Provider,
  modelscope: {
    name: 'modelscope',
    api_base_url: 'https://api-inference.modelscope.cn/v1/chat/completions',
    api_key: '',
    models: ['Qwen/Qwen3-Coder-480B-A35B-Instruct', 'Qwen/Qwen3-235B-A22B-Thinking-2507'],
    transformer: {
      use: [
        ['maxtoken', { max_tokens: 65536 }],
        'enhancetool'
      ],
      'Qwen/Qwen3-235B-A22B-Thinking-2507': {
        use: ['reasoning']
      }
    }
  } as Provider,
  dashscope: {
    name: 'dashscope',
    api_base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    api_key: '',
    models: ['qwen3-coder-plus'],
    transformer: {
      use: [
        ['maxtoken', { max_tokens: 65536 }],
        'enhancetool'
      ]
    }
  } as Provider
};