import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScanOptions } from "@/types/project";

interface ProjectScanSettingsProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  scanOptions: ScanOptions;
  onScanOptionsChange: (options: ScanOptions) => void;
}

export function ProjectScanSettings({
  isOpen,
  onOpenChange,
  scanOptions,
  onScanOptionsChange,
}: ProjectScanSettingsProps) {
  const handleMarkerFilesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onScanOptionsChange({
      ...scanOptions,
      marker_files: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
    });
  };

  const handleIgnorePatternsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onScanOptionsChange({
      ...scanOptions,
      ignore_patterns: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
    });
  };

  const handleMaxDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onScanOptionsChange({
      ...scanOptions,
      max_depth: parseInt(e.target.value, 10) || 0,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>扫描选项配置</SheetTitle>
          <SheetDescription>
            在这里配置项目扫描的参数，修改后将自动保存。
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4 px-6">
          <div className="grid grid-cols-10 items-center gap-4">
            <Label htmlFor="marker-files" className="col-span-3 text-right">
              标识文件名
            </Label>
            <Textarea
              id="marker-files"
              value={scanOptions.marker_files.join("\n")}
              onChange={handleMarkerFilesChange}
              className="col-span-7"
              placeholder="例如: package.json,index.html"
            />
          </div>
          <div className="grid grid-cols-10 items-center gap-4">
            <Label htmlFor="ignore-patterns" className="col-span-3 text-right">
              忽略的文件夹
            </Label>
            <Textarea
              id="ignore-patterns"
              value={scanOptions.ignore_patterns.join("\n")}
              onChange={handleIgnorePatternsChange}
              className="col-span-7"
              placeholder="例如: .git,node_modules"
            />
          </div>
          <div className="grid grid-cols-10 items-center gap-4">
            <Label htmlFor="max-depth" className="col-span-3 text-right">
              最大扫描深度
            </Label>
            <Input
              id="max-depth"
              type="number"
              value={scanOptions.max_depth}
              onChange={handleMaxDepthChange}
              className="col-span-7"
            />
          </div>
        </div>
        <SheetFooter>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
