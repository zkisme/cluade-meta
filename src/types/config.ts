export interface ConfigItem<T = any> {
  id: string;
  name: string;
  data: T;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConfigRequest<T = any> {
  name: string;
  data: T;
  description?: string;
}

export interface UpdateConfigRequest<T = any> {
  name?: string;
  data?: T;
  description?: string;
}

export interface ConfigType<T = any> {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: React.ComponentType<any>;
  defaultData: T;
  formComponent: React.ComponentType<{
    data: T;
    onChange: (data: T) => void;
    isNew?: boolean;
  }>;
  listComponent: React.ComponentType<{
    item: ConfigItem<T>;
    isActive: boolean;
    onToggleActive: (id: string) => void;
    onEdit: (item: ConfigItem<T>) => void;
    onDelete: (id: string) => void;
  }>;
  apiEndpoints: {
    create: string;
    list: string;
    update: string;
    delete: string;
    setActive?: string;
  };
  configPath?: string;
  onConfigUpdate?: (data: T, configPath: string) => Promise<void>;
}

export interface BackupFile {
  filename: string;
  path: string;
  size: number;
  created_at: string;
}

export interface ConfigManagerProps<T = any> {
  configType: ConfigType<T>;
  onOpenCreateDialog?: () => void;
  onViewConfig?: () => void;
  onBackup?: () => void;
  onRestore?: () => void;
  onOpenAdvancedEdit?: () => void;
}