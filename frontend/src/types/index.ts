export type UserRole = 'ADMIN' | 'HR' | 'DEPT_MANAGER' | 'EMPLOYEE' | 'SUPER_ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department?: string;
  employee_id?: string;
  employee_profile_id?: number;
}

export interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  designation?: number;
  designation_name?: string;
  department?: number;
  department_name?: string;
  branch?: number;
  branch_name?: string;
  manager?: number;
  manager_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  hire_date?: string;
  avatar?: string;
  alternative_email?: string;
  alternative_phone_number?: string;
  current_address?: string;
  permanent_address?: string;
  end_date?: string;
}

export interface Department {
  id: number;
  department_name: string;
  description?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
