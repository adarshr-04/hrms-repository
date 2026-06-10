
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, 
  Users, 
  Calendar, 
  Clock, 
  Search,
  Filter,
  Plus,
  Loader2,
  ChevronRight,
  FolderDot,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectService } from '@/services/projectService';
import { employeeService } from '@/services/employeeService';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Employee } from '@/types';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const { user, isHR, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    project: '',
    employee: '',
    role: '',
    assigned_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [projectForm, setProjectForm] = useState({
    project_name: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    status: 'PLANNING',
    manager: '',
  });
  const canAssignProjects = isHR || isManager;

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectService.getProjects();
      setProjects(data.results || data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const fetchEmployees = useCallback(async () => {
    if (!canAssignProjects) return;

    try {
      const data = await employeeService.getAll();
      const list = Array.isArray(data) ? data : data.results;
      const assignableEmployees = isManager && !isHR
        ? list.filter((employee) => (
            employee.id === user?.employee_profile_id ||
            employee.manager === user?.employee_profile_id
          ))
        : list;

      setEmployees(assignableEmployees.filter((employee) => employee.status === 'ACTIVE'));
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  }, [canAssignProjects, isHR, isManager, user?.employee_profile_id]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  const openAssignModal = (projectId?: number | string) => {
    setAssignmentForm({
      project: projectId ? String(projectId) : '',
      employee: '',
      role: '',
      assigned_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setShowAssignModal(true);
  };

  const submitAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingAssignment(true);

    try {
      await projectService.createAssignment({
        project: assignmentForm.project,
        employee: assignmentForm.employee,
        role: assignmentForm.role,
        assigned_date: assignmentForm.assigned_date,
      });
      toast.success('Project assigned successfully');
      setShowAssignModal(false);
      await fetchProjects();
    } catch (error: any) {
      const message = error.response?.data?.detail
        || error.response?.data?.non_field_errors?.[0]
        || 'Could not assign this project';
      toast.error(message);
    } finally {
      setSavingAssignment(false);
    }
  };

  const submitProject = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProject(true);

    try {
      await projectService.createProject({
        project_name: projectForm.project_name,
        start_date: projectForm.start_date,
        end_date: projectForm.end_date || null,
        status: projectForm.status,
        manager: projectForm.manager || null,
      });
      toast.success('Project created successfully');
      setShowCreateModal(false);
      setProjectForm({
        project_name: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: '',
        status: 'PLANNING',
        manager: '',
      });
      await fetchProjects();
    } catch (error: any) {
      const message = error.response?.data?.detail
        || error.response?.data?.non_field_errors?.[0]
        || 'Could not create project';
      toast.error(message);
    } finally {
      setSavingProject(false);
    }
  };

  const getStatusColor = (status: any) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'ON_HOLD': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Management</h1>
          <p className="text-slate-500">Track initiatives and team allocations across the organization.</p>
        </div>
        {isHR && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-20 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p>Loading active initiatives...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full p-20 flex flex-col items-center justify-center text-slate-500 gap-4 text-center bg-white rounded-xl border border-slate-200">
            <FolderDot className="w-12 h-12 text-slate-300" />
            <div>
              <p className="text-lg font-bold text-slate-900">No projects found</p>
              <p className="text-sm max-w-xs mx-auto">Click &apos;Launch Project&apos; to start tracking your first organizational initiative.</p>
            </div>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border",
                    getStatusColor(project.status)
                  )}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{project.project_name}</h3>
                  {project.manager_name && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                      <span className="font-medium text-slate-400">Lead:</span>
                      <span className="font-semibold text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50">{project.manager_name}</span>
                    </div>
                  )}
                  {project.description && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(project.start_date), 'MMM d, yyyy')}</span>
                  </div>
                  {project.end_date && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{format(new Date(project.end_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-auto p-4 bg-slate-50 rounded-b-xl border-t border-slate-100 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1, 2, 3].slice(0, Math.min(project.assignment_count || 0, 3)).map(i => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                      U{i}
                    </div>
                  ))}
                  {(project.assignment_count || 0) > 3 && (
                    <div className="w-7 h-7 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                      +{project.assignment_count - 3}
                    </div>
                  )}
                </div>
                {(() => {
                  const isProjectManager = user?.employee_profile_id && project.manager === user.employee_profile_id;
                  const canAssignThisProject = isHR || isProjectManager;
                  if (canAssignThisProject) {
                    return (
                      <button
                        onClick={() => openAssignModal(project.id)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        Assign Team <ChevronRight className="w-3 h-3" />
                      </button>
                    );
                  }
                  return (
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      View Only
                    </span>
                  );
                })()}
              </div>
            </div>
          ))
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Assign Project</h2>
                <p className="text-sm text-slate-500">
                  {isManager && !isHR ? 'Assign work to your direct reports.' : 'Assign employees to active projects.'}
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitAssignment} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Project</label>
                <select
                  required
                  disabled={!!assignmentForm.project}
                  value={assignmentForm.project}
                  onChange={(event) => setAssignmentForm((form) => ({ ...form, project: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Employee</label>
                <select
                  required
                  value={assignmentForm.employee}
                  onChange={(event) => setAssignmentForm((form) => ({ ...form, employee: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name || ''} ({employee.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Project Role</label>
                <input
                  required
                  value={assignmentForm.role}
                  onChange={(event) => setAssignmentForm((form) => ({ ...form, role: event.target.value }))}
                  placeholder="Frontend Developer, QA Lead, Analyst..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Assigned Date</label>
                <input
                  required
                  type="date"
                  value={assignmentForm.assigned_date}
                  onChange={(event) => setAssignmentForm((form) => ({ ...form, assigned_date: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAssignment}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
                >
                  {savingAssignment && <Loader2 className="w-4 h-4 animate-spin" />}
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create Project</h2>
                <p className="text-sm text-slate-500">
                  Add a new organization initiative and assign its Project Lead.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitProject} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Project Name</label>
                <input
                  required
                  value={projectForm.project_name}
                  onChange={(event) => setProjectForm((form) => ({ ...form, project_name: event.target.value }))}
                  placeholder="e.g. Q3 Hiring Initiative, HRMS Integration..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Project Manager (Lead)</label>
                <select
                  required
                  value={projectForm.manager}
                  onChange={(event) => setProjectForm((form) => ({ ...form, manager: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select manager</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name || ''} ({employee.employee_id}) - {employee.job_title || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    required
                    type="date"
                    value={projectForm.start_date}
                    onChange={(event) => setProjectForm((form) => ({ ...form, start_date: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={projectForm.end_date}
                    onChange={(event) => setProjectForm((form) => ({ ...form, end_date: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                <select
                  required
                  value={projectForm.status}
                  onChange={(event) => setProjectForm((form) => ({ ...form, status: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProject}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
                >
                  {savingProject && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
