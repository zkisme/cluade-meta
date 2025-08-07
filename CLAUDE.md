# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tauri + React + TypeScript desktop application with Tailwind CSS v4 and shadcn/ui components. Uses Vite build tool and standard Tauri structure.

## Development Commands

- `npm run dev` - Start Vite dev server (port 1420)
- `npm run build` - Build frontend
- `npm run tauri dev` - Start Tauri development environment
- `npm run tauri build` - Build desktop application
- `npx shadcn@latest add [component]` - Add shadcn components

## Architecture

Frontend: React 18 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui  
Backend: Rust + Tauri  
Communication: Frontend calls Rust commands via `invoke()`

## Key Files

- `src/App.tsx` - Main React component
- `src-tauri/src/lib.rs` - Rust commands and Tauri setup
- `src-tauri/tauri.conf.json` - Tauri configuration
- `vite.config.ts` - Vite build configuration
- `src/index.css` - Tailwind CSS v4 configuration
- `src/lib/utils.ts` - shadcn/ui utilities

## Development Workflow

1. Development: `npm run tauri dev`
2. Building: `npm run tauri build`
3. Frontend-only: `npm run dev`
4. Add components: `npx shadcn@latest add [component]`

## Component Libraries

All components and libraries follow KISS principle. Use context7 for:
- shadcn/ui components
- tailwindcss v4
- tauri
- lucide icons

## Available Components

- Button, Card, Input, Sidebar, Navigation Menu (pre-installed)
- Add more with `npx shadcn@latest add [component]`

## Sidebar Navigation

The app includes a sidebar with three main sections:
- **Claude Code** - API key management with full CRUD operations
- **Claude Code Router** - Routing configuration (coming soon)
- **环境变量** - Environment variables management (coming soon)

The sidebar uses shadcn/ui components with collapsible functionality and proper responsive design.

## Claude Code API Key Management

### Features
- **Create**: Add new Claude Code API keys with name, key value, and description
- **Read**: View all stored API keys with masked/unmasked display options
- **Update**: Edit existing API key information
- **Delete**: Remove API keys with confirmation dialog
- **Security**: API keys are stored securely in app data directory
- **Copy**: One-click clipboard copying of API keys
- **Show/Hide**: Toggle visibility of sensitive key information

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

### Backend Storage
- API keys are stored in JSON format in the app data directory
- Uses Tauri's secure file system access
- All operations are performed asynchronously