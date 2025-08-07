"use client"

import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
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
        const path = await invoke<string>("get_config_path")
        console.log("Initial config path loaded:", path)
        setConfigPath(path || "~/.claude/settings.json")
      } catch (error) {
        console.error("Failed to load initial config path:", error)
      }
    }
    
    loadInitialPath()
  }, [])

  const handleOpenFileDialog = async () => {
    try {
      const path = await invoke<string>("open_file_dialog")
      if (path) {
        setConfigPath(path)
      }
    } catch (error) {
      if (error !== "用户取消了选择") {
        toast.error("选择文件失败")
      }
    }
  }

  const handleSave = async () => {
    if (!configPath.trim()) {
      toast.error("请选择配置文件路径")
      return
    }

    try {
      // Save the config path to local database
      await invoke("save_config_path", { path: configPath.trim() })
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
      const path = await invoke<string>("get_config_path")
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
      } else {
        setConfigPath("~/.claude/settings.json")
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