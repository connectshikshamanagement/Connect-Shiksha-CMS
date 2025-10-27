const express = require('express');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Payroll = require('../models/Payroll');
const { protect, authorize } = require('../middleware/auth');
const { getBudgetWarnings, getProjectFinancialSummary } = require('../utils/budgetTracking');

const router = express.Router();

router.use(protect);

// Get team-wise financial summary
router.get('/team-summary', authorize('finance.read'), async (req, res) => {
  try {
    const { month } = req.query;
    
    // Get current month if not specified
    const currentDate = new Date();
    const targetMonth = month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const [year, monthNum] = targetMonth.split('-');
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0);

    // Get all teams
    const teams = await Team.find({ active: true }).populate('leadUserId', 'name email');

    // Get team-wise financial data
    const teamFinancials = await Promise.all(
      teams.map(async (team) => {
        // Calculate team expenses for the month
        const teamExpenses = await Expense.aggregate([
          {
            $match: {
              teamId: team._id,
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalExpense: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);

        // Calculate team income for the month
        const teamIncome = await Income.aggregate([
          {
            $match: {
              teamId: team._id,
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);

        // Calculate team payroll for the month
        const teamPayroll = await Payroll.aggregate([
          {
            $match: {
              teamId: team._id,
              month: targetMonth
            }
          },
          {
            $group: {
              _id: null,
              totalPayroll: { $sum: '$salaryAmount' },
              pendingPayroll: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'pending'] }, '$salaryAmount', 0]
                }
              },
              paidPayroll: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'paid'] }, '$salaryAmount', 0]
                }
              },
              count: { $sum: 1 }
            }
          }
        ]);

        const totalExpense = teamExpenses.length > 0 ? teamExpenses[0].totalExpense : 0;
        const totalIncome = teamIncome.length > 0 ? teamIncome[0].totalIncome : 0;
        const totalPayroll = teamPayroll.length > 0 ? teamPayroll[0].totalPayroll : 0;
        const pendingPayroll = teamPayroll.length > 0 ? teamPayroll[0].pendingPayroll : 0;
        const paidPayroll = teamPayroll.length > 0 ? teamPayroll[0].paidPayroll : 0;

        const remainingBudget = team.monthlyBudget - totalExpense;
        const creditUsed = Math.max(0, totalExpense - team.monthlyBudget);
        const netProfit = totalIncome - totalExpense - totalPayroll;

        return {
          teamId: team._id,
          teamName: team.name,
          category: team.category,
          leadUserId: team.leadUserId,
          monthlyBudget: team.monthlyBudget,
          creditLimit: team.creditLimit,
          totalIncome,
          totalExpense,
          totalPayroll,
          pendingPayroll,
          paidPayroll,
          remainingBudget,
          creditUsed,
          netProfit,
          memberCount: team.members?.length || 0
        };
      })
    );

    res.status(200).json({
      success: true,
      data: teamFinancials,
      month: targetMonth
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get project-wise financial summary
router.get('/project-summary', authorize('finance.read'), async (req, res) => {
  try {
    const { month } = req.query;
    
    // Get current month if not specified
    const currentDate = new Date();
    const targetMonth = month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const [year, monthNum] = targetMonth.split('-');
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0);

    // Get all projects
    const projects = await Project.find()
      .populate('teamId', 'name category')
      .populate('ownerId', 'name email');

    // Get project-wise financial data
    const projectFinancials = await Promise.all(
      projects.map(async (project) => {
        // Calculate project expenses for the month
        // Only include expenses with projectId matching this project
        const teamIdForQuery = project.teamId._id || project.teamId;
        
        const projectExpenses = await Expense.aggregate([
          {
            $match: {
              teamId: teamIdForQuery,
              projectId: project._id,
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalExpense: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);

        // Calculate project income for the month
        // Only include income with sourceRefId matching this project
        const projectIncome = await Income.aggregate([
          {
            $match: {
              teamId: teamIdForQuery,
              sourceRefId: project._id,
              sourceRefModel: 'Project',
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);

        const totalExpense = projectExpenses.length > 0 ? projectExpenses[0].totalExpense : 0;
        const totalIncome = projectIncome.length > 0 ? projectIncome[0].totalIncome : 0;
        const allocatedBudget = project.allocatedBudget || 0;
        const budgetExceeded = totalExpense > allocatedBudget;

        return {
          projectId: project._id,
          projectName: project.title,
          category: project.category,
          status: project.status,
          teamId: project.teamId,
          ownerId: project.ownerId,
          allocatedBudget,
          totalIncome,
          totalExpense,
          investmentAmount: project.investmentAmount || 0,
          netProfit: totalIncome - totalExpense,
          budgetExceeded,
          progress: project.progress || 0,
          startDate: project.startDate,
          endDate: project.endDate
        };
      })
    );

    res.status(200).json({
      success: true,
      data: projectFinancials,
      month: targetMonth
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update team budget
router.put('/team/:teamId/budget', authorize('finance.update'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { monthlyBudget, creditLimit } = req.body;

    // Validate teamId
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Team ID'
      });
    }

    // Validate budget values
    if (monthlyBudget < 0 || creditLimit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Budget values cannot be negative'
      });
    }

    const team = await Team.findByIdAndUpdate(
      teamId,
      { monthlyBudget, creditLimit },
      { new: true, runValidators: true }
    ).populate('leadUserId', 'name email');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reset team budgets for new month
router.post('/reset-budgets', authorize('finance.update'), async (req, res) => {
  try {
    const { month } = req.body;
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month is required (YYYY-MM format)'
      });
    }

    // This would typically reset monthly budget tracking
    // For now, we'll just return success as the budget validation happens dynamically
    res.status(200).json({
      success: true,
      message: `Budget tracking reset for ${month}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get budget warnings for all projects
router.get('/budget-warnings', authorize('finance.read'), async (req, res) => {
  try {
    const warnings = await getBudgetWarnings();
    
    res.json({
      success: true,
      data: warnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get project financial summary with budget tracking
router.get('/project-summary/:projectId', authorize('finance.read'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const summary = await getProjectFinancialSummary(projectId);
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get financial summary for payroll page
router.get('/summary', authorize('finance.read'), async (req, res) => {
  try {
    const { month, year, projectId, teamId } = req.query;
    
    // Get current month/year if not specified
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();
    
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0);

    // Build query filters
    const incomeQuery = {
      date: { $gte: startOfMonth, $lte: endOfMonth }
    };
    const expenseQuery = {
      date: { $gte: startOfMonth, $lte: endOfMonth }
    };

    if (projectId) {
      // If projectId is specified, get income by sourceRefId for that project
      const project = await Project.findById(projectId).populate('teamId');
      if (project && project.teamId) {
        // Use $or to check both teamId and sourceRefId
        incomeQuery.$or = [
          { teamId: project.teamId._id },
          { sourceRefId: projectId }
        ];
        expenseQuery.teamId = project.teamId._id;
        expenseQuery.projectId = projectId;
      }
    } else if (teamId) {
      incomeQuery.teamId = teamId;
      expenseQuery.teamId = teamId;
    }

    // Get total income - prioritize project-linked income (sourceRefId) over team income
    let totalIncome = 0;
    
    if (projectId) {
      // For specific project, get income by sourceRefId
      console.log('🔍 Filtering income for projectId:', projectId);
      
      // Try both sourceRefId and team-based query
      const project = await Project.findById(projectId).populate('teamId');
      
      if (project && project.teamId) {
        // Get income from the project's team (more inclusive)
        const projectIncomeResult = await Income.aggregate([
          { 
            $match: { 
              date: { $gte: startOfMonth, $lte: endOfMonth },
              $or: [
                { sourceRefId: projectId, sourceRefModel: 'Project' },
                { teamId: project.teamId._id }
              ]
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        totalIncome = projectIncomeResult.length > 0 ? projectIncomeResult[0].total : 0;
        console.log('💰 Total income found:', totalIncome);
      } else {
        const projectIncomeResult = await Income.aggregate([
          { 
            $match: { 
              date: { $gte: startOfMonth, $lte: endOfMonth },
              sourceRefId: projectId,
              sourceRefModel: 'Project'
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        totalIncome = projectIncomeResult.length > 0 ? projectIncomeResult[0].total : 0;
      }
    } else if (teamId) {
      // For specific team, get income by teamId
      const teamIncomeResult = await Income.aggregate([
        { 
          $match: { 
            date: { $gte: startOfMonth, $lte: endOfMonth },
            teamId: teamId
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalIncome = teamIncomeResult.length > 0 ? teamIncomeResult[0].total : 0;
    } else {
      // For all data, get all income records
      // This will include both project-linked (sourceRefId) and team-linked (teamId only) income
      const allIncomeResult = await Income.aggregate([
        { 
          $match: { 
            date: { $gte: startOfMonth, $lte: endOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalIncome = allIncomeResult.length > 0 ? allIncomeResult[0].total : 0;
    }

    // Get total expenses - use a single query to avoid duplicates
    let totalExpenses = 0;
    
    if (projectId) {
      // For specific project, get expenses by projectId
      console.log('🔍 Filtering expenses for projectId:', projectId);
      
      // Get the project to access its teamId
      const project = await Project.findById(projectId).populate('teamId');
      
      if (project && project.teamId) {
        // Get expenses from the project's team (more inclusive)
        const projectExpensesResult = await Expense.aggregate([
          { 
            $match: { 
              date: { $gte: startOfMonth, $lte: endOfMonth },
              $or: [
                { projectId: projectId },
                { teamId: project.teamId._id }
              ]
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        totalExpenses = projectExpensesResult.length > 0 ? projectExpensesResult[0].total : 0;
        console.log('💸 Total expenses found:', totalExpenses);
      } else {
        const projectExpensesResult = await Expense.aggregate([
          { 
            $match: { 
              date: { $gte: startOfMonth, $lte: endOfMonth },
              projectId: projectId
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        totalExpenses = projectExpensesResult.length > 0 ? projectExpensesResult[0].total : 0;
      }
    } else if (teamId) {
      // For specific team, get expenses by teamId
      const teamExpensesResult = await Expense.aggregate([
        { 
          $match: { 
            date: { $gte: startOfMonth, $lte: endOfMonth },
            teamId: teamId
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalExpenses = teamExpensesResult.length > 0 ? teamExpensesResult[0].total : 0;
    } else {
      // For all data, get all expenses
      const allExpensesResult = await Expense.aggregate([
        { 
          $match: { 
            date: { $gte: startOfMonth, $lte: endOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalExpenses = allExpensesResult.length > 0 ? allExpensesResult[0].total : 0;
    }

    // Get project breakdown for income
    // Use sourceRefId to get project name for project-linked income
    const projectBreakdownMatch = { 
      date: { $gte: startOfMonth, $lte: endOfMonth }
    };
    
    if (projectId) {
      projectBreakdownMatch.sourceRefId = projectId;
      projectBreakdownMatch.sourceRefModel = 'Project';
    }
    
    const projectBreakdownResult = await Income.aggregate([
      { 
        $match: projectBreakdownMatch
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'sourceRefId',
          foreignField: '_id',
          as: 'project'
        }
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$project.title',
          total: { $sum: '$amount' }
        }
      }
    ]);
    const projectBreakdown = {};
    projectBreakdownResult.forEach(item => {
      projectBreakdown[item._id || 'No Project'] = item.total;
    });

    // Get expense breakdown by category
    const expenseBreakdownMatch = { 
      date: { $gte: startOfMonth, $lte: endOfMonth }
    };
    
    if (projectId) {
      expenseBreakdownMatch.projectId = projectId;
    } else if (teamId) {
      expenseBreakdownMatch.teamId = teamId;
    }
    
    const expenseBreakdownResult = await Expense.aggregate([
      { 
        $match: expenseBreakdownMatch
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]);
    const expenseBreakdown = {};
    expenseBreakdownResult.forEach(item => {
      expenseBreakdown[item._id || 'Uncategorized'] = item.total;
    });

    // Get top performing projects - use sourceRefId for project-linked income
    const topProjectsMatch = { 
      date: { $gte: startOfMonth, $lte: endOfMonth }
    };
    
    if (projectId) {
      topProjectsMatch.sourceRefId = projectId;
      topProjectsMatch.sourceRefModel = 'Project';
    }
    
    const topProjectsResult = await Income.aggregate([
      { 
        $match: topProjectsMatch
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'sourceRefId',
          foreignField: '_id',
          as: 'project'
        }
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$project._id',
          title: { $first: '$project.title' },
          income: { $sum: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'projectId',
          as: 'expenses'
        }
      },
      {
        $addFields: {
          expenses: {
            $sum: {
              $map: {
                input: '$expenses',
                as: 'exp',
                in: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ['$$exp.date', startOfMonth] },
                        { $lte: ['$$exp.date', endOfMonth] }
                      ]
                    },
                    '$$exp.amount',
                    0
                  ]
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          profit: { $subtract: ['$income', '$expenses'] }
        }
      },
      { $sort: { profit: -1 } },
      { $limit: 5 }
    ]);

    // Calculate net profit and profit margin
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Get total budget from all projects
    // Use allocatedBudget if available, otherwise fallback to budget field
    let totalBudget = 0;
    if (!projectId && !teamId) {
      // Get all projects with their budgets
      const projects = await Project.find({}).select('allocatedBudget budget');
      totalBudget = projects.reduce((sum, project) => {
        const budget = project.allocatedBudget || project.budget || 0;
        return sum + budget;
      }, 0);
    } else if (projectId) {
      const project = await Project.findById(projectId);
      totalBudget = project ? (project.allocatedBudget || project.budget || 0) : 0;
    } else if (teamId) {
      // Get projects for the specified team
      const projects = await Project.find({ teamId: teamId }).select('allocatedBudget budget');
      totalBudget = projects.reduce((sum, project) => {
        const budget = project.allocatedBudget || project.budget || 0;
        return sum + budget;
      }, 0);
    }

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netProfit,
        totalBudget,
        profitMargin,
        projectBreakdown,
        expenseBreakdown,
        topProjects: topProjectsResult,
        period: {
          month: targetMonth,
          year: targetYear,
          startDate: startOfMonth,
          endDate: endOfMonth
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
