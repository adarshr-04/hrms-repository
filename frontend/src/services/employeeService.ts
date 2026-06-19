import api from '@/lib/api';

import { Employee, Department, PaginatedResponse } from '@/types';

export type EmployeeData = Omit<Employee, 'id' | 'department_name' | 'manager_name' | 'created_at' | 'updated_at'>;

export type ListResponse<T> = PaginatedResponse<T> | T[];

export const employeeService = {
  getAll: async (params?: any): Promise<ListResponse<Employee>> => {
    const response = await api.get('/employees/employees/', { params });
    return response.data;
  },

  getById: async (id: number | string): Promise<Employee> => {
    const response = await api.get(`/employees/employees/${id}/`);
    return response.data;
  },

  create: async (formData: FormData) => {
    // Axios will automatically set the correct multipart/form-data header and boundary
    const response = await api.post('/employees/employees/', formData);
    return response.data;
  },

  update: async (id: number | string, formData: FormData) => {
    const response = await api.patch(`/employees/employees/${id}/`, formData);
    return response.data;
  },

  delete: async (id: number | string) => {
    const response = await api.delete(`/employees/employees/${id}/`);
    return response.data;
  },

  getDepartments: async (): Promise<Department[]> => {
    const response = await api.get('/employees/departments/');
    return response.data;
  },

  createDepartment: async (data: { department_name: string; description?: string }) => {
    const response = await api.post('/employees/departments/', data);
    return response.data;
  },

  updateDepartment: async (id: number | string, data: { department_name: string; description?: string }) => {
    const response = await api.put(`/employees/departments/${id}/`, data);
    return response.data;
  },

  deleteDepartment: async (id: number | string) => {
    const response = await api.delete(`/employees/departments/${id}/`);
    return response.data;
  },

  getBranches: async (): Promise<any[]> => {
    const response = await api.get('/employees/branches/');
    return response.data;
  },

  createBranch: async (data: { name: string; address?: string }) => {
    const response = await api.post('/employees/branches/', data);
    return response.data;
  },

  updateBranch: async (id: number | string, data: { name: string; address?: string }) => {
    const response = await api.put(`/employees/branches/${id}/`, data);
    return response.data;
  },

  deleteBranch: async (id: number | string) => {
    const response = await api.delete(`/employees/branches/${id}/`);
    return response.data;
  },

  getDesignations: async (): Promise<any[]> => {
    const response = await api.get('/employees/designations/');
    return response.data;
  },

  createDesignation: async (data: { title: string }) => {
    const response = await api.post('/employees/designations/', data);
    return response.data;
  },

  updateDesignation: async (id: number | string, data: { title: string }) => {
    const response = await api.put(`/employees/designations/${id}/`, data);
    return response.data;
  },

  deleteDesignation: async (id: number | string) => {
    const response = await api.delete(`/employees/designations/${id}/`);
    return response.data;
  },

  bulkImport: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/employees/employees/bulk-import/', formData);
    return response.data;
  },
};
