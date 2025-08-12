import { useState } from "react";
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
    setFormData(configType.defaultData);
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? `编辑${configType.displayName}` : `创建${configType.displayName}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="请输入名称"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">配置密钥</label>
            <div className="mt-2 p-4 border border-border rounded-md bg-muted/50">
              <configType.formComponent
                data={formData}
                onChange={setFormData}
                isNew={!editingItem}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="请输入描述（可选）"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? "更新" : "创建"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}