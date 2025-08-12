"use client"

import { useState, useEffect } from "react"
// Helper function to safely invoke Tauri commands
const invokeTauri = async <T,>(command: string, args?: any): Promise<T> => {
  console.log(`=== invokeTauri 调试 ===`);
  console.log(`命令: ${command}`);
  console.log(`参数:`, args);
  console.log(`window.__TAURI__ 存在:`, !!(window as any).__TAURI__);
  console.log(`window.__TAURI__ 值:`, (window as any).__TAURI__);
  
  try {
    console.log(`尝试导入 @tauri-apps/api/core...`);
    const { invoke } = await import('@tauri-apps/api/core');
    console.log(`成功导入 invoke 函数，调用命令: ${command}`);
    const result = invoke<T>(command, args);
    console.log(`命令调用成功，返回结果:`, result);
    return result;
  } catch (importError) {
    console.error(`导入或调用 Tauri API 失败:`, importError);
    throw new Error('Tauri environment not available');
  }
};
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FolderOpen, Settings } from "lucide-react"

interface ConfigPathManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConfigPathManager({ open, onOpenChange }: ConfigPathManagerProps) {
  const [configPath, setConfigPath] = useState("~/.claude/settings.json")

  // Load config path when component mounts
  useEffect(() => {
    const loadInitialPath = async () => {
      try {
        console.log("Loading initial config path...")
        const path = await invokeTauri<string>("get_config_path")
        console.log("Initial config path loaded:", path)
        setConfigPath(path || "~/.claude/settings.json")
      } catch (error) {
        console.error("Failed to load initial config path:", error)
      }
    }
    
    loadInitialPath()
  }, [])

  const handleOpenFileDialog = async () => {
    console.log("=== 文件对话框开始 ===")
    try {
      console.log("调用 open_file_dialog 命令...")
      const path = await invokeTauri<string>("open_file_dialog")
      console.log("open_file_dialog 返回结果:", path)
      if (path) {
        console.log("设置配置路径:", path)
        setConfigPath(path)
      } else {
        console.log("返回的路径为空")
      }
    } catch (error) {
      console.error("=== 文件对话框错误 ===")
      console.error("错误类型:", typeof error)
      console.error("错误值:", error)
      console.error("错误字符串:", String(error))
      console.error("错误JSON:", JSON.stringify(error))
      
      if (typeof error === 'string' && error.includes("用户取消了选择")) {
        console.log("用户取消了选择，不显示错误")
      } else {
        console.log("显示选择文件失败错误")
        toast.error("选择文件失败")
      }
    }
    console.log("=== 文件对话框结束 ===")
  }

  const handleSave = async () => {
    if (!configPath.trim()) {
      toast.error("请选择配置文件路径")
      return
    }

    try {
      // Save the config path to local database
      await invokeTauri("save_config_path", { path: configPath.trim() })
      toast.success("配置文件路径保存成功")
      onOpenChange(false)
    } catch (error) {
      toast.error("保存配置文件路径失败")
      console.error("Failed to save config path:", error)
    }
  }

  // Load current config path when dialog opens
  const loadCurrentPath = async () => {
    try {
      console.log("Loading current config path...")
      const path = await invokeTauri<string>("get_config_path")
      console.log("Loaded config path:", path)
      setConfigPath(path || "~/.claude/settings.json")
    } catch (error) {
      console.error("Failed to load current config path:", error)
      setConfigPath("~/.claude/settings.json")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (newOpen) {
        loadCurrentPath()
      }
      onOpenChange(newOpen)
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            设置配置文件路径
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">配置文件路径</label>
            <div className="flex gap-2 pt-1">
              <Input
                value={configPath}
                onChange={(e) => setConfigPath(e.target.value)}
                placeholder="选择配置文件路径"
                className="flex-1 h-9"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFileDialog}
                title="选择文件"
                className="h-9 px-3"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}