"use client"

import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Edit, 
  Trash2, 
  FolderOpen, 
  Save,
  X,
  Settings
} from "lucide-react"

interface ConfigPath {
  id: string
  name: string
  path: string
  description?: string
  created_at: string
  updated_at: string
}

interface ConfigPathManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConfigPathManager({ open, onOpenChange }: ConfigPathManagerProps) {
  const [configPaths, setConfigPaths] = useState<ConfigPath[]>([])
  const [loading, setLoading] = useState(false)
  const [editingPath, setEditingPath] = useState<ConfigPath | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    path: "",
    description: ""
  })

  const loadConfigPaths = async () => {
    setLoading(true)
    try {
      const paths = await invoke<ConfigPath[]>("get_config_paths")
      setConfigPaths(paths)
    } catch (error) {
      toast.error("加载配置路径失败")
      console.error("Failed to load config paths:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenFileDialog = async () => {
    try {
      const path = await invoke<string>("open_file_dialog")
      if (path) {
        setFormData(prev => ({ ...prev, path }))
      }
    } catch (error) {
      if (error !== "用户取消了选择") {
        toast.error("选择文件失败")
      }
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.path.trim()) {
      toast.error("请填写名称和路径")
      return
    }

    try {
      if (isCreating) {
        await invoke<ConfigPath>("create_config_path", {
          request: {
            name: formData.name.trim(),
            path: formData.path.trim(),
            description: formData.description.trim() || undefined
          }
        })
        toast.success("配置路径创建成功")
      } else if (editingPath) {
        await invoke<ConfigPath>("update_config_path", {
          id: editingPath.id,
          request: {
            name: formData.name.trim(),
            path: formData.path.trim(),
            description: formData.description.trim() || undefined
          }
        })
        toast.success("配置路径更新成功")
      }
      
      resetForm()
      loadConfigPaths()
    } catch (error) {
      toast.error(isCreating ? "创建配置路径失败" : "更新配置路径失败")
      console.error("Failed to save config path:", error)
    }
  }

  const handleEdit = (path: ConfigPath) => {
    setEditingPath(path)
    setIsCreating(false)
    setFormData({
      name: path.name,
      path: path.path,
      description: path.description || ""
    })
  }

  const handleDelete = async (id: string) => {
    try {
      await invoke<boolean>("delete_config_path", { id })
      toast.success("配置路径删除成功")
      loadConfigPaths()
    } catch (error) {
      toast.error("删除配置路径失败")
      console.error("Failed to delete config path:", error)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", path: "", description: "" })
    setEditingPath(null)
    setIsCreating(false)
  }

  useEffect(() => {
    if (open) {
      loadConfigPaths()
    } else {
      resetForm()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            配置路径管理
          </DialogTitle>
          <DialogDescription>
            管理配置文件的路径，支持添加、编辑和删除配置路径
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Form Section */}
          {(isCreating || editingPath) && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">
                  {isCreating ? "添加配置路径" : "编辑配置路径"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">名称</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="配置路径名称"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">路径</label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.path}
                        onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                        placeholder="配置文件路径"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenFileDialog}
                        title="选择文件"
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">描述</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="配置路径描述（可选）"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    取消
                  </Button>
                  <Button onClick={handleSubmit}>
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Table Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">配置路径列表</h3>
              {!isCreating && !editingPath && (
                <Button size="sm" onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加路径
                </Button>
              )}
            </div>
            
            <div className="overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>路径</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : configPaths.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-muted-foreground">
                          暂无配置路径
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    configPaths.map((path) => (
                      <TableRow key={path.id}>
                        <TableCell className="font-medium">
                          {path.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              JSON
                            </Badge>
                            <span className="truncate max-w-[200px]" title={path.path}>
                              {path.path}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {path.description || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(path.updated_at).toLocaleString("zh-CN")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(path)}
                              disabled={isCreating || editingPath !== null}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(path.id)}
                              disabled={isCreating || editingPath !== null}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}