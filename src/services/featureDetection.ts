import { invoke } from '@tauri-apps/api/core';

export interface FeatureStatus {
  feature_id: string;
  is_installed: boolean;
  installation_path?: string;
  description: string;
  can_install: boolean;
}

export class FeatureDetectionService {
  private static instance: FeatureDetectionService;
  private featureStatusCache: Map<string, FeatureStatus> = new Map();
  private lastCheckTime: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private constructor() {}

  public static getInstance(): FeatureDetectionService {
    if (!FeatureDetectionService.instance) {
      FeatureDetectionService.instance = new FeatureDetectionService();
    }
    return FeatureDetectionService.instance;
  }

  /**
   * Check the status of all features
   */
  public async checkAllFeatures(forceRefresh = false): Promise<FeatureStatus[]> {
    const now = Date.now();
    
    // Use cache if it's still valid and not forced refresh
    if (!forceRefresh && (now - this.lastCheckTime) < this.CACHE_DURATION && this.featureStatusCache.size > 0) {
      return Array.from(this.featureStatusCache.values());
    }

    try {
      const features: FeatureStatus[] = await invoke('check_feature_status');
      
      // Update cache
      this.featureStatusCache.clear();
      features.forEach(feature => {
        this.featureStatusCache.set(feature.feature_id, feature);
      });
      this.lastCheckTime = now;

      return features;
    } catch (error) {
      console.error('Failed to check feature status:', error);
      throw new Error('Failed to check feature status');
    }
  }

  /**
   * Check if a specific feature is installed
   */
  public async isFeatureInstalled(featureId: string, forceRefresh = false): Promise<boolean> {
    const features = await this.checkAllFeatures(forceRefresh);
    const feature = features.find(f => f.feature_id === featureId);
    return feature?.is_installed ?? false;
  }

  /**
   * Get installed features only
   */
  public async getInstalledFeatures(forceRefresh = false): Promise<FeatureStatus[]> {
    const features = await this.checkAllFeatures(forceRefresh);
    return features.filter(feature => feature.is_installed);
  }

  /**
   * Get installable features that are not yet installed
   */
  public async getInstallableFeatures(forceRefresh = false): Promise<FeatureStatus[]> {
    const features = await this.checkAllFeatures(forceRefresh);
    return features.filter(feature => !feature.is_installed && feature.can_install);
  }

  /**
   * Install a feature
   */
  public async installFeature(featureId: string): Promise<boolean> {
    try {
      const success: boolean = await invoke('install_feature', { featureId });
      
      if (success) {
        // Invalidate cache to force refresh on next check
        this.featureStatusCache.clear();
        this.lastCheckTime = 0;
      }
      
      return success;
    } catch (error) {
      console.error(`Failed to install feature ${featureId}:`, error);
      throw new Error(`Failed to install feature: ${featureId}`);
    }
  }

  /**
   * Get feature status from cache (faster, but may be outdated)
   */
  public getFeatureFromCache(featureId: string): FeatureStatus | undefined {
    return this.featureStatusCache.get(featureId);
  }

  /**
   * Clear the feature status cache
   */
  public clearCache(): void {
    this.featureStatusCache.clear();
    this.lastCheckTime = 0;
  }

  /**
   * Get features sorted by priority (installed first, then installable)
   */
  public async getFeaturesSortedByPriority(forceRefresh = false): Promise<FeatureStatus[]> {
    const features = await this.checkAllFeatures(forceRefresh);
    
    return features.sort((a, b) => {
      // Installed features first
      if (a.is_installed && !b.is_installed) return -1;
      if (!a.is_installed && b.is_installed) return 1;
      
      // Among installed features, sort alphabetically
      if (a.is_installed && b.is_installed) {
        return a.feature_id.localeCompare(b.feature_id);
      }
      
      // Among uninstalled features, installable ones first
      if (a.can_install && !b.can_install) return -1;
      if (!a.can_install && b.can_install) return 1;
      
      // Finally, sort alphabetically
      return a.feature_id.localeCompare(b.feature_id);
    });
  }
}

// Export singleton instance
export const featureDetection = FeatureDetectionService.getInstance();