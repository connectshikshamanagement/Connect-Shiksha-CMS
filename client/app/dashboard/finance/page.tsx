'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { incomeAPI, expenseAPI, clientAPI, teamAPI, projectAPI, userAPI, financeAPI, payrollAPI, reportAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { 
  FiPlus, FiTrendingUp, FiTrendingDown, FiDollarSign, FiEdit, FiTrash2, 
  FiCheck, FiX, FiUsers, FiFileText, FiDownload, FiAlertTriangle, 
  FiCreditCard, FiTarget, FiCalendar 
} from 'react-icons/fi';

export default function FinancePage() {
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [teamFinancials, setTeamFinancials] = useState([]);
  const [projectFinancials, setProjectFinancials] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
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

      const [teamsRes, projectsRes, usersRes, teamFinancialsRes, projectFinancialsRes, payrollsRes] = await Promise.all([
        teamAPI.getAll(),
        projectAPI.getAll(),
        userAPI.getAll(),
        financeAPI.getTeamSummary(filterParams),
        financeAPI.getProjectSummary(filterParams),
        payrollAPI.getAll(filterParams)
      ]);
      
      if (teamsRes.data.success) setTeams(teamsRes.data.data);
      if (projectsRes.data.success) setProjects(projectsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (teamFinancialsRes.data.success) setTeamFinancials(teamFinancialsRes.data.data);
      if (projectFinancialsRes.data.success) setProjectFinancials(projectFinancialsRes.data.data);
      if (payrollsRes.data.success) setPayrolls(payrollsRes.data.data);
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
      // Clean the form data to handle empty clientId
      const cleanedIncomeData = {
        ...incomeFormData,
        clientId: incomeFormData.clientId === '' ? undefined : incomeFormData.clientId
      };

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
    return projects.filter((project: any) => project.teamId === teamId);
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

  const totalIncome = teamFinancials.reduce((sum: number, team: any) => sum + team.totalIncome, 0);
  const totalExpenses = teamFinancials.reduce((sum: number, team: any) => sum + team.totalExpense, 0);
  const totalPayroll = teamFinancials.reduce((sum: number, team: any) => sum + team.totalPayroll, 0);
  const netProfit = totalIncome - totalExpenses - totalPayroll;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Finance" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
            <h2 className="text-2xl font-bold text-gray-800">Financial Management</h2>
              <p className="mt-1 text-sm text-gray-600">Team-based financial control and reporting</p>
            </div>
            <div className="flex items-center gap-3">
              <FormInput
                label="Select Month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-auto"
              />
              <Button onClick={() => { resetIncomeForm(); setShowIncomeModal(true); }}>
                <FiPlus className="mr-2" />
                Add Income
              </Button>
              <Button variant="danger" onClick={() => { resetExpenseForm(); setShowExpenseModal(true); }}>
                <FiPlus className="mr-2" />
                Add Expense
              </Button>
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
          <div className="mb-6 flex gap-4">
            {['overview', 'teams', 'projects', 'payroll'].map((tab) => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-6 py-3 font-medium transition-colors capitalize ${
                  activeTab === tab 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 shadow hover:bg-gray-50'
              }`}
            >
                {tab} {tab === 'teams' && `(${teamFinancials.length})`}
            </button>
            ))}
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
                  {projectFinancials.slice(0, 5).map((project: any) => (
                    <div key={project.projectId} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{project.projectName}</h4>
                          <p className="text-sm text-gray-600">{project.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${project.budgetExceeded ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{project.netProfit.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Net Profit</p>
                        </div>
                      </div>
                      {project.budgetExceeded && (
                        <div className="mt-2 flex items-center text-sm text-red-600">
                          <FiAlertTriangle className="mr-1" />
                          Budget exceeded by ₹{(project.totalExpense - project.allocatedBudget).toLocaleString()}
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
            <div className="rounded-lg bg-white shadow">
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Project Finances</h3>
                  <Button onClick={() => { resetPayrollForm(); setShowPayrollModal(true); }}>
                    <FiPlus className="mr-2" />
                    Add Payroll
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {projectFinancials.map((project: any) => (
                  <div key={project.projectId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{project.projectName}</h4>
                          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {project.category}
                          </span>
                          <span className={`rounded px-2 py-1 text-xs font-medium ${
                            project.status === 'active' ? 'bg-green-100 text-green-800' :
                            project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status}
                            </span>
                          {project.budgetExceeded && (
                            <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                              Budget Exceeded
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex gap-4 text-sm text-gray-500">
                          <span>Team: {project.teamId?.name || 'N/A'}</span>
                          <span>Owner: {project.ownerId?.name || 'N/A'}</span>
                          <span>Progress: {project.progress}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Allocated Budget</p>
                            <p className="font-medium">₹{project.allocatedBudget.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total Income</p>
                            <p className="font-medium text-green-600">₹{project.totalIncome.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total Expense</p>
                            <p className="font-medium text-red-600">₹{project.totalExpense.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Net Profit</p>
                            <p className={`font-bold ${project.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{project.netProfit.toLocaleString()}
                            </p>
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
            <div className="rounded-lg bg-white shadow">
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Payroll Management</h3>
                  <Button onClick={() => { resetPayrollForm(); setShowPayrollModal(true); }}>
                    <FiPlus className="mr-2" />
                    Add Payroll
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {payrolls.map((payroll: any) => (
                  <div key={payroll._id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{payroll.userId?.name || 'N/A'}</h4>
                          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {payroll.teamId?.name || 'N/A'}
                          </span>
                          <span className={`rounded px-2 py-1 text-xs font-medium ${
                            payroll.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payroll.status}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-4 text-sm text-gray-500">
                          <span>Month: {payroll.month}</span>
                          {payroll.paymentDate && <span>Paid: {new Date(payroll.paymentDate).toLocaleDateString()}</span>}
                          {payroll.transactionId && <span>Transaction: {payroll.transactionId}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">₹{payroll.salaryAmount.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1">
                          {payroll.status === 'pending' && (
                              <Button
                                variant="success"
                                size="sm"
                              onClick={() => handleMarkPayrollPaid(payroll._id, 'bank_transfer', '')}
                              >
                                <FiCheck />
                              </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <FiEdit />
                          </Button>
                          <Button variant="danger" size="sm">
                            <FiTrash2 />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
              onChange={(e) => setPayrollFormData({ ...payrollFormData, teamId: e.target.value })}
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
              options={teams
                .filter((team: any) => team._id === payrollFormData.teamId)
                .flatMap((team: any) => 
                  team.members?.map((member: any) => ({
                    value: member._id,
                    label: member.name,
                  })) || []
                )}
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
    </div>
  );
}
