# Gemini 助手上下文

## 项目概述

本项目名为 “Claude Meta”，是一个使用 Tauri（后端为 Rust）和 React（前端为 TypeScript）构建的桌面应用程序。其主要目的是为管理 Claude API 配置和路由设置提供一个用户友好的界面。

### 关键技术：

*   **前端:** React 18, TypeScript, Vite
*   **后端:** Rust, Tauri
*   **样式:** Tailwind CSS v4, shadcn/ui
*   **状态管理:** React Hooks
*   **包管理器:** pnpm

### 架构：

该应用程序遵循典型的 Tauri 架构，其中 Rust 后端处理本机功能，而基于 Web 的前端则用于用户界面。前端和后端通过 Tauri 的安全 IPC 通道进行通信。

## 构建和运行

### 开发

要以开发模式运行应用程序，请使用以下命令：

```bash
pnpm tauri dev
```

这将为前端启动 Vite 开发服务器，并为后端启动 Tauri 开发环境。

### 生产构建

要为生产环境构建应用程序，请使用以下命令：

```bash
pnpm tauri build
```

捆绑的应用程序将位于 `src-tauri/target/release/bundle/` 目录中。

### 其他脚本

*   `pnpm dev`: 仅启动 Vite 开发服务器。
*   `pnpm build`: 仅构建前端。

## 开发约定

### 代码风格

该项目使用 Prettier 进行代码格式化，这很可能已集成到开发工作流程中。TypeScript 和定义明确的组件结构的使用表明了对代码质量和可维护性的关注。

### 组件库

该项目使用 `shadcn/ui` 作为其 UI 组件，这些组件构建在 Radix UI 之上，并使用 Tailwind CSS 进行样式设置。这提供了一致且现代的外观。

### 状态管理

该应用程序使用 React Hooks 进行状态管理，这是 React 应用程序的常用且有效的方法。

### 测试

虽然 `package.json` 中没有明确定义测试框架，但根目录中存在多个 `test-*.js` 文件表明存在某种形式的测试，很可能使用 Node.js 来执行。
