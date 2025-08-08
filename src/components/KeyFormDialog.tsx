import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  description?: string;
  anthropic_base_url?: string;
  created_at: string;
  updated_at: string;
}

interface KeyFormData {
  name: string;
  anthropic_auth_token: string;
  description?: string;
  anthropic_base_url: string;
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  timeout: number;
  proxy_url: string;
  verbose: boolean;
  stream: boolean;
  unsafe_html: boolean;
}

interface KeyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingKey?: ApiKey | null;
  onKeySaved?: () => void;
}

export const KeyFormDialog = ({ open, onOpenChange, editingKey, onKeySaved }: KeyFormDialogProps) => {
  const [formData, setFormData] = useState<KeyFormData>({
    name: "",
    anthropic_auth_token: "",
    description: "",
    anthropic_base_url: "https://api.anthropic.com",
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 0.9,
    timeout: 30000,
    proxy_url: "",
    verbose: false,
    stream: true,
    unsafe_html: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens or editingKey changes
  useEffect(() => {
    if (open) {
      if (editingKey) {
        setFormData({
          name: editingKey.name,
          anthropic_auth_token: editingKey.key,
          description: editingKey.description,
          anthropic_base_url: editingKey.anthropic_base_url || "https://api.anthropic.com",
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          temperature: 0.7,
          top_p: 0.9,
          timeout: 30000,
          proxy_url: "",
          verbose: false,
          stream: true,
          unsafe_html: false
        });
      } else {
        setFormData({
          name: "",
          anthropic_auth_token: "",
          description: "",
          anthropic_base_url: "https://api.anthropic.com",
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          temperature: 0.7,
          top_p: 0.9,
          timeout: 30000,
          proxy_url: "",
          verbose: false,
          stream: true,
          unsafe_html: false
        });
      }
    }
  }, [open, editingKey]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.anthropic_auth_token) {
      toast.error("名称和ANTHROPIC_AUTH_TOKEN为必填项");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingKey) {
        // Update existing key
        await invoke<ApiKey>("update_api_key", {
          id: editingKey.id,
          request: {
            name: formData.name,
            key: formData.anthropic_auth_token,
            description: formData.description,
            anthropic_base_url: formData.anthropic_base_url
          }
        });
        toast.success("API密钥已成功更新");
      } else {
        // Create new key
        await invoke<ApiKey>("create_api_key", {
          request: {
            name: formData.name,
            key: formData.anthropic_auth_token,
            description: formData.description || "",
            anthropic_base_url: formData.anthropic_base_url
          }
        });
        toast.success("API密钥已成功创建");
      }
      
      onOpenChange(false);
      onKeySaved?.();
    } catch (error) {
      console.error("Failed to save API key:", error);
      toast.error(editingKey ? "更新API密钥失败，请重试" : "创建API密钥失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof KeyFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isEditMode = !!editingKey;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "编辑API密钥配置" : "添加新的API密钥配置"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改Claude API密钥的配置信息" : "创建一个新的Claude API密钥配置"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="输入配置名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">ANTHROPIC_AUTH_TOKEN *</label>
              <Input
                value={formData.anthropic_auth_token}
                onChange={(e) => handleInputChange("anthropic_auth_token", e.target.value)}
                placeholder="sk-ant-api03-..."
                type="password"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">ANTHROPIC_BASE_URL</label>
              <Input
                value={formData.anthropic_base_url}
                onChange={(e) => handleInputChange("anthropic_base_url", e.target.value)}
                placeholder="https://api.anthropic.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">备注说明</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="输入描述信息（可选）"
                className="min-h-[60px]"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit} 
              disabled={!formData.name || !formData.anthropic_auth_token || isSubmitting}
            >
              {isSubmitting ? "保存中..." : (isEditMode ? "更新配置" : "创建配置")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};