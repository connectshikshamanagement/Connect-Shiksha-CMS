'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardAPI, enhancedTaskAPI, enhancedExpenseAPI, financeAPI, projectAPI, teamPerformanceAPI, userAPI } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiFolder,
  FiCheckSquare,
  FiActivity,
} from 'react-icons/fi';
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
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const { isFounder, isProjectManager, isMember } = usePermissions();
  const isManager = isProjectManager;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchAnalytics();
    if (isFounder) {
      fetchTeamMembers();
    }
  }, [router, isFounder]);

  const getCurrentUserAndTeam = () => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return { userId: null, teamId: null };
      const user = JSON.parse(raw);
      const userId = user?._id || null;
      const history = Array.isArray(user?.teamHistory) ? user.teamHistory : [];
      const active = history.find((h: any) => h.isActive) || history[history.length - 1];
      const teamId = active?.teamId || null;
      return { userId, teamId };
    } catch {
      return { userId: null, teamId: null };
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await userAPI.getAll();
      if (response.data.success) {
        setTeamMembers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      if (isFounder) {
        const response = await dashboardAPI.getAnalytics();
        if (response.data.success) {
          setAnalytics(response.data.data);
        }
        return;
      }

      const { userId, teamId } = getCurrentUserAndTeam();

      // Fallback to global if missing identifiers
      if (!userId) {
        const response = await dashboardAPI.getAnalytics();
        if (response.data.success) setAnalytics(response.data.data);
        return;
      }

      // Build scoped analytics for Manager/Member
      const requests: Promise<any>[] = [];

      // Tasks
      if (isManager && teamId) {
        requests.push(enhancedTaskAPI.getTaskAnalytics(teamId));
      } else {
        requests.push(enhancedTaskAPI.getTasksByUser(userId));
      }

      // Expenses (summary by team if manager)
      if (isManager && teamId) {
        requests.push(enhancedExpenseAPI.getExpenseAnalytics(teamId));
      } else {
        requests.push(enhancedExpenseAPI.getExpensesByUser(userId));
      }

      // Finance team summary (manager only)
      if (isManager && teamId) {
        requests.push(financeAPI.getTeamSummary({ teamId }));
      } else {
        requests.push(Promise.resolve({ data: { data: null, success: true } }));
      }

      // Projects
      if (isManager) {
        requests.push(projectAPI.getMyTeamProjects());
      } else {
        requests.push(projectAPI.getMyProjectFinancials());
      }

      // Team performance (manager scoped)
      if (isManager && teamId) {
        requests.push(teamPerformanceAPI.getTeamAnalytics(teamId));
      } else {
        requests.push(Promise.resolve({ data: { data: [] , success: true } }));
      }

      const [taskRes, expenseRes, teamFinRes, projectsRes, teamPerfRes] = await Promise.all(requests);

      // Derive task status counts
      let taskStatuses = { todo: 0, in_progress: 0, review: 0, done: 0 } as any;
      if (isManager) {
        const analyticsData = taskRes?.data?.data || {};
        taskStatuses = {
          todo: analyticsData.todo || 0,
          in_progress: analyticsData.in_progress || 0,
          review: analyticsData.review || 0,
          done: analyticsData.done || 0,
        };
      } else {
        const tasks = taskRes?.data?.data || [];
        tasks.forEach((t: any) => {
          if (taskStatuses[t.status] !== undefined) taskStatuses[t.status] += 1;
        });
      }

      // Financials minimal (scope-aware)
      const incomeTotal = isManager ? (teamFinRes?.data?.data?.incomeTotal || 0) : 0;
      const incomeCount = isManager ? (teamFinRes?.data?.data?.incomeCount || 0) : 0;
      const expenseTotal = isManager ? (teamFinRes?.data?.data?.expenseTotal || 0) : (Array.isArray(expenseRes?.data?.data) ? expenseRes.data.data.reduce((s: number, e: any) => s + (e.amount || 0), 0) : 0);
      const expenseCount = isManager ? (teamFinRes?.data?.data?.expenseCount || 0) : (Array.isArray(expenseRes?.data?.data) ? expenseRes.data.data.length : 0);

      const overview = {
        totalUsers: isManager ? (teamFinRes?.data?.data?.memberCount || 0) : undefined,
        totalTeams: isManager ? 1 : undefined,
        totalProjects: Array.isArray(projectsRes?.data?.data) ? projectsRes.data.data.length : (projectsRes?.data?.data?.length || 0),
        totalTasks: isManager ? (taskStatuses.todo + taskStatuses.in_progress + taskStatuses.review + taskStatuses.done) : undefined,
        totalClients: undefined,
      } as any;

      const monthlyFinancials = {
        income: { total: incomeTotal, count: incomeCount },
        expenses: { total: expenseTotal, count: expenseCount },
        payroll: { total: 0, count: 0 },
        netProfit: incomeTotal - expenseTotal,
      };

      const analyticsScoped = {
        overview,
        monthlyFinancials,
        taskStatuses,
        teamPerformance: teamPerfRes?.data?.data || [],
      };

      setAnalytics(analyticsScoped);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto pt-16 md:pt-0">
          <Header title="Dashboard" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <p className="text-xl text-gray-600">No data available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { monthlyFinancials, overview, taskStatuses } = analytics;

  // Task status data for pie chart
  const taskStatusData = [
    { name: 'To Do', value: taskStatuses?.todo || 0, color: '#6b7280' },
    { name: 'In Progress', value: taskStatuses?.in_progress || 0, color: '#3b82f6' },
    { name: 'Review', value: taskStatuses?.review || 0, color: '#f59e0b' },
    { name: 'Done', value: taskStatuses?.done || 0, color: '#10b981' },
  ];

  // Prepare recent months data
  const recentMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Dashboard" />

        <div className="p-4 md:p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {isFounder && (
              <>
                <StatCard
                  title="Total Income"
                  value={`₹${(monthlyFinancials?.income?.total || 0).toLocaleString()}`}
                  icon={<FiDollarSign className="h-8 w-8" />}
                  color="bg-green-500"
                  subtitle={`${monthlyFinancials?.income?.count || 0} transactions`}
                />
                <StatCard
                  title="Total Expenses"
                  value={`₹${(monthlyFinancials?.expenses?.total || 0).toLocaleString()}`}
                  icon={<FiTrendingDown className="h-8 w-8" />}
                  color="bg-red-500"
                  subtitle={`${monthlyFinancials?.expenses?.count || 0} transactions`}
                />
                <StatCard
                  title="Net Profit"
                  value={`₹${(monthlyFinancials?.netProfit || 0).toLocaleString()}`}
                  icon={<FiTrendingUp className="h-8 w-8" />}
                  color={(monthlyFinancials?.netProfit || 0) >= 0 ? 'bg-blue-500' : 'bg-orange-500'}
                  subtitle={monthlyFinancials?.netProfit >= 0 ? 'Profitable' : 'In Loss'}
                />
              </>
            )}
            <StatCard
              title="Total Projects"
              value={overview?.totalProjects || 0}
              icon={<FiFolder className="h-8 w-8" />}
              color="bg-purple-500"
              subtitle="Active projects"
            />
          </div>

          {/* Additional Stats for Founder/Manager */}
          {(isFounder || isManager) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatCard
                title="Total Users"
                value={overview?.totalUsers || 0}
                icon={<FiUsers className="h-8 w-8" />}
                color="bg-indigo-500"
                subtitle="Active members"
              />
              <StatCard
                title="Total Teams"
                value={overview?.totalTeams || 0}
                icon={<FiActivity className="h-8 w-8" />}
                color="bg-cyan-500"
                subtitle="Organization teams"
              />
              <StatCard
                title="Total Tasks"
                value={overview?.totalTasks || 0}
                icon={<FiCheckSquare className="h-8 w-8" />}
                color="bg-emerald-500"
                subtitle="All tasks"
              />
              <StatCard
                title="Total Clients"
                value={overview?.totalClients || 0}
                icon={<FiUsers className="h-8 w-8" />}
                color="bg-pink-500"
                subtitle="Clients & leads"
              />
            </div>
          )}

          {/* Team Member IDs Section - Admin Only */}
          {isFounder && teamMembers.length > 0 && (
            <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Team Member IDs</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {teamMembers
                  .filter((u: any) => u.teamCode)
                  .sort((a: any, b: any) => (a.teamCode || '').localeCompare(b.teamCode || ''))
                  .map((user: any) => (
                    <div
                      key={user._id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-semibold text-primary-700 text-lg mb-1">{user.teamCode}</div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{user.email}</div>
                      <div className="mt-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.roleIds?.[0]?.key === 'FOUNDER' ? 'bg-purple-100 text-purple-800' :
                          user.roleIds?.[0]?.key === 'PROJECT_MANAGER' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.roleIds?.[0]?.name || 'No Role'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {isFounder && (
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-800">Financial Overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    {
                      category: 'Current',
                      income: monthlyFinancials?.income?.total || 0,
                      expenses: monthlyFinancials?.expenses?.total || 0,
                    }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="Income" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Task Distribution */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Task Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.value > 0 ? `${entry.name}: ${entry.value}` : ''}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title="Projects"
              description="Manage projects"
              icon={<FiFolder className="h-6 w-6" />}
              href="/dashboard/projects"
            />
            <QuickActionCard
              title="Tasks"
              description="View tasks"
              icon={<FiCheckSquare className="h-6 w-6" />}
              href="/dashboard/tasks"
            />
            <QuickActionCard
              title="Finance"
              description="Income & Expenses"
              icon={<FiDollarSign className="h-6 w-6" />}
              href="/dashboard/finance"
            />
            <QuickActionCard
              title="Team"
              description="Manage team"
              icon={<FiUsers className="h-6 w-6" />}
              href="/dashboard/teams"
            />
          </div>

          {/* Team Performance (if available) */}
          {analytics?.teamPerformance && analytics.teamPerformance.length > 0 && (
            <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Team Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Team
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Budget Used
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Utilization
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.teamPerformance.map((team: any) => (
                      <tr key={team._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{team.name}</div>
                          <div className="text-sm text-gray-500">{team.category}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          ₹{(team.totalExpenses || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.min(team.budgetUtilization || 0, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {team.budgetUtilization?.toFixed(1) || 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile Components */}
        <FABMenu />
        <MobileNavbar />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle }: any) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`${color} rounded-lg p-3 text-white flex-shrink-0 ml-4`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon, href }: any) {
  return (
    <a
      href={href}
      className="block rounded-lg bg-white p-5 shadow-sm transition-all hover:shadow-md border border-gray-100 group"
    >
      <div className="flex items-center space-x-4">
        <div className="rounded-lg bg-primary-100 p-3 text-primary-600 group-hover:bg-primary-200 transition-colors">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </a>
  );
}
