import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API Endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const dashboardAPI = {
  getAnalytics: () => api.get('/reports/dashboard'),
};

export const projectAPI = {
  getAll: () => api.get('/projects'),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getMyTeamProjects: () => api.get('/projects/my-team-projects'),
  getMyProjectFinancials: () => api.get('/projects/my-project-financials'),
};

export const taskAPI = {
  getAll: () => api.get('/tasks'),
  getOne: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/tasks/${id}/status`, { status }),
  updateProgress: (id: string, data: { progress: number; note?: string; status?: string }) =>
    api.patch(`/tasks/${id}/progress`, data),
  addComment: (id: string, text: string) =>
    api.post(`/tasks/${id}/comments`, { text }),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

export const incomeAPI = {
  getAll: (params?: any) => api.get('/income', { params }),
  create: (data: any) => api.post('/income', data),
  update: (id: string, data: any) => api.put(`/income/${id}`, data),
  delete: (id: string) => api.delete(`/income/${id}`),
};

export const expenseAPI = {
  getAll: (params?: any) => api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

export const clientAPI = {
  getAll: () => api.get('/clients'),
  getOne: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  addFollowUp: (id: string, data: any) =>
    api.post(`/clients/${id}/followups`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

export const payoutAPI = {
  getAll: (params?: any) => api.get('/payouts', { params }),
  getMy: () => api.get('/payouts/me'),
  updateStatus: (id: string, data: any) =>
    api.patch(`/payouts/${id}/status`, data),
};

export const userAPI = {
  getAll: () => api.get('/users'),
  getOne: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const teamAPI = {
  getAll: () => api.get('/teams'),
  create: (data: any) => api.post('/teams', data),
  update: (id: string, data: any) => api.put(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
};

export const roleAPI = {
  getAll: () => api.get('/roles'),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

export const productAPI = {
  getAll: () => api.get('/products'),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const salesAPI = {
  getAll: () => api.get('/sales'),
  create: (data: any) => api.post('/sales', data),
  update: (id: string, data: any) => api.put(`/sales/${id}`, data),
  delete: (id: string) => api.delete(`/sales/${id}`),
};

export const payrollAPI = {
  getAll: (params?: any) => api.get('/payroll', { params }),
  getSummary: (month: string) => api.get(`/payroll/summary/${month}`),
  create: (data: any) => api.post('/payroll', data),
  update: (id: string, data: any) => api.put(`/payroll/${id}`, data),
  markPaid: (id: string, data: any) => api.patch(`/payroll/${id}/pay`, data),
  delete: (id: string) => api.delete(`/payroll/${id}`),
};

export const advancePaymentAPI = {
  getAll: () => api.get('/advance-payments'),
  getMyRequests: () => api.get('/advance-payments/my-requests'),
  create: (data: any) => api.post('/advance-payments', data),
  updateStatus: (id: string, data: { status: string; reviewNotes?: string }) => 
    api.patch(`/advance-payments/${id}/status`, data),
  getStats: () => api.get('/advance-payments/stats'),
};

export const teamMemberFinanceAPI = {
  addProjectIncome: (data: any) => api.post('/team-member-finance/project-income', data),
  addProjectExpense: (data: any) => api.post('/team-member-finance/project-expense', data),
  getMyProjects: () => api.get('/team-member-finance/my-projects'),
  getMyIncomeHistory: (params?: any) => api.get('/team-member-finance/my-income-history', { params }),
  getMyExpenseHistory: (params?: any) => api.get('/team-member-finance/my-expense-history', { params }),
};

export const financeAPI = {
  getTeamSummary: (params?: any) => api.get('/finance/team-summary', { params }),
  getProjectSummary: (params?: any) => api.get('/finance/project-summary', { params }),
  updateTeamBudget: (teamId: string, data: any) => api.put(`/finance/team/${teamId}/budget`, data),
  resetBudgets: (month: string) => api.post('/finance/reset-budgets', { month }),
};

export const reportAPI = {
  getTeamReport: (teamId: string, month: string) => 
    api.get(`/reports/team/${teamId}/${month}`, { responseType: 'blob' }),
};

export const userHistoryAPI = {
  getUserHistory: (userId: string, params?: any) => api.get(`/users/${userId}/history`, { params }),
  getUserPerformance: (userId: string, params?: any) => api.get(`/users/${userId}/performance`, { params }),
};

export const teamBudgetAPI = {
  getTeamBudget: (teamId: string) => api.get(`/teams/${teamId}/budget`),
  updateMemberBudget: (teamId: string, memberId: string, data: any) => 
    api.put(`/teams/${teamId}/member-budget/${memberId}`, data),
  resetBudgets: (teamId: string) => api.post(`/teams/${teamId}/reset-budgets`),
  getBudgetStatus: (teamId: string, memberId: string, amount: number) => 
    api.get(`/teams/${teamId}/member/${memberId}/budget-status`, { params: { amount } }),
};

export const enhancedTaskAPI = {
  getTasksByTeam: (teamId: string, params?: any) => api.get(`/tasks/team/${teamId}`, { params }),
  getTasksByUser: (userId: string, params?: any) => api.get(`/tasks/user/${userId}`, { params }),
  createTask: (data: any) => api.post('/tasks', data),
  updateTaskStatus: (taskId: string, status: string) => api.patch(`/tasks/${taskId}/status`, { status }),
  updateTaskProgress: (taskId: string, progress: number) => api.patch(`/tasks/${taskId}/progress`, { progress }),
  addTaskComment: (taskId: string, text: string) => api.post(`/tasks/${taskId}/comments`, { text }),
  getTaskAnalytics: (teamId: string, params?: any) => api.get(`/tasks/analytics/${teamId}`, { params }),
};

export const enhancedExpenseAPI = {
  getExpensesByTeam: (teamId: string, params?: any) => api.get(`/expenses/team/${teamId}`, { params }),
  getExpensesByUser: (userId: string, params?: any) => api.get(`/expenses/user/${userId}`, { params }),
  createExpense: (data: any) => api.post('/expenses', data),
  approveExpense: (expenseId: string, status: string) => api.patch(`/expenses/${expenseId}/approve`, { status }),
  getExpenseAnalytics: (teamId: string, params?: any) => api.get(`/expenses/analytics/${teamId}`, { params }),
};

export const budgetAPI = {
  getBudgetWarnings: () => api.get('/finance/budget-warnings'),
  getProjectSummary: (projectId: string) => api.get(`/finance/project-summary/${projectId}`),
};

export const teamPerformanceAPI = {
  getTeamSummary: (teamId: string, params?: any) => api.get(`/teams/${teamId}/summary`, { params }),
  getTeamAnalytics: (teamId: string, params?: any) => api.get(`/teams/${teamId}/analytics`, { params }),
};

export const dataManagementAPI = {
  getStats: () => api.get('/data/stats'),
  exportData: () => api.get('/data/export', { responseType: 'blob' }),
  exportProjectExcel: (projectId: string) => api.get(`/data/export/project/${projectId}/excel`, { responseType: 'blob' }),
  exportProjectPDF: (projectId: string) => api.get(`/data/export/project/${projectId}/pdf`, { responseType: 'blob' }),
  clearData: () => api.delete('/data/clear'),
  importData: (formData: FormData) => api.post('/data/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

