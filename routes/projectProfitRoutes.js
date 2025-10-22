const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { restrictToRole, restrictToRoles, canAccessProject } = require('../middleware/roleAccess');
const { 
  computeProjectProfitSharing, 
  getProjectProfitSummary,
  computeAllProjectsProfitSharing 
} = require('../utils/projectProfitSharing');
const Project = require('../models/Project');
const Payroll = require('../models/Payroll');
const Income = require('../models/Income');
const Expense = require('../models/Expense');

const router = express.Router();

router.use(protect);

// Compute profit sharing for a specific project (Founder and Team Managers only)
router.post('/compute/:projectId', 
  restrictToRoles(['FOUNDER', 'TEAM_MANAGER']),
  canAccessProject,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      
      const result = await computeProjectProfitSharing(projectId);
      
      res.status(200).json({
        success: true,
        message: 'Profit sharing computed successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get project profit summary
router.get('/summary/:projectId',
  restrictToRoles(['FOUNDER', 'TEAM_MANAGER', 'TEAM_MEMBER']),
  canAccessProject,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      
      const summary = await getProjectProfitSummary(projectId);
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Compute profit sharing for all active projects (Founder only)
router.post('/compute-all',
  restrictToRole('FOUNDER'),
  async (req, res) => {
    try {
      const results = await computeAllProjectsProfitSharing();
      
      res.status(200).json({
        success: true,
        message: 'Profit sharing computed for all projects',
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get payroll records for a project
router.get('/payroll/:projectId',
  restrictToRoles(['FOUNDER', 'TEAM_MANAGER', 'TEAM_MEMBER']),
  canAccessProject,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { month, year } = req.query;
      
      let query = { projectId };
      if (month && year) {
        query.month = `${year}-${month.toString().padStart(2, '0')}`;
      }
      
      const payrollRecords = await Payroll.find(query)
        .populate('userId', 'name email')
        .populate('teamId', 'name')
        .populate('projectId', 'title')
        .sort('-createdAt');
      
      res.status(200).json({
        success: true,
        count: payrollRecords.length,
        data: payrollRecords
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get user's profit shares (for their own records)
router.get('/my-shares',
  async (req, res) => {
    try {
      const { month, year } = req.query;
      
      let query = { userId: req.user.id };
      if (month && year) {
        query.month = `${year}-${month.toString().padStart(2, '0')}`;
      }
      
      const myShares = await Payroll.find(query)
        .populate('projectId', 'title category allocatedBudget')
        .populate('teamId', 'name monthlyBudget')
        .sort('-createdAt');
      
      // Add project financial data to each record
      const mySharesWithFinancials = await Promise.all(
        myShares.map(async (record) => {
          let projectIncome = 0;
          let projectExpenses = 0;
          let projectBudget = 0;

          // If record has a projectId, get project-specific data
          if (record.projectId) {
            // Get project income (using sourceRefId and sourceRefModel)
            const incomes = await Income.find({ 
              sourceRefId: record.projectId._id,
              sourceRefModel: 'Project'
            });
            projectIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

            // Get project expenses (using projectId)
            const expenses = await Expense.find({ 
              projectId: record.projectId._id 
            });
            projectExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

            // Get project budget
            projectBudget = record.projectId.allocatedBudget || 0;
          } else {
            // If no projectId, get team-level data as fallback
            // Get team income
            const teamIncomes = await Income.find({ 
              teamId: record.teamId._id 
            });
            projectIncome = teamIncomes.reduce((sum, income) => sum + income.amount, 0);

            // Get team expenses
            const teamExpenses = await Expense.find({ 
              teamId: record.teamId._id 
            });
            projectExpenses = teamExpenses.reduce((sum, expense) => sum + expense.amount, 0);

            // Get team budget
            projectBudget = record.teamId.monthlyBudget || 0;
          }

          return {
            ...record.toObject(),
            projectIncome,
            projectExpenses,
            projectBudget
          };
        })
      );
      
      // Calculate totals
      const totals = mySharesWithFinancials.reduce((acc, record) => {
        acc.totalProfitShare += record.profitShare || 0;
        acc.totalBaseSalary += record.baseSalary || 0;
        acc.totalNetAmount += record.netAmount || 0;
        return acc;
      }, {
        totalProfitShare: 0,
        totalBaseSalary: 0,
        totalNetAmount: 0
      });
      
      res.status(200).json({
        success: true,
        data: {
          records: mySharesWithFinancials,
          totals
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get profit sharing analytics (Founder only)
router.get('/analytics',
  restrictToRole('FOUNDER'),
  async (req, res) => {
    try {
      const { month, year } = req.query;
      
      let matchQuery = {};
      if (month && year) {
        matchQuery.month = `${year}-${month.toString().padStart(2, '0')}`;
      }
      
      const analytics = await Payroll.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalProfitShares: { $sum: '$profitShare' },
            totalBaseSalaries: { $sum: '$baseSalary' },
            totalNetAmount: { $sum: '$netAmount' },
            founderShares: {
              $sum: {
                $cond: [{ $gt: ['$profitShare', 0] }, '$profitShare', 0]
              }
            },
            teamShares: {
              $sum: {
                $cond: [{ $gt: ['$profitShare', 0] }, '$profitShare', 0]
              }
            },
            count: { $sum: 1 }
          }
        }
      ]);
      
      const projectBreakdown = await Payroll.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$projectId',
            projectProfit: { $sum: '$profitShare' },
            participantCount: { $sum: 1 },
            totalNet: { $sum: '$netAmount' }
          }
        },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'project'
          }
        },
        { $unwind: '$project' }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          summary: analytics[0] || {
            totalProfitShares: 0,
            totalBaseSalaries: 0,
            totalNetAmount: 0,
            founderShares: 0,
            teamShares: 0,
            count: 0
          },
          projectBreakdown
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;
