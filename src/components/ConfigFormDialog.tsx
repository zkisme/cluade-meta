import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfigItem, CreateConfigRequest, UpdateConfigRequest, ConfigType } from "@/types/config";

interface ConfigFormDialogProps<T = any> {
  configType: ConfigType<T>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ConfigItem<T> | null;
  onSave: (request: CreateConfigRequest<T> | { id: string; request: UpdateConfigRequest<T> }) => void;
}

export function ConfigFormDialog<T = any>({
  configType,
  open,
  onOpenChange,
  editingItem,
  onSave,
}: ConfigFormDialogProps<T>) {
  const [formData, setFormData] = useState<T>(editingItem?.data || configType.defaultData);
  const [name, setName] = useState(editingItem?.name || "");
  const [description, setDescription] = useState(editingItem?.description || "");

  // 当editingItem改变时，更新表单数据
  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem.data);
      setName(editingItem.name);
      setDescription(editingItem.description || "");
    } else {
      setFormData(configType.defaultData);
      setName("");
      setDescription("");
    }
  }, [editingItem, configType.defaultData]);

  const handleSave = () => {
    if (!name.trim()) {
      alert("请输入名称");
      return;
    }

    if (editingItem) {
      const request: UpdateConfigRequest<T> = {
        name: name.trim(),
        data: formData,
        description: description.trim() || undefined,
      };
      onSave({ id: editingItem.id, request });
    } else {
      const request: CreateConfigRequest<T> = {
        name: name.trim(),
        data: formData,
        description: description.trim() || undefined,
      };
      onSave(request);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // 状态重置由useEffect处理，当editingItem变为null时会自动重置
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/50">
          <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <configType.icon className="h-4 w-4 text-primary" />
            {editingItem ? `编辑${configType.displayName}` : `创建${configType.displayName}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-sm"
              placeholder="请输入名称"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">配置密钥</label>
            <div className="p-4 border border-border rounded-md bg-muted/30">
              <configType.formComponent
                data={formData}
                onChange={setFormData}
                isNew={!editingItem}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background resize-none text-sm"
              placeholder="请输入描述（可选）"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border/50">
            <Button 
              variant="outline" 
              onClick={handleClose}
              size="sm"
              className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:bg-muted/80"
            >
              取消
            </Button>
            <Button 
              onClick={handleSave}
              size="sm"
              className="px-4 py-2 rounded-md font-medium bg-primary hover:bg-primary/90 transition-all duration-200"
            >
              {editingItem ? "更新" : "创建"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}