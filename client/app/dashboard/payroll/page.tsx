'use client';

import { useEffect, useState } from 'react';
import { payoutAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Button from '@/components/Button';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { FiDownload, FiCheck, FiDollarSign, FiUsers, FiTrendingUp, FiFilter, FiRefreshCw } from 'react-icons/fi';

export default function PayrollPage() {
  const [payouts, setPayouts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const { userRole, isFounder, isManager, isMember } = usePermissions();

  useEffect(() => {
    // Debug current user
    const user = localStorage.getItem('user');
    console.log('Current user:', user ? JSON.parse(user) : 'No user found');
    console.log('User role:', userRole, 'isFounder:', isFounder, 'isManager:', isManager, 'isMember:', isMember);
    
    fetchPayouts();
    if (isFounder || isManager) {
      fetchAnalytics();
    }
  }, [selectedMonth, selectedYear, selectedProject, selectedTeam, userRole]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      let endpoint = '/payroll'; // Use payroll endpoint for founders/managers
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString()
      });
      
      // Temporarily remove month/year filtering to see all records
      // const params = new URLSearchParams();

      // Role-based data fetching
      if (isMember) {
        endpoint = '/project-profit/my-shares';
      } else if (selectedProject) {
        endpoint = `/project-profit/payroll/${selectedProject}`;
      } else if (isFounder || isManager) {
        // For founders and managers, use the payroll endpoint
        endpoint = '/payroll';
      }

      if (selectedTeam) {
        params.append('teamId', selectedTeam);
      }

      console.log('Fetching payroll from:', endpoint, 'with params:', params.toString());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      console.log('Payroll response:', data);
      
      if (data.success) {
        setPayouts(data.data.records || data.data);
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
      await payoutAPI.updateStatus(payoutId, {
        status: 'paid',
        paymentMethod: 'bank_transfer',
        transactionId: `TXN${Date.now()}`,
      });
      showToast.dismiss(loadingToast);
      showToast.success('Payout marked as paid!');
      fetchPayouts();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleExportExcel = async () => {
    const loadingToast = showToast.loading('Generating Excel report...');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payroll/export/excel?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-${selectedMonth}-${selectedYear}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        showToast.dismiss(loadingToast);
        showToast.success('Excel report downloaded!');
      } else {
        throw new Error('Export failed');
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to export Excel');
    }
  };

  const handleExportPDF = async () => {
    const loadingToast = showToast.loading('Generating PDF report...');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payroll/export/pdf?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-${selectedMonth}-${selectedYear}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        showToast.dismiss(loadingToast);
        showToast.success('PDF report downloaded!');
      } else {
        throw new Error('Export failed');
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to export PDF');
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
  const canExport = isFounder || isManager;

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
      
      <div className="flex-1 overflow-auto">
        <Header title="Payroll" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {isMember ? 'My Payouts' : 'Payroll Management'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {isMember 
                  ? 'View your profit shares and payout status' 
                  : 'Process monthly payroll and manage payouts'
                }
              </p>
            </div>
            <div className="flex gap-2">
              {canComputeProfitSharing && (
                <Button variant="primary" onClick={() => handleComputeProfitSharing()}>
                  <FiRefreshCw className="mr-2" />
                  Compute Profit Sharing
                </Button>
              )}
              {canExport && (
                <>
              <Button variant="success" onClick={handleExportExcel}>
                <FiDownload className="mr-2" />
                Export Excel
              </Button>
              <Button variant="danger" onClick={handleExportPDF}>
                <FiDownload className="mr-2" />
                Export PDF
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
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Project</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="">All Projects</option>
                    {projects.map((project: any) => (
                      <option key={project._id} value={project._id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Team</label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="">All Teams</option>
                    {teams.map((team: any) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Base Salary</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                ₹{totalBaseSalary.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Profit Shares</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                ₹{totalShares.toLocaleString()}
              </p>
              {analytics && (
                <p className="mt-1 text-xs text-gray-500">
                  {analytics.summary?.founderShares > 0 && `Founder: ₹${analytics.summary.founderShares.toLocaleString()}`}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Bonuses</p>
              <p className="mt-2 text-2xl font-bold text-purple-600">
                ₹{totalBonuses.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Deductions</p>
              <p className="mt-2 text-2xl font-bold text-red-600">
                ₹{totalDeductions.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Net Amount</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                ₹{totalPayout.toLocaleString()}
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
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-600 font-medium">Connect Shiksha Shares</p>
                  <p className="text-2xl font-bold text-purple-700">
                    ₹{payouts.filter((p: any) => p.userId?.email === 'admin@connectshiksha.com').reduce((sum: number, p: any) => sum + (p.profitShare || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-purple-500">70% of total profits</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">Team Shares</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ₹{payouts.filter((p: any) => p.userId?.email !== 'admin@connectshiksha.com').reduce((sum: number, p: any) => sum + (p.profitShare || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-500">30% of total profits</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 font-medium">Total Participants</p>
                  <p className="text-2xl font-bold text-green-700">{payouts.length}</p>
                  <p className="text-xs text-green-500">Active payroll records</p>
                </div>
              </div>
              
              {payouts.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Project-wise Distribution</h4>
                  <div className="space-y-2">
                    {Array.from(new Set(payouts.map((p: any) => p.projectId?.title).filter(Boolean))).map((projectTitle: string) => {
                      const projectPayouts = payouts.filter((p: any) => p.projectId?.title === projectTitle);
                      const totalProjectProfit = projectPayouts.reduce((sum: number, p: any) => sum + (p.profitShare || 0), 0);
                      const founderProfit = projectPayouts.filter((p: any) => p.userId?.email === 'admin@connectshiksha.com').reduce((sum: number, p: any) => sum + (p.profitShare || 0), 0);
                      const teamProfit = projectPayouts.filter((p: any) => p.userId?.email !== 'admin@connectshiksha.com').reduce((sum: number, p: any) => sum + (p.profitShare || 0), 0);
                      
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Connect Shiksha</h3>
                  <p className="text-purple-100 text-sm">70% of all project profits</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    ₹{payouts.filter((p: any) => p.userId?.email === 'admin@connectshiksha.com').reduce((sum: number, p: any) => sum + (p.profitShare || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-purple-100 text-sm">Total Connect Shiksha Shares</div>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Team Members</h3>
                  <p className="text-blue-100 text-sm">30% shared equally</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    ₹{payouts.filter((p: any) => p.userId?.email !== 'admin@connectshiksha.com').reduce((sum: number, p: any) => sum + (p.profitShare || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-blue-100 text-sm">Total Team Shares</div>
                </div>
              </div>
            </div>
          </div>

          {/* Payroll Records - Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Founder's Shares */}
            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg border border-purple-200">
              <div className="bg-purple-600 text-white p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold flex items-center">
                  <FiUsers className="mr-2" />
                  Connect Shiksha Shares
                </h3>
                <p className="text-purple-100 text-sm mt-1">70% of all project profits</p>
              </div>
              
              <div className="p-4">
                {payouts.filter((payout: any) => payout.userId?.email === 'admin@connectshiksha.com').map((payout: any) => (
                  <div key={payout._id} className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-purple-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{payout.projectId?.title || 'N/A'}</h4>
                        <p className="text-sm text-gray-600">{payout.teamId?.name || ''}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">
                          ₹{(payout.profitShare || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">70% Founder Share</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-gray-600 text-xs">
                          Base: ₹{(payout.baseSalary || 0).toLocaleString()}
                        </span>
                        <span className="text-gray-600 text-xs">
                          Bonuses: ₹{(payout.bonuses || 0).toLocaleString()}
                        </span>
                        <span className="text-red-600 text-xs">
                          Deductions: ₹{(payout.deductions || 0).toLocaleString()}
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
                
                {payouts.filter((payout: any) => payout.userId?.email === 'admin@connectshiksha.com').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FiUsers className="mx-auto mb-2 h-8 w-8" />
                    <p>No Connect Shiksha Shares found</p>
                          </div>
                        )}
              </div>
            </div>

            {/* Team Members' Shares */}
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg border border-blue-200">
              <div className="bg-blue-600 text-white p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold flex items-center">
                  <FiUsers className="mr-2" />
                  Team Members Shares
                </h3>
                <p className="text-blue-100 text-sm mt-1">30% shared equally among eligible members</p>
              </div>
              
              <div className="p-4 max-h-96 overflow-y-auto">
                {payouts.filter((payout: any) => payout.userId?.email !== 'admin@connectshiksha.com').map((payout: any) => (
                  <div key={payout._id} className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-blue-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{payout.userId?.name}</h4>
                        <p className="text-sm text-gray-600">{payout.userId?.email}</p>
                        <p className="text-xs text-blue-600">{payout.projectId?.title || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">
                          ₹{(payout.profitShare || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Team Share</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-gray-600 text-xs">
                          Base: ₹{(payout.baseSalary || 0).toLocaleString()}
                        </span>
                        <span className="text-gray-600 text-xs">
                          Bonuses: ₹{(payout.bonuses || 0).toLocaleString()}
                        </span>
                        <span className="text-red-600 text-xs">
                          Deductions: ₹{(payout.deductions || 0).toLocaleString()}
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
                
                {payouts.filter((payout: any) => payout.userId?.email !== 'admin@connectshiksha.com').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FiUsers className="mx-auto mb-2 h-8 w-8" />
                    <p>No team member shares found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

              {payouts.length === 0 && (
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
      </div>
    </div>
  );
}

