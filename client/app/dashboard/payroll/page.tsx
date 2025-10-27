'use client';

import { useEffect, useState } from 'react';
import { payoutAPI, incomeAPI, expenseAPI, projectAPI, teamMemberFinanceAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { FiDownload, FiCheck, FiDollarSign, FiUsers, FiTrendingUp, FiFilter, FiRefreshCw, FiPlus, FiMinus, FiCreditCard } from 'react-icons/fi';

export default function PayrollPage() {
  // Helper function to get current date in local timezone (YYYY-MM-DD format)
  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [payouts, setPayouts] = useState([]);
  const [projects, setProjects] = useState([]);
  // Removed: const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedProject, setSelectedProject] = useState('');
  // Removed: const [selectedTeam, setSelectedTeam] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [userProjects, setUserProjects] = useState([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const { userRole, isFounder, isManager, isMember, loading: permissionsLoading } = usePermissions();

  // Form data states
  const [incomeFormData, setIncomeFormData] = useState({
    amount: '',
    source: '',
    sourceType: 'Product Sales',
    description: '',
    projectId: '',
    date: getCurrentDate()
  });

  const [expenseFormData, setExpenseFormData] = useState({
    amount: '',
    category: 'Other',
    description: '',
    projectId: '',
    date: getCurrentDate()
  });

  useEffect(() => {
    // Wait for permissions to load before making API calls
    if (permissionsLoading) {
      return;
    }

    // Debug current user
    const user = localStorage.getItem('user');
    console.log('Current user:', user ? JSON.parse(user) : 'No user found');
    console.log('User role:', userRole, 'isFounder:', isFounder, 'isManager:', isManager, 'isMember:', isMember);
    
    fetchProjects();
    fetchPayouts();
    if (isFounder || isManager) {
      fetchAnalytics();
      fetchFinancialSummary();
    }
    if (isMember) {
      fetchUserProjects();
    }
    
    // Fetch project members when a project is selected
    if (selectedProject) {
      fetchProjectMembers(selectedProject);
    } else {
      setProjectMembers([]);
    }
  }, [selectedMonth, selectedYear, selectedProject, userRole, permissionsLoading]);

  // Removed fetchTeams - team filter removed

  // Debug payouts state changes
  useEffect(() => {
    console.log('Payouts state changed:', payouts);
  }, [payouts]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      let endpoint = '/payroll'; // Use payroll endpoint for founders/managers
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString()
      });

      // Role-based data fetching
      if (isMember) {
        endpoint = '/project-profit/my-shares';
        params.append('month', selectedMonth.toString());
        params.append('year', selectedYear.toString());
      } else if (selectedProject) {
        // When a project is selected, still use the payroll endpoint with projectId filter
        endpoint = '/payroll';
        // Note: The backend should filter by projectId when it's in the payroll records
      } else if (isFounder || isManager) {
        // For founders and managers, use the payroll endpoint
        endpoint = '/payroll';
      }

      console.log('Fetching payroll from:', endpoint, 'with params:', params.toString());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      console.log('Payroll response:', data);
      console.log('Setting payouts to:', data.data.records || data.data);
      
      if (data.success) {
        let payoutsData = data.data.records || data.data;
        
        // Filter by selected project on client side if a project is selected
        if (selectedProject && Array.isArray(payoutsData)) {
          payoutsData = payoutsData.filter((payout: any) => {
            const payoutProjectId = payout.projectId?._id || payout.projectId;
            return payoutProjectId?.toString() === selectedProject;
          });
        }
        
        setPayouts(payoutsData);
        console.log('Payouts state updated');
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/project-profit/analytics?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString()
      });
      
      if (selectedProject) {
        params.append('projectId', selectedProject);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/finance/summary?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setFinancialSummary(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch financial summary:', error);
    }
  };

  const handleComputeProfitSharing = async (projectId?: string) => {
    const loadingToast = showToast.loading('Computing profit sharing...');

    try {
      let endpoint = '/project-profit/compute-all';
      if (projectId) {
        endpoint = `/project-profit/compute/${projectId}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        showToast.dismiss(loadingToast);
        showToast.success(data.message);
        fetchPayouts();
        if (isFounder || isManager) {
          fetchAnalytics();
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.message || 'Failed to compute profit sharing');
    }
  };

  const handleMarkAsPaid = async (payoutId: string) => {
    if (!confirm('Mark this payout as paid?')) return;

    const loadingToast = showToast.loading('Updating payout status...');

    try {
      console.log('Marking payout as paid:', payoutId);
      console.log('Available payouts:', payouts.map((p: any) => ({ id: p._id, type: 'payroll' })));
      
      // Check if this is a payout record or a payroll record
      const payoutRecord = payouts.find((p: any) => p._id === payoutId);
      
      if (!payoutRecord) {
        throw new Error('Payout record not found');
      }
      
      console.log('Payout record found:', payoutRecord);
      
      // Since we're using /payroll endpoint, all records are payroll records
      // Always use the payroll endpoint
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/payroll/${payoutId}/pay`;
      
      const body = {
        paymentMethod: 'bank_transfer',
        transactionId: `TXN${Date.now()}`,
      };
      
      console.log('Using endpoint:', endpoint, 'with body:', body);
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      console.log('Response:', data);
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update payout status');
      }
      
      showToast.dismiss(loadingToast);
      showToast.success('Payout marked as paid!');
      fetchPayouts();
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      showToast.dismiss(loadingToast);
      showToast.error(error.message || 'Operation failed');
    }
  };


  const fetchProjects = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchUserProjects = async () => {
    try {
      // Use team member finance API for team members, regular API for founders/managers
      if (isMember) {
        const response = await teamMemberFinanceAPI.getMyProjects();
        if (response.data.success) {
          setUserProjects(response.data.data);
        }
      } else {
        const response = await projectAPI.getAll();
        if (response.data.success) {
          setUserProjects(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching user projects:', error);
    }
  };

  const fetchProjectMembers = async (projectId: string) => {
    if (!projectId) {
      setProjectMembers([]);
      return;
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const data = await response.json();
      if (data.success && data.data) {
        // Get the project members (exclude founder)
        const members = data.data.projectMembers || [];
        // Store member data with populated info
        const membersWithDetails = await Promise.all(
          members.map(async (memberId: any) => {
            try {
              const memberResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${memberId}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
              });
              const memberData = await memberResponse.json();
              return memberData.success ? memberData.data : memberId;
            } catch {
              return memberId;
            }
          })
        );
        setProjectMembers(membersWithDetails);
      }
    } catch (error) {
      console.error('Error fetching project members:', error);
      setProjectMembers([]);
    }
  };

  // Form submission handlers

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incomeFormData.amount || !incomeFormData.source || !incomeFormData.sourceType || !incomeFormData.projectId) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading('Adding income entry...');

    try {
      // Use team member finance API for team members, regular API for founders/managers
      if (isMember) {
        await teamMemberFinanceAPI.addProjectIncome(incomeFormData);
      } else {
        await incomeAPI.create(incomeFormData);
      }
      
      showToast.success('Income entry added successfully!');
      setShowIncomeModal(false);
      setIncomeFormData({ amount: '', source: '', sourceType: 'Product Sales', description: '', projectId: '', date: getCurrentDate() });
      
      // Add small delay to ensure backend processing is complete
      setTimeout(() => {
        fetchPayouts(); // Refresh data
      }, 1000);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to add income entry');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseFormData.amount || !expenseFormData.category || !expenseFormData.projectId) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading('Adding expense entry...');

    try {
      // Use team member finance API for team members, regular API for founders/managers
      if (isMember) {
        await teamMemberFinanceAPI.addProjectExpense(expenseFormData);
      } else {
        await expenseAPI.create(expenseFormData);
      }
      
      showToast.success('Expense entry added successfully!');
      setShowExpenseModal(false);
      setExpenseFormData({ amount: '', category: 'Other', description: '', projectId: '', date: getCurrentDate() });
      
      // Add small delay to ensure backend processing is complete
      setTimeout(() => {
        fetchPayouts(); // Refresh data
      }, 1000);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to add expense entry');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };


  const totalBaseSalary = payouts.reduce((sum, p: any) => sum + (p.baseSalary || p.salaryAmount || 0), 0);
  const totalShares = payouts.reduce((sum, p: any) => sum + (p.totalShares || p.profitShare || 0), 0);
  const totalPayout = payouts.reduce((sum, p: any) => sum + (p.netAmount || 0), 0);
  const totalBonuses = payouts.reduce((sum, p: any) => sum + (p.bonuses || 0), 0);
  const totalDeductions = payouts.reduce((sum, p: any) => sum + (p.deductions || 0), 0);

  // Role-based access control
  const canComputeProfitSharing = isFounder || isManager;
  const canMarkAsPaid = isFounder || isManager;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Payroll" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading payroll...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Payroll" />

        <div className="p-4 md:p-8 pb-20 md:pb-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                {isMember ? 'My Payouts' : 'Payroll Management'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {isMember 
                  ? 'View your profit shares and payout status' 
                  : 'Process monthly payroll and manage payouts'
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canComputeProfitSharing && (
                <Button variant="primary" onClick={() => handleComputeProfitSharing()} className="flex-1 sm:flex-none">
                  <FiRefreshCw className="mr-2" />
                  Compute Profit Sharing
                </Button>
              )}
              {isMember && (
                <>
                  <Button variant="success" onClick={() => setShowIncomeModal(true)} className="flex-1 sm:flex-none">
                    <FiPlus className="mr-2" />
                    Add Income
                  </Button>
                  <Button variant="danger" onClick={() => setShowExpenseModal(true)} className="flex-1 sm:flex-none">
                    <FiMinus className="mr-2" />
                    Add Expense
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4 rounded-lg bg-white p-4 shadow">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2025, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {!isMember && (
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">All Projects</option>
                  {projects.map((project: any) => (
                    <option key={project._id} value={project._id}>
                      {project.title} ({project.category || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Financial Summary Brief */}
          {financialSummary && (isFounder || isManager) && (
            <div className="mb-6 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FiTrendingUp className="mr-2" />
                Financial Overview - {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Total Income</p>
                      <p className="text-2xl font-bold text-white">
                        ₹{financialSummary.totalIncome?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <FiDollarSign className="h-8 w-8 text-green-200" />
                  </div>
                  {financialSummary.projectBreakdown && Object.keys(financialSummary.projectBreakdown).length > 0 && (
                    <div className="mt-2 text-xs text-green-100">
                      {Object.entries(financialSummary.projectBreakdown).map(([project, income]: [string, any]) => (
                        <div key={project} className="flex justify-between">
                          <span>{project}:</span>
                          <span>₹{income.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {financialSummary.projectBreakdown && Object.keys(financialSummary.projectBreakdown).length === 0 && (
                    <div className="mt-2 text-xs text-green-100">No project-linked income</div>
                  )}
                </div>
                
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                      <p className="text-2xl font-bold text-white">
                        ₹{financialSummary.totalExpenses?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <FiDollarSign className="h-8 w-8 text-red-200" />
                  </div>
                  {financialSummary.expenseBreakdown && Object.keys(financialSummary.expenseBreakdown).length > 0 && (
                    <div className="mt-2 text-xs text-red-100">
                      {Object.entries(financialSummary.expenseBreakdown).map(([category, amount]: [string, any]) => (
                        <div key={category} className="flex justify-between">
                          <span>{category}:</span>
                          <span>₹{amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {financialSummary.expenseBreakdown && Object.keys(financialSummary.expenseBreakdown).length === 0 && (
                    <div className="mt-2 text-xs text-red-100">No expenses</div>
                  )}
                </div>
                
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Net Profit</p>
                      <p className={`text-2xl font-bold ${(financialSummary.netProfit || 0) >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                        ₹{financialSummary.netProfit?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <FiTrendingUp className="h-8 w-8 text-blue-200" />
                  </div>
                  <div className="mt-2 text-xs text-blue-100">
                    <div className="flex justify-between">
                      <span>Profit Margin:</span>
                      <span>{financialSummary.profitMargin ? `${financialSummary.profitMargin.toFixed(1)}%` : '0%'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {financialSummary.topProjects && financialSummary.topProjects.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                  <p className="text-sm text-white font-medium mb-2">Top Performing Projects:</p>
                  <div className="flex flex-wrap gap-2">
                    {financialSummary.topProjects.slice(0, 3).map((project: any, index: number) => (
                      <span key={project._id} className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs">
                        {index + 1}. {project.title} - ₹{project.profit?.toLocaleString() || '0'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Income</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                ₹{isMember 
                  ? payouts.filter((p: any) => p.userId?.email !== 'founder@connectshiksha.com').reduce((sum: number, p: any) => sum + (p.projectIncome || 0), 0).toLocaleString()
                  : (financialSummary?.totalIncome?.toLocaleString() || '0')
                }
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Budget</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                ₹{isMember 
                  ? payouts.filter((p: any) => p.userId?.email !== 'founder@connectshiksha.com').reduce((sum: number, p: any) => sum + (p.projectBudget || 0), 0).toLocaleString()
                  : (financialSummary?.totalBudget?.toLocaleString() || '0')
                }
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Expenses</p>
              <p className="mt-2 text-2xl font-bold text-red-600">
                ₹{isMember 
                  ? payouts.filter((p: any) => p.userId?.email !== 'founder@connectshiksha.com').reduce((sum: number, p: any) => sum + (p.projectExpenses || 0), 0).toLocaleString()
                  : (financialSummary?.totalExpenses?.toLocaleString() || '0')
                }
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                ₹{isMember 
                  ? payouts.filter((p: any) => p.userId?.email !== 'founder@connectshiksha.com').reduce((sum: number, p: any) => sum + ((p.projectIncome || 0) - (p.projectExpenses || 0)), 0).toLocaleString()
                  : (financialSummary?.netProfit?.toLocaleString() || '0')
                }
              </p>
            </div>
          </div>

          {/* Analytics for Founders */}
          {isFounder && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 flex items-center">
                <FiTrendingUp className="mr-2" />
                Profit Sharing Analytics
              </h3>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
                {(() => {
                  // Use financial summary if available (more accurate), otherwise calculate from payouts
                  let totalProfit = 0;
                  
                  if (financialSummary?.netProfit !== undefined) {
                    totalProfit = financialSummary.netProfit;
                  } else {
                    // Fallback: Calculate total profit by summing unique projects
                    const projectsMap = new Map();
                    payouts.forEach((p: any) => {
                      if (p.projectId?._id || p.projectId) {
                        const projectId = p.projectId._id || p.projectId;
                        const profit = (p.projectIncome || 0) - (p.projectExpenses || 0);
                        if (!projectsMap.has(projectId)) {
                          projectsMap.set(projectId, profit);
                        }
                      }
                    });
                    totalProfit = Array.from(projectsMap.values()).reduce((sum, profit) => sum + profit, 0);
                  }
                  
                  // Founder share is 70% of total profit
                  const founderShare = Math.round(totalProfit * 0.7);
                  
                  // Team share is 30% of total profit
                  const teamShare = Math.round(totalProfit * 0.3);
                  
                  return (
                    <>
                      {!isMember && (
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-600 font-medium">Connect Shiksha Shares</p>
                          <p className="text-2xl font-bold text-purple-700">
                            ₹{founderShare.toLocaleString()}
                          </p>
                          <p className="text-xs text-purple-500">70% of total profits</p>
                        </div>
                      )}
                      
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-600 font-medium">{isMember ? 'My Shares' : 'Team Shares'}</p>
                        <p className="text-2xl font-bold text-blue-700">
                          ₹{teamShare.toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-500">30% of total profits</p>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-green-600 font-medium">Total Profit</p>
                        <p className="text-2xl font-bold text-green-700">₹{totalProfit.toLocaleString()}</p>
                        <p className="text-xs text-green-500">{payouts.length > 0 ? `${payouts.length} payroll records` : 'No payroll records'}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              {payouts.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Project-wise Distribution</h4>
                  <div className="space-y-2">
                    {Array.from(new Set(payouts.map((p: any) => p.projectId?.title).filter(Boolean))).map((projectTitle: string) => {
                      const projectPayouts = payouts.filter((p: any) => p.projectId?.title === projectTitle);
                      // Use the first payout record's project financial data (should be the same for all records of same project)
                      const firstPayout: any = projectPayouts[0];
                      if (!firstPayout) return null;
                      // Calculate actual project profit (income - expenses) from stored data
                      const projectIncome = firstPayout.projectIncome || 0;
                      const projectExpenses = firstPayout.projectExpenses || 0;
                      const totalProjectProfit = Math.round(projectIncome - projectExpenses);
                      // Calculate founder share (70% of profit)
                      const founderProfit = Math.round(totalProjectProfit * 0.7);
                      const teamProfit = Math.round(totalProjectProfit * 0.3);
                      
                      return (
                        <div key={projectTitle} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-900">{projectTitle}</span>
                            <span className="text-sm font-bold text-gray-900">₹{totalProjectProfit.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Founder: ₹{founderProfit.toLocaleString()}</span>
                            <span>Team: ₹{teamProfit.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payroll Summary */}
          {!isMember && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            
              <div className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Connect Shiksha</h3>
                    <p className="text-purple-100 text-sm">70% of all project profits</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {(() => {
                        // Use financial summary if available, otherwise calculate from payouts
                        const totalProfit = financialSummary?.netProfit !== undefined 
                          ? financialSummary.netProfit 
                          : (() => {
                              const projectsMap = new Map();
                              payouts.forEach((p: any) => {
                                if (p.projectId?._id || p.projectId) {
                                  const projectId = p.projectId._id || p.projectId;
                                  const profit = (p.projectIncome || 0) - (p.projectExpenses || 0);
                                  if (!projectsMap.has(projectId)) {
                                    projectsMap.set(projectId, profit);
                                  }
                                }
                              });
                              return Array.from(projectsMap.values()).reduce((sum, profit) => sum + profit, 0);
                            })();
                        const founderShare = Math.round(totalProfit * 0.7);
                        return `₹${founderShare.toLocaleString()}`;
                      })()}
                    </div>
                    <div className="text-purple-100 text-sm">Total Connect Shiksha Shares</div>
                  </div>
                </div>
              </div>
           
              
            <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{isMember ? 'My Shares' : 'Team Members'}</h3>
                  <p className="text-blue-100 text-sm">30% shared equally</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {(() => {
                      // Use financial summary if available, otherwise calculate from payouts
                      const totalProfit = financialSummary?.netProfit !== undefined 
                        ? financialSummary.netProfit 
                        : (() => {
                            const projectsMap = new Map();
                            payouts.forEach((p: any) => {
                              if (p.projectId?._id || p.projectId) {
                                const projectId = p.projectId._id || p.projectId;
                                const profit = (p.projectIncome || 0) - (p.projectExpenses || 0);
                                if (!projectsMap.has(projectId)) {
                                  projectsMap.set(projectId, profit);
                                }
                              }
                            });
                            return Array.from(projectsMap.values()).reduce((sum, profit) => sum + profit, 0);
                          })();
                      const teamShare = Math.round(totalProfit * 0.3);
                      return `₹${teamShare.toLocaleString()}`;
                    })()}
                  </div>
                  <div className="text-blue-100 text-sm">{isMember ? 'Total My Shares' : 'Total Team Shares'}</div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Payroll Records - Split Layout */}
          <div className={`grid grid-cols-1 ${isMember ? '' : 'lg:grid-cols-2'} gap-6`}>
            
            {/* Founder's Shares - Hidden for team members */}
            {!isMember && (
              <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg border border-purple-200">
                <div className="bg-purple-600 text-white p-4 rounded-t-lg">
                  <h3 className="text-lg font-semibold flex items-center">
                    <FiUsers className="mr-2" />
                    Connect Shiksha Shares
                  </h3>
                  <p className="text-purple-100 text-sm mt-1">70% of all project profits</p>
                </div>
                
                <div className="p-4">
                  {payouts.filter((payout: any) => {
                    const isFounder = payout.userId?.email === 'founder@connectshiksha.com';
                    const hasProfit = (payout.projectIncome || 0) - (payout.projectExpenses || 0) > 0;
                    return isFounder && hasProfit;
                  }).map((payout: any) => (
                    <div key={payout._id} className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-purple-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{payout.projectId?.title || 'N/A'}</h4>
                          <p className="text-sm text-gray-600">{payout.teamId?.name || ''}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">
                            ₹{Math.round(payout.profitShare || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">70% Founder Share</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex flex-wrap gap-2">
                          <span className="text-green-600 text-xs">
                            Income: ₹{(payout.projectIncome || 0).toLocaleString()}
                          </span>
                          <span className="text-blue-600 text-xs">
                            Budget: ₹{(payout.projectBudget || 0).toLocaleString()}
                          </span>
                          <span className="text-red-600 text-xs">
                            Expenses: ₹{(payout.projectExpenses || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            ₹{(payout.netAmount || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Net Amount</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payout.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          payout.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payout.status}
                        </span>
                        
                        {canMarkAsPaid && payout.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleMarkAsPaid(payout._id)}
                          >
                            <FiCheck className="mr-1" />
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                      
                      {payout.description && (
                        <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          {payout.description}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(() => {
                    const founderPayouts = payouts.filter((payout: any) => {
                      const isFounder = payout.userId?.email === 'founder@connectshiksha.com';
                      const hasProfit = (payout.projectIncome || 0) - (payout.projectExpenses || 0) > 0;
                      return isFounder && hasProfit;
                    });
                    
                    return founderPayouts.length === 0 && (
                      <div className="text-center py-8">
                        {financialSummary?.netProfit && financialSummary.netProfit > 0 ? (
                        <>
                          <div className="bg-white rounded-lg p-6 shadow-sm border border-purple-200">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <h4 className="font-semibold text-gray-900">Calculated Share</h4>
                                <p className="text-sm text-gray-600">Based on current financial data</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-purple-600">
                                  ₹{Math.round((financialSummary.netProfit || 0) * 0.7).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">70% Founder Share</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                              <p><strong>Note:</strong> Click "Compute Profit Sharing" to create payroll records and mark as paid.</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FiUsers className="mx-auto mb-2 h-8 w-8" />
                          <p>No Connect Shiksha Shares found</p>
                          <p className="text-xs mt-2">Compute profit sharing to generate records</p>
                        </div>
                      )}
                    </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Team Members' Shares */}
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg border border-blue-200">
              <div className="bg-blue-600 text-white p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold flex items-center">
                  <FiUsers className="mr-2" />
                  {isMember ? 'My Shares' : 'Team Members Shares'}
                </h3>
              </div>
              
              <div className="p-4 max-h-[1000px] overflow-y-auto">
                {(() => {
                  // Filter out payouts for projects with zero or negative profit
                  const teamPayouts = payouts.filter((payout: any) => {
                    const isNotFounder = payout.userId?.email !== 'founder@connectshiksha.com';
                    const hasProfit = (payout.projectIncome || 0) - (payout.projectExpenses || 0) > 0;
                    return isNotFounder && hasProfit;
                  });
                  
                  // Group team payouts by project
                  const projectGroups = new Map();
                  
                  teamPayouts.forEach((payout: any) => {
                    const projectId = payout.projectId?._id || payout.projectId;
                    const projectTitle = payout.projectId?.title || 'Unassigned';
                    
                    if (!projectGroups.has(projectId)) {
                      projectGroups.set(projectId, {
                        projectTitle,
                        projectId,
                        payouts: []
                      });
                    }
                    
                    projectGroups.get(projectId).payouts.push(payout);
                  });
                  
                  // Convert to array
                  const projectGroupsArray = Array.from(projectGroups.values());
                  
                  return projectGroupsArray.map((group) => (
                    <div key={group.projectId} className="mb-6">
                      <div className="mb-3 border-b border-blue-200 pb-2">
                        <h4 className="font-semibold text-blue-700">{group.projectTitle}</h4>
                        <p className="text-xs text-gray-500">{group.payouts.length} team member{group.payouts.length !== 1 ? 's' : ''}</p>
                      </div>
                      
                      {group.payouts.map((payout: any) => (
                        <div key={payout._id} className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-blue-200">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{payout.userId?.name}</h4>
                              <p className="text-sm text-gray-600">{payout.userId?.email}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-blue-600">
                                ₹{Math.round(payout.profitShare || 0).toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">Team Share</div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex flex-wrap gap-2">
                              <span className="text-green-600 text-xs">
                                Income: ₹{(payout.projectIncome || 0).toLocaleString()}
                              </span>
                              <span className="text-blue-600 text-xs">
                                Budget: ₹{(payout.projectBudget || 0).toLocaleString()}
                              </span>
                              <span className="text-red-600 text-xs">
                                Expenses: ₹{(payout.projectExpenses || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-green-600">
                                ₹{(payout.netAmount || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">Net Amount</div>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex justify-between items-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                                payout.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                payout.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {payout.status}
                              </span>
                            
                            {canMarkAsPaid && payout.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => handleMarkAsPaid(payout._id)}
                                >
                                  <FiCheck className="mr-1" />
                                  Pay
                                </Button>
                              )}
                          </div>
                          
                          {payout.description && (
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              {payout.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ));
                })()}
                
                {(() => {
                  const teamPayoutsFiltered = payouts.filter((payout: any) => {
                    const isNotFounder = payout.userId?.email !== 'founder@connectshiksha.com';
                    const hasProfit = (payout.projectIncome || 0) - (payout.projectExpenses || 0) > 0;
                    return isNotFounder && hasProfit;
                  });
                  
                  return teamPayoutsFiltered.length === 0 && (
                    <div className="text-center py-8">
                      {financialSummary?.netProfit && financialSummary.netProfit > 0 ? (
                        <>
                          <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-200">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <h4 className="font-semibold text-gray-900">Calculated Team Share (Total)</h4>
                                <p className="text-sm text-gray-600">Based on current financial data</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">
                                  ₹{Math.round((financialSummary.netProfit || 0) * 0.3).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">30% Team Share</div>
                              </div>
                            </div>
                            
                            {/* Show eligible team members if project is selected */}
                            {selectedProject && projectMembers && projectMembers.length > 0 && (
                              <div className="mt-4 mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Eligible Team Members ({projectMembers.length}):</p>
                                <div className="space-y-2">
                                  {projectMembers.map((member: any, index: number) => {
                                    const individualShare = (financialSummary?.netProfit || 0) * 0.3 / projectMembers.length;
                                    return (
                                      <div key={index} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                                            {member.name?.charAt(0) || 'U'}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">{member.name || 'N/A'}</p>
                                            <p className="text-xs text-gray-500">{member.email || ''}</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-bold text-blue-600">
                                            ₹{Math.round(individualShare).toLocaleString()}
                                          </p>
                                          <p className="text-xs text-gray-500">Share per member</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                              <p><strong>Note:</strong> Click "Compute Profit Sharing" to create payroll records for team members and mark as paid.</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FiUsers className="mx-auto mb-2 h-8 w-8" />
                          <p>No team member shares found</p>
                          <p className="text-xs mt-2">
                            {financialSummary?.netProfit === 0 
                              ? 'This project has no profit to distribute' 
                              : 'Compute profit sharing to generate records'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

              {payouts.length === 0 && !financialSummary?.netProfit && (
                <div className="p-12 text-center">
                  <FiDollarSign className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900">
                    {isMember ? 'No payout data for this period' : 'No payroll data for this period'}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {isMember 
                      ? 'Your profit shares will appear here when projects generate income'
                      : 'Payouts are automatically generated when income is recorded with profit-sharing'
                    }
                  </p>
                  {canComputeProfitSharing && (
                    <div className="mt-4">
                      <Button variant="primary" onClick={() => handleComputeProfitSharing()}>
                        <FiRefreshCw className="mr-2" />
                        Compute Profit Sharing
                      </Button>
                    </div>
                  )}
                </div>
              )}
          </div>

          {payouts.length > 0 && (
            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              <strong>💡 {isMember ? 'Payout Information:' : 'Payroll Information:'}</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>Net Amount = Base Salary + Profit Shares + Bonuses - Deductions</li>
                {isFounder ? (
                  <>
                    <li>CS receives 70% of project profits</li>
                    <li>Team Managers and Members share the remaining 30% equally</li>
                  </>
                ) : isManager ? (
                  <>
                    <li>You receive an equal share of 30% project profits (among eligible team members)</li>
                    <li>Only team members assigned to projects are eligible for profit sharing</li>
                  </>
                ) : (
                  <>
                    <li>You receive profit shares only if assigned to the project</li>
                    <li>Profit sharing is calculated automatically when project income is recorded</li>
                  </>
                )}
                {!isMember && (
                  <>
                <li>Mark payouts as "Paid" after bank transfer is completed</li>
                <li>Export to Excel or PDF for record-keeping</li>
                  </>
                )}
              </ul>
            </div>
          )}


          {/* Add Income Modal */}
          <Modal
            isOpen={showIncomeModal}
            onClose={() => setShowIncomeModal(false)}
            title="Add Income Entry"
            size="md"
          >
            <form onSubmit={handleIncomeSubmit}>
              <div className="space-y-4">
                <FormInput
                  label="Amount (₹)"
                  type="number"
                  required
                  value={incomeFormData.amount}
                  onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: e.target.value })}
                  placeholder="Enter amount"
                />

                <FormInput
                  label="Source"
                  required
                  value={incomeFormData.source}
                  onChange={(e) => setIncomeFormData({ ...incomeFormData, source: e.target.value })}
                  placeholder="e.g., Client Payment, Product Sale"
                />

                <FormSelect
                  label="Source Type"
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

                <FormSelect
                  label="Project"
                  required
                  value={incomeFormData.projectId}
                  onChange={(e) => setIncomeFormData({ ...incomeFormData, projectId: e.target.value })}
                  options={userProjects.map((project: any) => ({
                    value: project._id,
                    label: project.title,
                  }))}
                />

                <FormInput
                  label="Date"
                  type="date"
                  required
                  value={incomeFormData.date}
                  onChange={(e) => setIncomeFormData({ ...incomeFormData, date: e.target.value })}
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={incomeFormData.description}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Additional details about this income..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIncomeModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Add Income
                </Button>
              </div>
            </form>
          </Modal>

          {/* Add Expense Modal */}
          <Modal
            isOpen={showExpenseModal}
            onClose={() => setShowExpenseModal(false)}
            title="Add Expense Entry"
            size="md"
          >
            <form onSubmit={handleExpenseSubmit}>
              <div className="space-y-4">
                <FormInput
                  label="Amount (₹)"
                  type="number"
                  required
                  value={expenseFormData.amount}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                  placeholder="Enter amount"
                />

                <FormSelect
                  label="Category"
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

                <FormSelect
                  label="Project"
                  required
                  value={expenseFormData.projectId}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, projectId: e.target.value })}
                  options={userProjects.map((project: any) => ({
                    value: project._id,
                    label: project.title,
                  }))}
                />

                <FormInput
                  label="Date"
                  type="date"
                  required
                  value={expenseFormData.date}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={expenseFormData.description}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Additional details about this expense..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExpenseModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Add Expense
                </Button>
              </div>
            </form>
          </Modal>
          
          {/* Mobile Components */}
          <FABMenu />
          <MobileNavbar />
      </div>
    </div>
  );
}

