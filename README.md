# Claude Meta

A powerful desktop application built with Tauri and React for managing Claude API configurations and routing settings.

## Features

### 🚀 Core Functionality
- **Claude Code API Management**: Complete CRUD operations for Claude API keys
- **Configuration Management**: Secure storage and management of API configurations
- **Routing Configuration**: Manage Claude Code Router settings (coming soon)
- **Environment Variables**: Handle environment variable management (coming soon)

### 🔒 Security Features
- **Secure Storage**: API keys stored securely in app data directory
- **Encrypted Communication**: Frontend-backend communication via Tauri's secure IPC
- **Masked Display**: Sensitive information masked by default with toggle visibility

### 🎨 User Interface
- **Modern Design**: Built with Tailwind CSS v4 and shadcn/ui components
- **Responsive Layout**: Works seamlessly across different screen sizes
- **Sidebar Navigation**: Organized navigation with collapsible sections
- **Dark/Light Theme**: Built-in theme switching support

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Hooks

## Installation

### Prerequisites
- Node.js (v18 or higher)
- Rust and Cargo
- Tauri CLI

### Setup
1. Clone the repository
```bash
git clone <repository-url>
cd claude-meta
```

2. Install dependencies
```bash
npm install
```

3. Run the development server
```bash
npm run tauri dev
```

## Development

### Available Scripts
- `npm run dev` - Start Vite dev server (port 1420)
- `npm run build` - Build frontend
- `npm run tauri dev` - Start Tauri development environment
- `npm run tauri build` - Build desktop application
- `npx shadcn@latest add [component]` - Add shadcn components

### Project Structure
```
claude-meta/
├── src/                    # React frontend source code
│   ├── components/         # React components
│   ├── config/            # Configuration management
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── services/          # API services
│   └── types/             # TypeScript type definitions
├── src-tauri/             # Rust backend source code
│   ├── src/               # Rust source files
│   ├── capabilities/      # Tauri capabilities
│   └── icons/             # Application icons
└── dist/                  # Build output
```

## Configuration

### API Key Management
The application provides full CRUD operations for Claude API keys:
- **Create**: Add new API keys with name, key value, and description
- **Read**: View all stored API keys with masked/unmasked display options
- **Update**: Edit existing API key information
- **Delete**: Remove API keys with confirmation dialog

### Data Structure
```typescript
interface ApiKey {
  id: string;           // UUID identifier
  name: string;         // Display name
  key: string;          // The actual API key
  description?: string; // Optional description
  created_at: string;   // ISO timestamp
  updated_at: string;   // ISO timestamp
}
```

## Building for Production

1. Build the frontend
```bash
npm run build
```

2. Build the Tauri application
```bash
npm run tauri build
```

The built application will be available in the `src-tauri/target/release/bundle/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

---

# Claude Meta

一个基于 Tauri 和 React 构建的强大桌面应用程序，用于管理 Claude API 配置和路由设置。

## 功能特性

### 🚀 核心功能
- **Claude Code API 管理**: Claude API 密钥的完整 CRUD 操作
- **配置管理**: 安全存储和管理 API 配置
- **路由配置**: 管理 Claude Code Router 设置（即将推出）
- **环境变量**: 处理环境变量管理（即将推出）

### 🔒 安全特性
- **安全存储**: API 密钥安全存储在应用程序数据目录中
- **加密通信**: 通过 Tauri 的安全 IPC 进行前后端通信
- **掩码显示**: 敏感信息默认掩码显示，支持切换可见性

### 🎨 用户界面
- **现代设计**: 使用 Tailwind CSS v4 和 shadcn/ui 组件构建
- **响应式布局**: 在不同屏幕尺寸上无缝工作
- **侧边栏导航**: 具有可折叠部分的有序导航
- **深色/浅色主题**: 内置主题切换支持

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **后端**: Rust + Tauri
- **样式**: Tailwind CSS v4
- **UI 组件**: shadcn/ui
- **图标**: Lucide React
- **状态管理**: React Hooks

## 安装

### 前置要求
- Node.js (v18 或更高版本)
- Rust 和 Cargo
- Tauri CLI

### 设置
1. 克隆仓库
```bash
git clone <repository-url>
cd claude-meta
```

2. 安装依赖
```bash
npm install
```

3. 运行开发服务器
```bash
npm run tauri dev
```

## 开发

### 可用脚本
- `npm run dev` - 启动 Vite 开发服务器（端口 1420）
- `npm run build` - 构建前端
- `npm run tauri dev` - 启动 Tauri 开发环境
- `npm run tauri build` - 构建桌面应用程序
- `npx shadcn@latest add [component]` - 添加 shadcn 组件

### 项目结构
```
claude-meta/
├── src/                    # React 前端源代码
│   ├── components/         # React 组件
│   ├── config/            # 配置管理
│   ├── hooks/             # 自定义 React hooks
│   ├── lib/               # 实用函数
│   ├── services/          # API 服务
│   └── types/             # TypeScript 类型定义
├── src-tauri/             # Rust 后端源代码
│   ├── src/               # Rust 源文件
│   ├── capabilities/      # Tauri 权限
│   └── icons/             # 应用程序图标
└── dist/                  # 构建输出
```

## 配置

### API 密钥管理
应用程序提供 Claude API 密钥的完整 CRUD 操作：
- **创建**: 添加新的 API 密钥，包含名称、密钥值和描述
- **读取**: 查看所有存储的 API 密钥，支持掩码/非掩码显示选项
- **更新**: 编辑现有 API 密钥信息
- **删除**: 删除 API 密钥，带确认对话框

### 数据结构
```typescript
interface ApiKey {
  id: string;           // UUID 标识符
  name: string;         // 显示名称
  key: string;          // 实际的 API 密钥
  description?: string; // 可选描述
  created_at: string;   // ISO 时间戳
  updated_at: string;   // ISO 时间戳
}
```

## 生产构建

1. 构建前端
```bash
npm run build
```

2. 构建 Tauri 应用程序
```bash
npm run tauri build
```

构建的应用程序将在 `src-tauri/target/release/bundle/` 目录中可用。

## 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 彻底测试
5. 提交拉取请求

## 许可证

本项目采用 MIT 许可证。

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
