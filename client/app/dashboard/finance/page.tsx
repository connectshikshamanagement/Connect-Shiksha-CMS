'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { incomeAPI, expenseAPI, clientAPI, teamAPI, projectAPI, userAPI, financeAPI, payrollAPI, reportAPI, budgetAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { 
  FiPlus, FiTrendingUp, FiTrendingDown, FiDollarSign, FiEdit, FiTrash2, 
  FiCheck, FiX, FiUsers, FiFileText, FiDownload, FiAlertTriangle, 
  FiCreditCard, FiTarget, FiCalendar, FiFolder
} from 'react-icons/fi';

export default function FinancePage() {
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [teamFinancials, setTeamFinancials] = useState([]);
  const [projectFinancials, setProjectFinancials] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [incomeHistory, setIncomeHistory] = useState([]);
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [budgetWarnings, setBudgetWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'projects' | 'payroll' | 'history' | 'budget'>('overview');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal states
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    teamId: '',
    projectId: '',
    memberId: ''
  });

  // Form data
  const [incomeFormData, setIncomeFormData] = useState({
    sourceType: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'bank_transfer',
    transactionId: '',
    invoiceNumber: '',
    clientId: '',
    teamId: '',
    projectId: '',
    memberId: '',
  });

  const [expenseFormData, setExpenseFormData] = useState({
    category: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'bank_transfer',
    vendorName: '',
    billNumber: '',
    teamId: '',
    projectId: '',
    memberId: '',
  });

  const [payrollFormData, setPayrollFormData] = useState({
    userId: '',
    teamId: '',
    month: '',
    salaryAmount: 0,
    notes: '',
  });

  const [budgetFormData, setBudgetFormData] = useState({
    monthlyBudget: 0,
    creditLimit: 0,
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth, filters]);

  // Socket.io connection for real-time updates
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('finance-update', (data) => {
      console.log('Finance update received:', data);
      // Refresh data when finance updates are received
      fetchData();
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchData = async () => {
    try {
      // Build filter parameters
      const filterParams = {
        month: selectedMonth,
        ...(filters.teamId && { teamId: filters.teamId }),
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.memberId && { memberId: filters.memberId })
      };

      const [teamsRes, projectsRes, usersRes, teamFinancialsRes, projectFinancialsRes, payrollsRes, incomeRes, expenseRes, budgetWarningsRes] = await Promise.all([
        teamAPI.getAll(),
        projectAPI.getAll(),
        userAPI.getAll(),
        financeAPI.getTeamSummary(filterParams),
        financeAPI.getProjectSummary(filterParams),
        payrollAPI.getAll(filterParams),
        incomeAPI.getAll(),
        expenseAPI.getAll(),
        budgetAPI.getBudgetWarnings()
      ]);
      
      if (teamsRes.data.success) setTeams(teamsRes.data.data);
      if (projectsRes.data.success) setProjects(projectsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (teamFinancialsRes.data.success) setTeamFinancials(teamFinancialsRes.data.data);
      if (projectFinancialsRes.data.success) setProjectFinancials(projectFinancialsRes.data.data);
      if (payrollsRes.data.success) setPayrolls(payrollsRes.data.data);
      if (incomeRes.data.success) setIncomeHistory(incomeRes.data.data);
      if (expenseRes.data.success) setExpenseHistory(expenseRes.data.data);
      if (budgetWarningsRes.data.success) setBudgetWarnings(budgetWarningsRes.data.data);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incomeFormData.sourceType || incomeFormData.amount <= 0 || !incomeFormData.teamId || !incomeFormData.memberId) {
      showToast.error('Please fill in all required fields including team and member selection');
      return;
    }

    const loadingToast = showToast.loading(editingItem ? 'Updating income...' : 'Creating income...');

    try {
      // Clean the form data to handle empty clientId and convert projectId to sourceRefId/sourceRefModel
      const cleanedIncomeData = {
        ...incomeFormData,
        clientId: incomeFormData.clientId === '' ? undefined : incomeFormData.clientId,
        // Convert projectId to sourceRefId and sourceRefModel for proper linking
        sourceRefId: incomeFormData.projectId || undefined,
        sourceRefModel: incomeFormData.projectId ? 'Project' : undefined
      };
      
      // Remove projectId from the data as it's not part of the Income model
      delete (cleanedIncomeData as any).projectId;

      if (editingItem) {
        await incomeAPI.update(editingItem._id, cleanedIncomeData);
        showToast.success('Income updated successfully!');
      } else {
        await incomeAPI.create(cleanedIncomeData);
        showToast.success('Income created successfully! Profit-sharing computed automatically.');
      }
      
      showToast.dismiss(loadingToast);
      setShowIncomeModal(false);
      resetIncomeForm();
      fetchData();
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('finance-update', { 
          type: 'income', 
          teamId: cleanedIncomeData.teamId,
          projectId: cleanedIncomeData.projectId 
        });
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseFormData.category || expenseFormData.amount <= 0 || !expenseFormData.description || !expenseFormData.teamId || !expenseFormData.memberId) {
      showToast.error('Please fill in all required fields including team and member selection');
      return;
    }

    const loadingToast = showToast.loading(editingItem ? 'Updating expense...' : 'Creating expense...');

    try {
      if (editingItem) {
        await expenseAPI.update(editingItem._id, expenseFormData);
        showToast.success('Expense updated successfully!');
      } else {
        await expenseAPI.create(expenseFormData);
        showToast.success('Expense created successfully! Awaiting approval.');
      }
      
      showToast.dismiss(loadingToast);
      setShowExpenseModal(false);
      resetExpenseForm();
      fetchData();
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('finance-update', { 
          type: 'expense', 
          teamId: expenseFormData.teamId,
          projectId: expenseFormData.projectId 
        });
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handlePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payrollFormData.userId || !payrollFormData.teamId || !payrollFormData.month || payrollFormData.salaryAmount <= 0) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading(editingItem ? 'Updating payroll...' : 'Creating payroll...');

    try {
      if (editingItem) {
        await payrollAPI.update(editingItem._id, payrollFormData);
        showToast.success('Payroll updated successfully!');
      } else {
        await payrollAPI.create(payrollFormData);
        showToast.success('Payroll created successfully!');
      }
      
      showToast.dismiss(loadingToast);
      setShowPayrollModal(false);
      resetPayrollForm();
      fetchData();
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('finance-update', { 
          type: 'payroll', 
          teamId: payrollFormData.teamId
        });
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeam || !selectedTeam._id) {
      showToast.error('Please select a team first');
      return;
    }

    const loadingToast = showToast.loading('Updating team budget...');

    try {
      console.log('Updating budget for team:', selectedTeam._id, 'with data:', budgetFormData);
      await financeAPI.updateTeamBudget(selectedTeam._id, budgetFormData);
      showToast.dismiss(loadingToast);
      showToast.success('Team budget updated successfully!');
      setShowBudgetModal(false);
      fetchData();
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('finance-update', { 
          type: 'budget', 
          teamId: selectedTeam._id 
        });
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleMarkPayrollPaid = async (payrollId: string, paymentMethod: string, transactionId: string) => {
    const loadingToast = showToast.loading('Marking payroll as paid...');

    try {
      await payrollAPI.markPaid(payrollId, { paymentMethod, transactionId });
      showToast.dismiss(loadingToast);
      showToast.success('Payroll marked as paid successfully!');
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleGenerateReport = async (teamId: string, teamName: string) => {
    const loadingToast = showToast.loading('Generating report...');

    try {
      const response = await reportAPI.getTeamReport(teamId, selectedMonth);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `team-financial-report-${teamName}-${selectedMonth}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToast.dismiss(loadingToast);
      showToast.success('Report downloaded successfully!');
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to generate report');
    }
  };

  // Helper functions for cascading dropdowns
  const getProjectsByTeam = (teamId: string) => {
    return projects.filter((project: any) => {
      // Handle both populated and non-populated teamId
      const projectTeamId = project.teamId?._id || project.teamId;
      return projectTeamId?.toString() === teamId;
    });
  };

  const getUsersByTeam = (teamId: string) => {
    const team = teams.find((t: any) => t._id === teamId) as any;
    if (!team) return [];
    return users.filter((user: any) => team.members.includes(user._id));
  };

  // Filter handlers
  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      // Reset dependent filters when parent filter changes
      if (filterType === 'teamId') {
        newFilters.projectId = '';
        newFilters.memberId = '';
      } else if (filterType === 'projectId') {
        newFilters.memberId = '';
      }
      
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      teamId: '',
      projectId: '',
      memberId: ''
    });
  };

  const resetIncomeForm = () => {
    setIncomeFormData({
      sourceType: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: 'bank_transfer',
      transactionId: '',
      invoiceNumber: '',
      clientId: '',
      teamId: '',
      projectId: '',
      memberId: '',
    });
    setEditingItem(null);
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      category: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: 'bank_transfer',
      vendorName: '',
      billNumber: '',
      teamId: '',
      projectId: '',
      memberId: '',
    });
    setEditingItem(null);
  };

  const resetPayrollForm = () => {
    setPayrollFormData({
      userId: '',
      teamId: '',
      month: selectedMonth,
      salaryAmount: 0,
      notes: '',
    });
    setEditingItem(null);
  };

  const resetBudgetForm = () => {
    setBudgetFormData({
      monthlyBudget: 0,
      creditLimit: 0,
    });
    setSelectedTeam(null);
  };

  const handleOpenBudgetModal = (team: any) => {
    setSelectedTeam(team);
    setBudgetFormData({
      monthlyBudget: team.monthlyBudget || 0,
      creditLimit: team.creditLimit || 0,
    });
    setShowBudgetModal(true);
  };

  const totalIncome = teamFinancials.reduce((sum: number, team: any) => sum + team.totalIncome, 0);
  const totalExpenses = teamFinancials.reduce((sum: number, team: any) => sum + team.totalExpense, 0);
  const totalPayroll = teamFinancials.reduce((sum: number, team: any) => sum + team.totalPayroll, 0);
  const netProfit = totalIncome - totalExpenses - totalPayroll;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Finance" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading finance data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Finance" />

        <div className="p-4 md:p-8 pb-20 md:pb-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Financial Management</h2>
              <p className="mt-1 text-sm text-gray-600">Team-based financial control and reporting</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <FormInput
                label="Select Month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-auto"
              />
              <div className="flex gap-2">
                <Button onClick={() => { resetIncomeForm(); setShowIncomeModal(true); }} className="flex-1 sm:flex-none">
                  <FiPlus className="mr-2" />
                  Add Income
                </Button>
                <Button variant="danger" onClick={() => { resetExpenseForm(); setShowExpenseModal(true); }} className="flex-1 sm:flex-none">
                  <FiPlus className="mr-2" />
                  Add Expense
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormSelect
                label="Filter by Team"
                value={filters.teamId}
                onChange={(e) => handleFilterChange('teamId', e.target.value)}
                options={[
                  { value: '', label: 'All Teams' },
                  ...teams.map((team: any) => ({
                    value: team._id,
                    label: team.name,
                  }))
                ]}
              />
              
              <FormSelect
                label="Filter by Project"
                value={filters.projectId}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
                options={[
                  { value: '', label: 'All Projects' },
                  ...getProjectsByTeam(filters.teamId).map((project: any) => ({
                    value: project._id,
                    label: project.title,
                  }))
                ]}
                disabled={!filters.teamId}
              />
              
              <FormSelect
                label="Filter by Member"
                value={filters.memberId}
                onChange={(e) => handleFilterChange('memberId', e.target.value)}
                options={[
                  { value: '', label: 'All Members' },
                  ...getUsersByTeam(filters.teamId).map((user: any) => ({
                    value: user._id,
                    label: user.name,
                  }))
                ]}
                disabled={!filters.teamId}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Income</p>
                  <p className="mt-2 text-3xl font-bold">₹{totalIncome.toLocaleString()}</p>
                </div>
                <FiTrendingUp className="h-12 w-12 opacity-80" />
              </div>
            </div>

            <div className="rounded-lg bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Expenses</p>
                  <p className="mt-2 text-3xl font-bold">₹{totalExpenses.toLocaleString()}</p>
                </div>
                <FiTrendingDown className="h-12 w-12 opacity-80" />
              </div>
            </div>

            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Payroll</p>
                  <p className="mt-2 text-3xl font-bold">₹{totalPayroll.toLocaleString()}</p>
                </div>
                <FiCreditCard className="h-12 w-12 opacity-80" />
              </div>
            </div>

            <div className={`rounded-lg bg-gradient-to-br ${netProfit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-orange-500 to-orange-600'} p-6 text-white shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Net Profit</p>
                  <p className="mt-2 text-3xl font-bold">₹{netProfit.toLocaleString()}</p>
                </div>
                <FiDollarSign className="h-12 w-12 opacity-80" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {['overview', 'teams', 'projects', 'payroll', 'history', 'budget'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'overview' | 'teams' | 'projects' | 'payroll' | 'history' | 'budget')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors capitalize whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-primary-600 text-white shadow-md' 
                      : 'bg-white text-gray-700 shadow hover:bg-gray-50'
                  }`}
                >
                  {tab} {tab === 'teams' && `(${teamFinancials.length})`} {tab === 'budget' && `(${budgetWarnings.filter(w => w.warningLevel !== 'none').length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Team Performance Overview */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Team Performance Overview</h3>
                <div className="space-y-4">
                  {teamFinancials.map((team: any) => (
                    <div key={team.teamId} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{team.teamName}</h4>
                          <p className="text-sm text-gray-600">{team.category}</p>
                    </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">₹{team.netProfit.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Net Profit</p>
                  </div>
                </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span>Income: ₹{team.totalIncome.toLocaleString()}</span>
                        <span>Expenses: ₹{team.totalExpense.toLocaleString()}</span>
                        <span>Payroll: ₹{team.totalPayroll.toLocaleString()}</span>
              </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Status Overview */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Project Status Overview</h3>
                <div className="space-y-4">
                  {projects.length === 0 && (
                    <div className="text-center text-gray-500">No project data available</div>
                  )}
                  {projects.slice(0, 5).map((project: any) => (
                    <div key={project._id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{project.title}</h4>
                          <p className="text-sm text-gray-600">{project.category}</p>
                          <div className="mt-1 flex gap-4 text-xs">
                            <span className="text-blue-600">Income: ₹{project.totalIncome?.toLocaleString() || '0'}</span>
                            <span className="text-red-600">Expenses: ₹{project.totalExpense?.toLocaleString() || '0'}</span>
                            {(project.budget || 0) > 0 && (
                              <span className="text-gray-600">Budget: ₹{(project.budget || 0).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${(project.totalIncome || 0) - (project.totalExpense || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{((project.totalIncome || 0) - (project.totalExpense || 0)).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Net Profit</p>
                        </div>
                      </div>
                      {(project.budget || 0) > 0 && (project.totalExpense || 0) > (project.budget || 0) && (
                        <div className="mt-2 flex items-center text-sm text-red-600">
                          <FiAlertTriangle className="mr-1" />
                          Budget exceeded by ₹{((project.totalExpense || 0) - (project.budget || 0)).toLocaleString()}
                        </div>
                      )}
                      {(project.budget || 0) > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Budget Utilization</span>
                            <span>{project.budgetUtilization || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (project.totalExpense || 0) > project.budget 
                                  ? 'bg-red-500' 
                                  : (project.totalExpense || 0) > (project.budget * 0.8)
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.min(((project.totalExpense || 0) / project.budget) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {teamFinancials.map((team: any) => (
                <div key={team.teamId} className="rounded-lg bg-white p-6 shadow">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{team.teamName}</h3>
                      <p className="text-sm text-primary-600">{team.category}</p>
                      <p className="text-xs text-gray-500">{team.memberCount} members</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                        onClick={() => handleOpenBudgetModal(team)}
                        title="Edit Budget"
                          >
                        <FiEdit />
                          </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(team.teamId, team.teamName)}
                        title="Generate Report"
                      >
                        <FiDownload />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Monthly Budget:</span>
                      <span className="font-medium">₹{team.monthlyBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Income:</span>
                      <span className="font-medium text-green-600">₹{team.totalIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Expenses:</span>
                      <span className="font-medium text-red-600">₹{team.totalExpense.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Remaining Budget:</span>
                      <span className={`font-medium ${team.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{team.remainingBudget.toLocaleString()}
                      </span>
                    </div>
                    {team.creditUsed > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Credit Used:</span>
                        <span className="font-medium text-orange-600">₹{team.creditUsed.toLocaleString()}</span>
                  </div>
                )}
                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-700">Net Profit:</span>
                        <span className={`font-bold ${team.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{team.netProfit.toLocaleString()}
                        </span>
              </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Project Finances</h3>
                  <p className="text-sm text-gray-600">Financial overview of all projects</p>
                </div>
                <Button onClick={() => { resetPayrollForm(); setShowPayrollModal(true); }} className="w-full sm:w-auto">
                  <FiPlus className="mr-2" />
                  Add Payroll
                </Button>
              </div>

              {/* Project Cards */}
              {projectFinancials.length === 0 && (
                <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100">
                  <FiFolder className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Financial Data</h3>
                  <p className="text-gray-500">Project financial information will appear here once projects are created and have financial activity.</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                {projectFinancials.map((project: any) => (
                  <div key={project.projectId} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-primary-200">
                    <div className="space-y-4">
                      {/* Project Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary-100 rounded-lg">
                              <FiFolder className="h-5 w-5 text-primary-600" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900">{project.projectName}</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                              {project.category}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                              project.status === 'active' ? 'bg-green-100 text-green-800' :
                              project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status}
                            </span>
                            {project.budgetExceeded && (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                                Budget Exceeded
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center text-gray-600 mb-1">
                            <FiUsers className="mr-2 h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wide">Team</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{project.teamId?.name || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center text-gray-600 mb-1">
                            <FiUsers className="mr-2 h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wide">Owner</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{project.ownerId?.name || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center text-gray-600 mb-1">
                            <FiTarget className="mr-2 h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wide">Progress</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{project.progress}%</p>
                        </div>
                      </div>

                      {/* Financial Overview */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                        <h5 className="text-sm font-semibold text-gray-800 mb-3">Financial Overview</h5>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Budget</div>
                            <div className="text-lg font-bold text-gray-900">₹{project.allocatedBudget.toLocaleString()}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Income</div>
                            <div className="text-lg font-bold text-green-600">₹{project.totalIncome.toLocaleString()}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Expenses</div>
                            <div className="text-lg font-bold text-red-600">₹{project.totalExpense.toLocaleString()}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net Profit</div>
                            <div className={`text-lg font-bold ${project.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{project.netProfit.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Payroll Management</h3>
                  <p className="text-sm text-gray-600">Manage team member salaries and payments</p>
                </div>
                <Button onClick={() => { resetPayrollForm(); setShowPayrollModal(true); }} className="w-full sm:w-auto">
                  <FiPlus className="mr-2" />
                  Add Payroll
                </Button>
              </div>

              {/* Payroll Cards */}
              {payrolls.length === 0 && (
                <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100">
                  <FiCreditCard className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Payroll Records</h3>
                  <p className="text-gray-500">Payroll records will appear here once they are created for team members.</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                {payrolls.map((payroll: any) => (
                  <div key={payroll._id} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-primary-200">
                    <div className="space-y-4">
                      {/* Payroll Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <FiCreditCard className="h-5 w-5 text-green-600" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900">{payroll.userId?.name || 'N/A'}</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                              {payroll.teamId?.name || 'N/A'}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                              payroll.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payroll.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payroll Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center text-gray-600 mb-1">
                            <FiCalendar className="mr-2 h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wide">Month</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{payroll.month}</p>
                        </div>
                        {payroll.paymentDate && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center text-gray-600 mb-1">
                              <FiCheck className="mr-2 h-4 w-4" />
                              <span className="text-xs font-medium uppercase tracking-wide">Paid Date</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{new Date(payroll.paymentDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {payroll.transactionId && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center text-gray-600 mb-1">
                              <FiCreditCard className="mr-2 h-4 w-4" />
                              <span className="text-xs font-medium uppercase tracking-wide">Transaction</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 font-mono">{payroll.transactionId}</p>
                          </div>
                        )}
                      </div>

                      {/* Salary Amount */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-semibold text-gray-800 mb-1">Salary Amount</h5>
                            <p className="text-xs text-gray-600">Monthly salary for {payroll.month}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">₹{(payroll.salaryAmount || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                        {payroll.status === 'pending' && (
                          <Button
                            variant="success"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleMarkPayrollPaid(payroll._id, 'bank_transfer', '')}
                          >
                            <FiCheck className="mr-2 h-4 w-4" />
                            Mark as Paid
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="flex-1">
                          <FiEdit className="mr-2 h-4 w-4" />
                          Edit Payroll
                        </Button>
                        <Button variant="danger" size="sm" className="flex-1">
                          <FiTrash2 className="mr-2 h-4 w-4" />
                          Delete Payroll
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Financial History</h3>
                  <p className="text-sm text-gray-600">Track all income and expense transactions</p>
                </div>
              </div>

              {/* Income History */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiTrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Income History</h4>
                </div>

                {incomeHistory.length === 0 ? (
                  <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100">
                    <FiDollarSign className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Income Records</h3>
                    <p className="text-gray-500">Income transactions will appear here once they are recorded.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {incomeHistory.map((income: any) => (
                      <div key={income._id} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-green-200">
                        <div className="space-y-4">
                          {/* Income Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-100 rounded-lg">
                                  <FiDollarSign className="h-5 w-5 text-green-600" />
                                </div>
                                <h5 className="text-lg font-semibold text-gray-900">{income.sourceType}</h5>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                                  Income
                                </span>
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                                  {income.receivedByUserId?.name || 'N/A'}
                                </span>
                                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                                  {income.teamId?.name || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Income Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiCalendar className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Date</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{new Date(income.date).toLocaleDateString()}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiCreditCard className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Payment</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{income.paymentMethod}</p>
                            </div>
                            {income.transactionId && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center text-gray-600 mb-1">
                                  <FiFileText className="mr-2 h-4 w-4" />
                                  <span className="text-xs font-medium uppercase tracking-wide">Transaction</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 font-mono">{income.transactionId}</p>
                              </div>
                            )}
                            {income.clientId && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center text-gray-600 mb-1">
                                  <FiUsers className="mr-2 h-4 w-4" />
                                  <span className="text-xs font-medium uppercase tracking-wide">Client</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">{income.clientId?.name || 'N/A'}</p>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {income.description && (
                            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                              <p className="text-sm text-gray-700">{income.description}</p>
                            </div>
                          )}

                          {/* Amount */}
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <h6 className="text-sm font-semibold text-gray-800 mb-1">Income Amount</h6>
                                <p className="text-xs text-gray-600">Received on {new Date(income.date).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-600">₹{income.amount.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expense History */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <FiTrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Expense History</h4>
                </div>

                {expenseHistory.length === 0 ? (
                  <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100">
                    <FiTrendingDown className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Expense Records</h3>
                    <p className="text-gray-500">Expense transactions will appear here once they are recorded.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {expenseHistory.map((expense: any) => (
                      <div key={expense._id} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-red-200">
                        <div className="space-y-4">
                          {/* Expense Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-100 rounded-lg">
                                  <FiTrendingDown className="h-5 w-5 text-red-600" />
                                </div>
                                <h5 className="text-lg font-semibold text-gray-900">{expense.category}</h5>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                                  Expense
                                </span>
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                                  {expense.submittedBy?.name || 'N/A'}
                                </span>
                                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                                  {expense.teamId?.name || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Expense Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiCalendar className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Date</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{new Date(expense.date).toLocaleDateString()}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiCreditCard className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Payment</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{expense.paymentMethod}</p>
                            </div>
                            {expense.vendorName && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center text-gray-600 mb-1">
                                  <FiUsers className="mr-2 h-4 w-4" />
                                  <span className="text-xs font-medium uppercase tracking-wide">Vendor</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">{expense.vendorName}</p>
                              </div>
                            )}
                            {expense.billNumber && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center text-gray-600 mb-1">
                                  <FiFileText className="mr-2 h-4 w-4" />
                                  <span className="text-xs font-medium uppercase tracking-wide">Bill</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">{expense.billNumber}</p>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                            <p className="text-sm text-gray-700">{expense.description}</p>
                          </div>

                          {/* Amount */}
                          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border border-red-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <h6 className="text-sm font-semibold text-gray-800 mb-1">Expense Amount</h6>
                                <p className="text-xs text-gray-600">Spent on {new Date(expense.date).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-red-600">₹{expense.amount.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Budget Warnings Tab */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Budget Management</h3>
                  <p className="text-sm text-gray-600">Monitor project budgets and financial health</p>
                </div>
              </div>

              {/* Budget Summary Cards */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-red-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-red-100 rounded-lg">
                        <FiAlertTriangle className="h-8 w-8 text-red-500" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Over Budget</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {budgetWarnings.filter(w => w.warningLevel === 'critical').length}
                      </p>
                      <p className="text-xs text-gray-400">Projects exceeding budget</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-yellow-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <FiTarget className="h-8 w-8 text-yellow-500" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Near Limit</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {budgetWarnings.filter(w => w.warningLevel === 'warning').length}
                      </p>
                      <p className="text-xs text-gray-400">Projects approaching limit</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-green-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <FiCheck className="h-8 w-8 text-green-500" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Within Budget</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {budgetWarnings.filter(w => w.warningLevel === 'none').length}
                      </p>
                      <p className="text-xs text-gray-400">Projects on track</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Warnings */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiTarget className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Project Budget Status</h4>
                </div>

                {budgetWarnings.length === 0 ? (
                  <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100">
                    <FiTarget className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Warnings</h3>
                    <p className="text-gray-500">All projects are within budget limits and performing well.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {budgetWarnings.map((warning: any) => (
                      <div key={warning.projectId} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-primary-200">
                        <div className="space-y-4">
                          {/* Project Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <FiTarget className="h-5 w-5 text-blue-600" />
                                </div>
                                <h5 className="text-lg font-semibold text-gray-900">{warning.projectTitle}</h5>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  warning.warningLevel === 'critical' 
                                    ? 'bg-red-100 text-red-800'
                                    : warning.warningLevel === 'warning'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {warning.warningLevel === 'critical' ? 'Over Budget' : 
                                   warning.warningLevel === 'warning' ? 'Near Limit' : 'Within Budget'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Budget Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiDollarSign className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Budget</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">₹{warning.budget.toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiTrendingDown className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Expenses</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">₹{warning.totalExpenses.toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiTarget className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Utilization</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{warning.budgetUtilization}%</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiDollarSign className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Deal Amount</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">₹{warning.dealAmount.toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiTrendingUp className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Income Collected</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">₹{warning.totalIncome.toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-gray-600 mb-1">
                                <FiCheck className="mr-2 h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Collection</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{warning.dealCollection}%</p>
                            </div>
                          </div>

                          {/* Budget Progress */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="text-sm font-semibold text-gray-800">Budget Utilization</h6>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                warning.budgetUtilization > 100 
                                  ? 'bg-red-100 text-red-800'
                                  : warning.budgetUtilization > 80
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {warning.budgetUtilization}%
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    warning.budgetUtilization > 100 
                                      ? 'bg-red-500' 
                                      : warning.budgetUtilization > 80
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(warning.budgetUtilization, 100)}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>₹{warning.totalExpenses.toLocaleString()}</span>
                                <span>₹{warning.budget.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Warning Message */}
                          {warning.message && (
                            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                              <div className="flex items-start gap-2">
                                <FiAlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-yellow-800">{warning.message}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Income Modal */}
      <Modal
        isOpen={showIncomeModal}
        onClose={() => {
          setShowIncomeModal(false);
          resetIncomeForm();
        }}
        title={editingItem ? 'Edit Income' : 'Add New Income'}
        size="lg"
      >
        <form onSubmit={handleIncomeSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Income Source"
              required
              value={incomeFormData.sourceType}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, sourceType: e.target.value })}
              options={[
                { value: 'Coaching', label: 'Coaching' },
                { value: 'Paid Workshops', label: 'Paid Workshops' },
                { value: 'Guest Lectures', label: 'Guest Lectures' },
                { value: 'Product Sales', label: 'Product Sales' },
                { value: 'Online Courses', label: 'Online Courses' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <FormInput
              label="Amount (₹)"
              type="number"
              required
              min="0"
              value={incomeFormData.amount}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: Number(e.target.value) })}
              placeholder="0"
            />

            <FormInput
              label="Date"
              type="date"
              required
              value={incomeFormData.date}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, date: e.target.value })}
            />

            <FormSelect
              label="Payment Method"
              required
              value={incomeFormData.paymentMethod}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, paymentMethod: e.target.value })}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'upi', label: 'UPI' },
                { value: 'cash', label: 'Cash' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'card', label: 'Card' },
                { value: 'other', label: 'Other' },
              ]}
            />

            <FormSelect
              label="Team"
              required
              value={incomeFormData.teamId}
              onChange={(e) => setIncomeFormData({ 
                ...incomeFormData, 
                teamId: e.target.value, 
                projectId: '', 
                memberId: '' 
              })}
              options={teams.map((team: any) => ({
                value: team._id,
                label: team.name,
              }))}
            />

            <FormSelect
              label="Project"
              value={incomeFormData.projectId}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, projectId: e.target.value })}
              options={[
                { value: '', label: 'Select Project (Optional)' },
                ...getProjectsByTeam(incomeFormData.teamId).map((project: any) => ({
                  value: project._id,
                  label: project.title,
                }))
              ]}
            />

            <FormSelect
              label="Member"
              required
              value={incomeFormData.memberId}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, memberId: e.target.value })}
              options={[
                { value: '', label: 'Select Member' },
                ...getUsersByTeam(incomeFormData.teamId).map((user: any) => ({
                  value: user._id,
                  label: user.name,
                }))
              ]}
            />

            <FormInput
              label="Transaction ID"
              value={incomeFormData.transactionId}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, transactionId: e.target.value })}
              placeholder="Optional"
            />

            <FormInput
              label="Invoice Number"
              value={incomeFormData.invoiceNumber}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, invoiceNumber: e.target.value })}
              placeholder="Optional"
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={incomeFormData.description}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Brief description of this income..."
              />
            </div>

            <div className="col-span-2 rounded bg-blue-50 p-3 text-sm text-blue-800">
              <strong>Note:</strong> Profit-sharing will be automatically computed based on the income source type after creation.
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowIncomeModal(false);
                resetIncomeForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="success">
              {editingItem ? 'Update Income' : 'Create Income'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          resetExpenseForm();
        }}
        title={editingItem ? 'Edit Expense' : 'Add New Expense'}
        size="lg"
      >
        <form onSubmit={handleExpenseSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Team"
              required
              value={expenseFormData.teamId}
              onChange={(e) => setExpenseFormData({ 
                ...expenseFormData, 
                teamId: e.target.value, 
                projectId: '', 
                memberId: '' 
              })}
              options={teams.map((team: any) => ({
                value: team._id,
                label: team.name,
              }))}
            />

            <FormSelect
              label="Expense Category"
              required
              value={expenseFormData.category}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
              options={[
                { value: 'Rent', label: 'Rent' },
                { value: 'Utilities', label: 'Utilities' },
                { value: 'Logistics', label: 'Logistics' },
                { value: 'Salaries', label: 'Salaries' },
                { value: 'Marketing', label: 'Marketing' },
                { value: 'Manufacturing', label: 'Manufacturing' },
                { value: 'Production', label: 'Production' },
                { value: 'Travel', label: 'Travel' },
                { value: 'Office Supplies', label: 'Office Supplies' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <FormInput
              label="Amount (₹)"
              type="number"
              required
              min="0"
              value={expenseFormData.amount}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: Number(e.target.value) })}
              placeholder="0"
            />

            <FormInput
              label="Date"
              type="date"
              required
              value={expenseFormData.date}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
            />

            <FormSelect
              label="Payment Method"
              required
              value={expenseFormData.paymentMethod}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, paymentMethod: e.target.value })}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'upi', label: 'UPI' },
                { value: 'cash', label: 'Cash' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'card', label: 'Card' },
                { value: 'other', label: 'Other' },
              ]}
            />

            <FormSelect
              label="Project"
              value={expenseFormData.projectId}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, projectId: e.target.value })}
              options={[
                { value: '', label: 'Select Project (Optional)' },
                ...getProjectsByTeam(expenseFormData.teamId).map((project: any) => ({
                  value: project._id,
                  label: project.title,
                }))
              ]}
            />

            <FormSelect
              label="Member"
              required
              value={expenseFormData.memberId}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, memberId: e.target.value })}
              options={[
                { value: '', label: 'Select Member' },
                ...getUsersByTeam(expenseFormData.teamId).map((user: any) => ({
                  value: user._id,
                  label: user.name,
                }))
              ]}
            />

            <FormInput
              label="Vendor Name"
              value={expenseFormData.vendorName}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, vendorName: e.target.value })}
              placeholder="Optional"
            />

            <FormInput
              label="Bill Number"
              value={expenseFormData.billNumber}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, billNumber: e.target.value })}
              placeholder="Optional"
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={expenseFormData.description}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="What is this expense for?"
              />
            </div>

            <div className="col-span-2 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              <strong>Note:</strong> Expense will be validated against team budget limits and require approval.
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowExpenseModal(false);
                resetExpenseForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              {editingItem ? 'Update Expense' : 'Submit Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payroll Modal */}
      <Modal
        isOpen={showPayrollModal}
        onClose={() => {
          setShowPayrollModal(false);
          resetPayrollForm();
        }}
        title={editingItem ? 'Edit Payroll' : 'Add New Payroll'}
        size="lg"
      >
        <form onSubmit={handlePayrollSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Team"
              required
              value={payrollFormData.teamId}
              onChange={(e) => setPayrollFormData({ 
                ...payrollFormData, 
                teamId: e.target.value, 
                userId: '' 
              })}
              options={teams.map((team: any) => ({
                value: team._id,
                label: team.name,
              }))}
            />

            <FormSelect
              label="Member"
              required
              value={payrollFormData.userId}
              onChange={(e) => setPayrollFormData({ ...payrollFormData, userId: e.target.value })}
              options={[
                { value: '', label: 'Select Member' },
                ...getUsersByTeam(payrollFormData.teamId).map((user: any) => ({
                  value: user._id,
                  label: user.name,
                }))
              ]}
              disabled={!payrollFormData.teamId}
            />

            <FormInput
              label="Month"
              type="month"
              required
              value={payrollFormData.month}
              onChange={(e) => setPayrollFormData({ ...payrollFormData, month: e.target.value })}
            />

            <FormInput
              label="Salary Amount (₹)"
              type="number"
              required
              min="0"
              value={payrollFormData.salaryAmount}
              onChange={(e) => setPayrollFormData({ ...payrollFormData, salaryAmount: Number(e.target.value) })}
              placeholder="0"
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={payrollFormData.notes}
                onChange={(e) => setPayrollFormData({ ...payrollFormData, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Optional notes about this payroll..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPayrollModal(false);
                resetPayrollForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Update Payroll' : 'Create Payroll'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Budget Modal */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => {
          setShowBudgetModal(false);
          resetBudgetForm();
        }}
        title={`Edit Budget - ${selectedTeam?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleBudgetSubmit}>
          <div className="space-y-4">
            <FormInput
              label="Monthly Budget (₹)"
              type="number"
              required
              min="0"
              value={budgetFormData.monthlyBudget}
              onChange={(e) => setBudgetFormData({ ...budgetFormData, monthlyBudget: Number(e.target.value) })}
              placeholder="0"
            />

            <FormInput
              label="Credit Limit (₹)"
              type="number"
              required
              min="0"
              value={budgetFormData.creditLimit}
              onChange={(e) => setBudgetFormData({ ...budgetFormData, creditLimit: Number(e.target.value) })}
              placeholder="0"
            />

            <div className="rounded bg-blue-50 p-3 text-sm text-blue-800">
              <strong>Note:</strong> Credit limit allows teams to exceed their monthly budget up to this amount.
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowBudgetModal(false);
                resetBudgetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              Update Budget
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Mobile Components */}
      <FABMenu />
      <MobileNavbar />
    </div>
  );
}
