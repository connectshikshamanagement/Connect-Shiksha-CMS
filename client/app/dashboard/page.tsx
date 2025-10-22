'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardAPI } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiShoppingBag,
  FiCalendar,
  FiUsers,
  FiFolder,
  FiCheckSquare,
} from 'react-icons/fi';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [teamProjects, setTeamProjects] = useState<any[]>([]);
  const [projectFinancials, setProjectFinancials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFounder, isManager, isMember } = usePermissions();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchAnalytics();
    if (isMember) {
      fetchTeamProjects();
      fetchProjectFinancials();
    }
  }, [router]);

  const fetchAnalytics = async () => {
    try {
      const response = await dashboardAPI.getAnalytics();
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamProjects = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/my-team-projects`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setTeamProjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching team projects:', error);
    }
  };

  const fetchProjectFinancials = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/my-project-financials`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setProjectFinancials(data.data);
      }
    } catch (error) {
      console.error('Error fetching project financials:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const { financialSummary, monthlyIncome, monthlyExpenses, taskStats } = analytics || {};

  // Prepare chart data
  const incomeExpenseData = [
    { month: 'Jan', income: 0, expenses: 0 },
    { month: 'Feb', income: 0, expenses: 0 },
    { month: 'Mar', income: 0, expenses: 0 },
    { month: 'Apr', income: 0, expenses: 0 },
    { month: 'May', income: 0, expenses: 0 },
    { month: 'Jun', income: 0, expenses: 0 },
    { month: 'Jul', income: 0, expenses: 0 },
    { month: 'Aug', income: 0, expenses: 0 },
    { month: 'Sep', income: 0, expenses: 0 },
    { month: 'Oct', income: 225000, expenses: 400000 },
    { month: 'Nov', income: 0, expenses: 0 },
    { month: 'Dec', income: 0, expenses: 0 },
  ];

  const taskStatusData = taskStats || [
    { name: 'To Do', value: 5, color: '#6b7280' },
    { name: 'In Progress', value: 3, color: '#3b82f6' },
    { name: 'Review', value: 2, color: '#f59e0b' },
    { name: 'Done', value: 8, color: '#10b981' },
  ];

  const COLORS = ['#6b7280', '#3b82f6', '#f59e0b', '#10b981'];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Dashboard" />

        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Income"
              value={`₹${financialSummary?.totalIncome?.toLocaleString() || 0}`}
              icon={<FiDollarSign className="h-8 w-8" />}
              color="bg-green-500"
              trend="+12.5%"
            />
            <StatCard
              title="Total Expenses"
              value={`₹${financialSummary?.totalExpenses?.toLocaleString() || 0}`}
              icon={<FiTrendingDown className="h-8 w-8" />}
              color="bg-red-500"
              trend="+8.2%"
            />
            <StatCard
              title="Net Profit"
              value={`₹${financialSummary?.netProfit?.toLocaleString() || 0}`}
              icon={<FiTrendingUp className="h-8 w-8" />}
              color="bg-blue-500"
              trend={financialSummary?.netProfit >= 0 ? '+' : '-'}
            />
            <StatCard
              title="Active Projects"
              value="3"
              icon={<FiFolder className="h-8 w-8" />}
              color="bg-purple-500"
            />
          </div>

          {/* Team Member Project Financial Overview */}
          {isMember && teamProjects.length > 0 && (
            <div className="mt-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FiFolder className="mr-2" />
                My Team Projects - Financial Overview
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamProjects.map((project: any) => (
                  <div key={project._id} className="bg-white bg-opacity-20 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-white text-sm">{project.title}</h4>
                        <p className="text-blue-100 text-xs">{project.category}</p>
                        <p className="text-blue-100 text-xs">Status: {project.status}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-green-100">Income:</span>
                        <span className="text-white font-semibold">₹{project.totalIncome?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-red-100">Expenses:</span>
                        <span className="text-white font-semibold">₹{project.totalExpense?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-white border-opacity-20 pt-2">
                        <span className="text-blue-100 font-medium">Net Profit:</span>
                        <span className={`font-bold ${(project.totalIncome - project.totalExpense) >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                          ₹{((project.totalIncome || 0) - (project.totalExpense || 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-100">Budget:</span>
                        <span className="text-white">₹{project.allocatedBudget?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-100">Progress:</span>
                        <span className="text-white">{project.progress || 0}%</span>
                      </div>
                    </div>
                    
                    {project.progress > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                          <div 
                            className="bg-white h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {teamProjects.length === 0 && (
                <div className="text-center py-8">
                  <FiFolder className="mx-auto mb-2 h-8 w-8 text-blue-200" />
                  <p className="text-blue-100">No projects assigned to your team yet</p>
                </div>
              )}
            </div>
          )}

          {/* Detailed Project Financial Summary */}
          {isMember && projectFinancials.length > 0 && (
            <div className="mt-8 rounded-lg bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-6 flex items-center text-gray-800">
                <FiDollarSign className="mr-2" />
                Detailed Project Financial Summary
              </h3>
              
              <div className="space-y-6">
                {projectFinancials.map((project: any) => (
                  <div key={project._id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">{project.title}</h4>
                        <p className="text-sm text-gray-600">{project.category} • {project.teamName}</p>
                        <p className="text-xs text-gray-500">Status: {project.status}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${project.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{project.netProfit?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-500">Net Profit</div>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-600">Total Income</p>
                            <p className="text-2xl font-bold text-green-700">
                              ₹{project.totalIncome?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <FiTrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                        {project.incomeBreakdown && Object.keys(project.incomeBreakdown).length > 0 && (
                          <div className="mt-3 text-xs text-green-600">
                            {Object.entries(project.incomeBreakdown).map(([source, amount]: [string, any]) => (
                              <div key={source} className="flex justify-between">
                                <span>{source}:</span>
                                <span>₹{amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-red-600">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-700">
                              ₹{project.totalExpense?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <FiTrendingDown className="h-8 w-8 text-red-500" />
                        </div>
                        {project.expenseBreakdown && Object.keys(project.expenseBreakdown).length > 0 && (
                          <div className="mt-3 text-xs text-red-600">
                            {Object.entries(project.expenseBreakdown).map(([category, amount]: [string, any]) => (
                              <div key={category} className="flex justify-between">
                                <span>{category}:</span>
                                <span>₹{amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600">Budget Utilization</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {project.budgetUtilization || 0}%
                            </p>
                          </div>
                          <FiCalendar className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(project.budgetUtilization || 0, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            ₹{project.allocatedBudget?.toLocaleString() || '0'} allocated
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Team Member Profit Sharing Information */}
                    {project.profitSharing && (
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h5 className="font-semibold text-purple-800 mb-3">Your Project Share</h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-white p-3 rounded border border-purple-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-purple-700">Project Income</span>
                              <span className="font-bold text-purple-800">
                                ₹{project.totalIncome?.toLocaleString() || '0'}
                              </span>
                            </div>
                            <div className="text-xs text-purple-600">
                              Total income generated
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded border border-purple-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-purple-700">Project Budget</span>
                              <span className="font-bold text-purple-800">
                                ₹{project.allocatedBudget?.toLocaleString() || '0'}
                              </span>
                            </div>
                            <div className="text-xs text-purple-600">
                              Allocated budget
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded border border-purple-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-purple-700">Project Expenses</span>
                              <span className="font-bold text-purple-800">
                                ₹{project.totalExpense?.toLocaleString() || '0'}
                              </span>
                            </div>
                            <div className="text-xs text-purple-600">
                              Total expenses incurred
                            </div>
                          </div>
                        </div>
                        
                        {project.profitSharing.myShare && (
                          <div className="mt-3 bg-gradient-to-r from-green-400 to-blue-500 text-white p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">Your Share from {project.title}</span>
                              <span className="text-xl font-bold">₹{project.profitSharing.myShare.toLocaleString()}</span>
                            </div>
                            <div className="text-sm text-green-100 mt-1">
                              Based on your contribution to this project
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Project Progress */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Project Progress</span>
                        <span className="text-sm font-bold text-gray-900">{project.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${project.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Income vs Expenses Chart */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                Income vs Expenses (Monthly)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Income" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Task Status Distribution */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                Task Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskStatusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title="New Project"
              description="Create a new project"
              icon={<FiFolder className="h-8 w-8" />}
              color="bg-blue-500"
              href="/dashboard/projects"
            />
            <QuickActionCard
              title="Add Task"
              description="Create a new task"
              icon={<FiCheckSquare className="h-8 w-8" />}
              color="bg-green-500"
              href="/dashboard/tasks"
            />
            <QuickActionCard
              title="Record Income"
              description="Log new income"
              icon={<FiDollarSign className="h-8 w-8" />}
              color="bg-yellow-500"
              href="/dashboard/finance"
            />
            <QuickActionCard
              title="Add Client"
              description="New lead or client"
              icon={<FiUsers className="h-8 w-8" />}
              color="bg-purple-500"
              href="/dashboard/clients"
            />
          </div>

          {/* Recent Activity */}
          <div className="mt-8 rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Recent Activity
            </h3>
            <div className="space-y-4">
              <ActivityItem
                title="New income recorded: ₹50,000"
                subtitle="Coaching batch payment"
                time="2 hours ago"
                icon={<FiDollarSign />}
                color="text-green-600"
              />
              <ActivityItem
                title="Profit sharing computed"
                subtitle="₹15,000 distributed to mentors"
                time="2 hours ago"
                icon={<FiTrendingUp />}
                color="text-blue-600"
              />
              <ActivityItem
                title="New project created"
                subtitle="Robotics Workshop - Schools"
                time="5 hours ago"
                icon={<FiFolder />}
                color="text-purple-600"
              />
              <ActivityItem
                title="Task completed"
                subtitle="Design workshop materials"
                time="1 day ago"
                icon={<FiCheckSquare />}
                color="text-green-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend }: any) {
  return (
    <div className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`mt-2 text-sm ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {trend} from last month
            </p>
          )}
        </div>
        <div className={`${color} rounded-full p-3 text-white`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon, color, href }: any) {
  return (
    <a
      href={href}
      className="block rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg hover:scale-105"
    >
      <div className={`${color} mb-4 inline-block rounded-lg p-3 text-white`}>
        {icon}
      </div>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </a>
  );
}

function ActivityItem({ title, subtitle, time, icon, color }: any) {
  return (
    <div className="flex items-start space-x-4 border-l-4 border-primary-500 pl-4">
      <div className={`mt-1 ${color}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
        <p className="mt-1 text-xs text-gray-400">{time}</p>
      </div>
    </div>
  );
}
