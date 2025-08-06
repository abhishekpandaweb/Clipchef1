export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'starter' | 'pro';
  createdAt: Date;
}

export interface VideoFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  duration: number;
  format: string;
  thumbnail: string;
  url: string;
  uploadedAt: Date;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  videoCount: number;
  clipsGenerated: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
  userId: string;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  speed: number;
  timeRemaining: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface Theme {
  mode: 'light' | 'dark' | 'system';
}