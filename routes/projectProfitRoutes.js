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

// Compute profit sharing for a specific project (Founder and Project Managers only)
router.post('/compute/:projectId', 
  restrictToRoles(['FOUNDER', 'PROJECT_MANAGER']),
  canAccessProject,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { month, year } = req.body;
      
      const result = await computeProjectProfitSharing(projectId, month, year);
      
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
  restrictToRoles(['FOUNDER', 'PROJECT_MANAGER', 'TEAM_MEMBER']),
  canAccessProject,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { month, year } = req.query;
      
      const summary = await getProjectProfitSummary(projectId, month, year);
      
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
      const { month, year } = req.body;
      
      const results = await computeAllProjectsProfitSharing(month, year);
      
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
  restrictToRoles(['FOUNDER', 'PROJECT_MANAGER', 'TEAM_MEMBER']),
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
      
      // Use pre-calculated project financial data from Payroll records
      
      const mySharesWithFinancials = myShares.map((record) => {
        return {
          ...record.toObject(),
          projectIncome: record.projectIncome || 0,
          projectExpenses: record.projectExpenses || 0,
          projectBudget: record.projectBudget || 0
        };
      });
      
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
