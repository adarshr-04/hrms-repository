import api from '@/lib/api';

export interface TaskLog {
  id?: number | string;
  date: string;
  task_description: string;
  status: string;
  owner: string;
  remarks?: string;
}

export interface ProjectAssignmentPayload {
  employee: number | string;
  project: number | string;
  role: string;
  assigned_date: string;
  end_date?: string | null;
  hours_worked?: number;
}

export const projectService = {
  getProjects: async (params?: { status?: string; search?: string }) => {
    const response = await api.get('/projects/projects/', { params });
    return response.data;
  },

  createProject: async (data: any) => {
    const response = await api.post('/projects/projects/', data);
    return response.data;
  },

  getTaskLogs: async () => {
    const response = await api.get('/projects/task-logs/');
    return response.data;
  },

  getAssignments: async (params?: { employee?: number | string; project?: number | string }) => {
    const response = await api.get('/projects/assignments/', { params });
    return response.data;
  },

  createAssignment: async (data: ProjectAssignmentPayload) => {
    const response = await api.post('/projects/assignments/', data);
    return response.data;
  },

  createTaskLog: async (data: TaskLog) => {
    const response = await api.post('/projects/task-logs/', data);
    return response.data;
  },

  updateTaskLog: async (id: number | string, data: Partial<TaskLog>) => {
    const response = await api.patch(`/projects/task-logs/${id}/`, data);
    return response.data;
  },

  deleteTaskLog: async (id: number | string) => {
    const response = await api.delete(`/projects/task-logs/${id}/`);
    return response.data;
  },
};
