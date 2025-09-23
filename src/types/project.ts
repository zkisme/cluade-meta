export interface Project {
  id: string;
  name: string;
  path: string;
  category: string;
  frameworks: string[];
  project_type: string;
  description?: string;
  scan_time: string;
  created_at: string;
  updated_at: string;
}

export interface ScanOptions {
  marker_files: string[];
  ignore_patterns: string[];
  max_depth: number;
}

export interface CustomCategory {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  path: string;
  category: string;
  frameworks: string[];
  project_type: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  path?: string;
  category?: string;
  frameworks?: string[];
  project_type?: string;
  description?: string;
}
