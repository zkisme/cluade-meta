import { useState, useEffect } from "react";
// Helper function to safely invoke Tauri commands
const invokeTauri = async <T,>(command: string, args?: any): Promise<T> => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(command, args);
  } catch (importError) {
    console.warn(`Failed to import Tauri API:`, importError);
    throw new Error('Tauri environment not available');
  }
};

// Helper function to check if we're in Tauri environment
const isTauriEnvironment = async (): Promise<boolean> => {
  console.log("🔍 [DEBUG] ConfigEditor isTauriEnvironment被调用");
  try {
    console.log("🔍 [DEBUG] ConfigEditor 尝试导入isTauri函数");
    // Use the official Tauri v2 isTauri() function
    const { isTauri } = await import('@tauri-apps/api/core');
    console.log("🔍 [DEBUG] ConfigEditor 成功导入isTauri函数");
    const result = isTauri();
    console.log("🔍 [DEBUG] ConfigEditor isTauri()结果:", result);
    return result;
  } catch (error) {
    console.log("🔍 [DEBUG] ConfigEditor isTauri()失败，尝试fallback:", error);
    // Fallback: check if we can access Tauri APIs
    try {
      console.log("🔍 [DEBUG] ConfigEditor 尝试导入@tauri-apps/api/core");
      await import('@tauri-apps/api/core');
      console.log("🔍 [DEBUG] ConfigEditor 成功导入@tauri-apps/api/core，返回true");
      return true;
    } catch (importError) {
      console.log("🔍 [DEBUG] ConfigEditor 导入@tauri-apps/api/core失败:", importError);
      return false;
    }
  }
};
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Editor } from "@monaco-editor/react";
import { Save, FileJson, AlertTriangle, CheckCircle } from "lucide-react";

interface ConfigEditorProps {
  onConfigSaved?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ConfigEditor({ onConfigSaved, open, onOpenChange }: ConfigEditorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // 支持外部控制
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const [configContent, setConfigContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isValidJson, setIsValidJson] = useState(true);
  const [validationError, setValidationError] = useState("");

  const loadConfigContent = async () => {
    console.log("🔍 [DEBUG] ConfigEditor loadConfigContent被调用");
    try {
      // Check if we're in browser environment first
      console.log("🔍 [DEBUG] ConfigEditor检查Tauri环境...");
      const isTauri = await isTauriEnvironment();
      console.log("🔍 [DEBUG] ConfigEditor isTauri结果:", isTauri);
      if (!isTauri) {
        console.log('🔍 [DEBUG] ConfigEditor 浏览器环境检测到，跳过Tauri API调用');
        setConfigContent("{}");
        setOriginalContent("{}");
        return;
      }
      
      console.log("🔍 [DEBUG] ConfigEditor 调用get_config_file_content命令");
      const content = await invokeTauri<string>("get_config_file_content");
      console.log("🔍 [DEBUG] ConfigEditor 成功获取配置内容，长度:", content?.length);
      setConfigContent(content);
      setOriginalContent(content);
      setHasChanges(false);
      setIsValidJson(true);
      setValidationError("");
    } catch (error) {
      console.error("🔍 [DEBUG] ConfigEditor 加载配置内容失败:", error);
      setConfigContent("{}");
      setOriginalContent("{}");
    }
  };

  useEffect(() => {
    console.log("🔍 [DEBUG] ConfigEditor isOpen状态变化:", isOpen);
    if (isOpen) {
      console.log("🔍 [DEBUG] ConfigEditor开始加载配置内容");
      loadConfigContent();
    }
  }, [isOpen]);

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || "";
    setConfigContent(newContent);
    
    // 检查是否有变化
    setHasChanges(newContent !== originalContent);
    
    // 验证JSON格式
    try {
      JSON.parse(newContent);
      setIsValidJson(true);
      setValidationError("");
    } catch (error) {
      setIsValidJson(false);
      setValidationError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const handleSave = async () => {
    if (!isValidJson) return;
    
    setIsSaving(true);
    try {
      // Check if we're in browser environment first
      const isTauri = await isTauriEnvironment();
      if (!isTauri) {
        console.log('Browser environment detected, skipping Tauri API calls');
        setValidationError("浏览器环境：无法保存配置文件");
        return;
      }
      
      await invokeTauri<boolean>("save_config_file_content", { content: configContent });
      setOriginalContent(configContent);
      setHasChanges(false);
      onConfigSaved?.();
    } catch (error) {
      console.error("Failed to save config:", error);
      setValidationError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(configContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setConfigContent(formatted);
      setHasChanges(formatted !== originalContent);
      setIsValidJson(true);
      setValidationError("");
    } catch (error) {
      console.error("Failed to format JSON:", error);
    }
  };

  const handleReset = () => {
    setConfigContent(originalContent);
    setHasChanges(false);
    setIsValidJson(true);
    setValidationError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle>配置文件高级编辑器</DialogTitle>
              <DialogDescription>
                直接编辑Claude API密钥的JSON配置文件
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isValidJson ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  JSON格式正确
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  JSON格式错误
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* 工具栏 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 bg-muted rounded-md">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="default"
                onClick={handleFormatJson}
                disabled={!isValidJson}
              >
                <FileJson className="mr-2 h-4 w-4" />
                格式化
              </Button>
              
              {hasChanges && (
                <Button variant="outline" size="default" onClick={handleReset}>
                  重置
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {hasChanges ? "有未保存的更改" : "已保存"}
              </span>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || !isValidJson || isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>

          {/* 错误信息 */}
          {validationError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{validationError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 编辑器 */}
          <div className="border rounded-md" style={{ height: '60vh' }}>
            <Editor
              height="100%"
              defaultLanguage="json"
              value={configContent}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: false,
                scrollBeyondLastLine: true,
                automaticLayout: true,
                wordWrap: "on",
                folding: true,
                showFoldingControls: "always",
                formatOnPaste: true,
                formatOnType: true,
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
              }}
            />
          </div>

          </div>
      </DialogContent>
    </Dialog>
  );
}