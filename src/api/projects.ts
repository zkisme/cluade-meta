import { invoke } from '@tauri-apps/api/core';
import type { Project, CreateProjectRequest, UpdateProjectRequest, ScanOptions } from '../types/project';

export const projectsApi = {
  // Scan projects and save to database
  async scanAndSaveProjects(path: string, options: ScanOptions): Promise<Project[]> {
    return await invoke('scan_and_save_projects', { path, options });
  },

  // Get all projects
  async getProjects(): Promise<Project[]> {
    return await invoke('get_projects');
  },

  // Get project by ID
  async getProjectById(id: string): Promise<Project | null> {
    return await invoke('get_project_by_id', { id });
  },

  // Create new project
  async createProject(project: CreateProjectRequest): Promise<Project> {
    return await invoke('create_project', { request: project });
  },

  // Update project
  async updateProject(id: string, project: UpdateProjectRequest): Promise<Project | null> {
    return await invoke('update_project', { id, request: project });
  },

  // Delete project
  async deleteProject(id: string): Promise<boolean> {
    return await invoke('delete_project', { id });
  },

  // Get projects by category
  async getProjectsByCategory(category: string): Promise<Project[]> {
    return await invoke('get_projects_by_category', { category });
  },

  // Clear all projects
  async clearAllProjects(): Promise<number> {
    return await invoke('clear_all_projects');
  }
};