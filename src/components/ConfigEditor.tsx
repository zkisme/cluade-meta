import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
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
    try {
      const content = await invoke<string>("get_config_file_content");
      setConfigContent(content);
      setOriginalContent(content);
      setHasChanges(false);
      setIsValidJson(true);
      setValidationError("");
    } catch (error) {
      console.error("Failed to load config content:", error);
      setConfigContent("{}");
      setOriginalContent("{}");
    }
  };

  useEffect(() => {
    if (isOpen) {
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
      await invoke<boolean>("save_config_file_content", { content: configContent });
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