import { useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Home, Settings } from "lucide-react";
import { GenericConfigManager } from "@/components/GenericConfigManager";
import { Overview } from "@/components/Overview";
import { configTypes } from "@/config/index";
import { FeatureStatus } from "@/services/featureDetection";

type ActiveView = 'overview' | 'claude-code' | 'claude-router';

interface MainContentProps {
  activeView: ActiveView;
  apiKeyManagerRef?: React.RefObject<any>;
  onNavigate?: (view: ActiveView) => void;
  installedFeatures?: FeatureStatus[];
  onFeatureInstalled?: () => void;
  onOpenCreateDialog?: () => void;
}

export function MainContent({ activeView, apiKeyManagerRef, onNavigate, installedFeatures = [], onFeatureInstalled, onOpenCreateDialog }: MainContentProps) {
  const configManagerRefs = useRef<Record<string, React.RefObject<any>>>({});
  
  const updateTitle = (title: string) => {
    const titleElement = document.getElementById('main-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  };

  useEffect(() => {
    switch (activeView) {
      case 'claude-code':
        updateTitle('Claude Code API 密钥管理');
        break;
      case 'claude-router':
        updateTitle('Claude Code Router');
        break;
      default:
        updateTitle('概览');
    }
  }, [activeView]);
  const renderContent = () => {
    const configType = configTypes.find(ct => ct.id === activeView);
    
    if (configType) {
      // 如果有自定义页面组件，优先使用
      if (configType.customPageComponent) {
        const CustomPageComponent = configType.customPageComponent;
        return <CustomPageComponent 
          ref={activeView === 'claude-code' ? apiKeyManagerRef : configManagerRefs.current[activeView]}
          onOpenCreateDialog={onOpenCreateDialog}
        />;
      }
      
      return (
        <GenericConfigManager
          ref={activeView === 'claude-code' ? apiKeyManagerRef : configManagerRefs.current[activeView]}
          configType={configType}
          onOpenCreateDialog={() => {}}
          onViewConfig={() => {}}
          onBackup={() => {}}
          onRestore={() => {}}
          onOpenAdvancedEdit={() => {}}
        />
      );
    }
    
    switch (activeView) {
      default:
        return <Overview 
          onNavigate={onNavigate || (() => {})} 
          installedFeatures={installedFeatures}
          onFeatureInstalled={onFeatureInstalled}
        />;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}