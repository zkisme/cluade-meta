import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Editor } from "@monaco-editor/react";
import { Settings, Save, Download, Upload, FileJson, AlertTriangle, CheckCircle } from "lucide-react";

interface ConfigEditorProps {
  onConfigSaved?: () => void;
}

export function ConfigEditor({ onConfigSaved }: ConfigEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleDownload = () => {
    const blob = new Blob([configContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "claude-keys.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setConfigContent(content);
      setHasChanges(content !== originalContent);
      
      // 验证上传的JSON
      try {
        JSON.parse(content);
        setIsValidJson(true);
        setValidationError("");
      } catch (error) {
        setIsValidJson(false);
        setValidationError(error instanceof Error ? error.message : "Invalid JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setConfigContent(originalContent);
    setHasChanges(false);
    setIsValidJson(true);
    setValidationError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          高级
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
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

        <div className="flex-1 flex flex-col space-y-4">
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
                格式化JSON
              </Button>
              
              <label htmlFor="upload-config">
                <Button variant="outline" size="default" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    上传文件
                  </span>
                </Button>
              </label>
              <input
                id="upload-config"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleUpload}
              />
              
              <Button variant="outline" size="default" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                下载文件
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
          <div className="flex-1 border rounded-md overflow-hidden">
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
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                folding: true,
                showFoldingControls: "always",
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>

          {/* 帮助信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">配置文件格式说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>配置文件使用JSON格式，包含以下结构：</p>
                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`{
  "api_key_id": {
    "id": "api_key_id",
    "name": "密钥名称",
    "key": "sk-ant-api03-xxxxxxxx",
    "description": "描述信息",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}`}
                </pre>
                <p>• <code>id</code>: 唯一标识符，必须为UUID格式</p>
                <p>• <code>name</code>: 密钥名称，用于显示</p>
                <p>• <code>key</code>: Claude API密钥</p>
                <p>• <code>description</code>: 可选的描述信息</p>
                <p>• <code>created_at</code>/<code>updated_at</code>: ISO格式时间戳</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}