const express = require('express');
const PDFDocument = require('pdfkit');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Team = require('../models/Team');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Client = require('../models/Client');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Dashboard analytics endpoint
router.get('/dashboard', authorize('reports.read'), async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Get date ranges for current month
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0);
    
    // Get basic counts
    const totalUsers = await User.countDocuments({ active: true });
    const totalTeams = await Team.countDocuments();
    const totalProjects = await Project.countDocuments();
    const totalTasks = await Task.countDocuments();
    const totalClients = await Client.countDocuments();
    
    // Get current month financial data
    const monthlyIncome = await Income.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const monthlyPayroll = await Payroll.aggregate([
      {
        $match: {
          month: `${currentYear}-${String(currentMonth).padStart(2, '0')}`
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$salaryAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get task status breakdown
    const taskStatusBreakdown = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get team performance data
    const teamPerformance = await Team.aggregate([
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'teamId',
          as: 'expenses'
        }
      },
      {
        $lookup: {
          from: 'incomes',
          localField: 'members',
          foreignField: 'receivedByUserId',
          as: 'incomes'
        }
      },
      {
        $project: {
          name: 1,
          category: 1,
          monthlyBudget: 1,
          memberCount: { $size: '$members' },
          totalExpenses: { $sum: '$expenses.amount' },
          totalIncome: { $sum: '$incomes.amount' },
          budgetUtilization: {
            $cond: {
              if: { $gt: ['$monthlyBudget', 0] },
              then: { $multiply: [{ $divide: [{ $sum: '$expenses.amount' }, '$monthlyBudget'] }, 100] },
              else: 0
            }
          }
        }
      },
      {
        $limit: 5
      }
    ]);
    
    // Calculate net profit
    const totalIncome = monthlyIncome[0]?.total || 0;
    const totalExpenses = monthlyExpenses[0]?.total || 0;
    const totalPayroll = monthlyPayroll[0]?.total || 0;
    const netProfit = totalIncome - totalExpenses - totalPayroll;
    
    // Format task status breakdown
    const taskStatuses = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0
    };
    
    taskStatusBreakdown.forEach(status => {
      if (taskStatuses.hasOwnProperty(status._id)) {
        taskStatuses[status._id] = status.count;
      }
    });
    
    const analytics = {
      overview: {
        totalUsers,
        totalTeams,
        totalProjects,
        totalTasks,
        totalClients
      },
      monthlyFinancials: {
        income: {
          total: totalIncome,
          count: monthlyIncome[0]?.count || 0
        },
        expenses: {
          total: totalExpenses,
          count: monthlyExpenses[0]?.count || 0
        },
        payroll: {
          total: totalPayroll,
          count: monthlyPayroll[0]?.count || 0
        },
        netProfit
      },
      taskStatuses,
      teamPerformance: teamPerformance.map(team => ({
        ...team,
        budgetUtilization: Math.round(team.budgetUtilization * 100) / 100
      }))
    };
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Generate team financial report PDF
router.get('/team/:teamId/:month', authorize('finance.read'), async (req, res) => {
  try {
    const { teamId, month } = req.params;
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Month must be in YYYY-MM format'
      });
    }

    const [year, monthNum] = month.split('-');
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0);

    // Get team information
    const team = await Team.findById(teamId).populate('leadUserId', 'name email');
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Get team expenses for the month
    const expenses = await Expense.find({
      teamId: team._id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    })
    .populate('submittedBy', 'name email')
    .populate('projectId', 'title')
    .sort('date');

    // Get team income for the month
    const incomes = await Income.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'receivedByUserId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'user._id',
          foreignField: 'members',
          as: 'team'
        }
      },
      {
        $match: {
          'team._id': team._id
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client'
        }
      }
    ]);

    // Get team payroll for the month
    const payrolls = await Payroll.find({
      teamId: team._id,
      month: month
    })
    .populate('userId', 'name email')
    .sort('createdAt');

    // Calculate totals
    const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalPayroll = payrolls.reduce((sum, payroll) => sum + payroll.salaryAmount, 0);
    const remainingBudget = team.monthlyBudget - totalExpense;
    const creditUsed = Math.max(0, totalExpense - team.monthlyBudget);
    const netProfit = totalIncome - totalExpense - totalPayroll;

    // Get member-level breakdown
    const memberBreakdown = await getMemberBreakdown(team._id, expenses, payrolls, startOfMonth, endOfMonth);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="team-financial-report-${team.name}-${month}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Connect Shiksha CMS', 50, 50)
       .fontSize(16)
       .font('Helvetica')
       .text('Team Financial Report', 50, 80);

    // Team information
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text(`Team: ${team.name}`, 50, 120)
       .font('Helvetica')
       .text(`Category: ${team.category}`, 50, 140)
       .text(`Team Lead: ${team.leadUserId?.name || 'N/A'}`, 50, 160)
       .text(`Report Period: ${month}`, 50, 180)
       .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 200);

    let yPosition = 240;

    // Summary section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Financial Summary', 50, yPosition);
    
    yPosition += 30;
    
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Monthly Budget: ₹${team.monthlyBudget.toLocaleString()}`, 50, yPosition)
       .text(`Credit Limit: ₹${team.creditLimit.toLocaleString()}`, 250, yPosition);
    
    yPosition += 20;
    
    doc.text(`Total Income: ₹${totalIncome.toLocaleString()}`, 50, yPosition)
       .text(`Total Expenses: ₹${totalExpense.toLocaleString()}`, 250, yPosition);
    
    yPosition += 20;
    
    doc.text(`Total Payroll: ₹${totalPayroll.toLocaleString()}`, 50, yPosition)
       .text(`Net Profit: ₹${netProfit.toLocaleString()}`, 250, yPosition);
    
    yPosition += 20;
    
    doc.text(`Remaining Budget: ₹${remainingBudget.toLocaleString()}`, 50, yPosition);
    
    if (creditUsed > 0) {
      doc.text(`Credit Used: ₹${creditUsed.toLocaleString()}`, 250, yPosition);
    }

    yPosition += 40;

    // Income details
    if (incomes.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Income Details', 50, yPosition);
      
      yPosition += 30;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Date', 50, yPosition)
         .text('Source', 120, yPosition)
         .text('Amount', 200, yPosition)
         .text('Description', 280, yPosition);
      
      yPosition += 20;
      
      incomes.forEach(income => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.font('Helvetica')
           .text(new Date(income.date).toLocaleDateString(), 50, yPosition)
           .text(income.sourceType, 120, yPosition)
           .text(`₹${income.amount.toLocaleString()}`, 200, yPosition)
           .text(income.description || 'N/A', 280, yPosition, { width: 200 });
        
        yPosition += 15;
      });
      
      yPosition += 20;
    }

    // Expense details
    if (expenses.length > 0) {
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Expense Details', 50, yPosition);
      
      yPosition += 30;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Date', 50, yPosition)
         .text('Category', 120, yPosition)
         .text('Amount', 200, yPosition)
         .text('Description', 280, yPosition);
      
      yPosition += 20;
      
      expenses.forEach(expense => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.font('Helvetica')
           .text(new Date(expense.date).toLocaleDateString(), 50, yPosition)
           .text(expense.category, 120, yPosition)
           .text(`₹${expense.amount.toLocaleString()}`, 200, yPosition)
           .text(expense.description, 280, yPosition, { width: 200 });
        
        yPosition += 15;
      });
      
      yPosition += 20;
    }

    // Payroll details
    if (payrolls.length > 0) {
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Payroll Details', 50, yPosition);
      
      yPosition += 30;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Member', 50, yPosition)
         .text('Amount', 200, yPosition)
         .text('Status', 280, yPosition);
      
      yPosition += 20;
      
      payrolls.forEach(payroll => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.font('Helvetica')
           .text(payroll.userId?.name || 'N/A', 50, yPosition)
           .text(`₹${payroll.salaryAmount.toLocaleString()}`, 200, yPosition)
           .text(payroll.status, 280, yPosition);
        
        yPosition += 15;
      });
    }

    // Member-level breakdown
    if (memberBreakdown.length > 0) {
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Member Performance Breakdown', 50, yPosition);
      
      yPosition += 30;
      
      memberBreakdown.forEach(member => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(member.name, 50, yPosition);
        
        yPosition += 20;
        
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Budget Used: ₹${member.expenseAmount.toLocaleString()} / ₹${member.budgetLimit.toLocaleString()} (${member.budgetUsage.toFixed(1)}%)`, 50, yPosition)
           .text(`Payroll: ₹${member.payrollAmount.toLocaleString()} (${member.payrollStatus})`, 250, yPosition);
        
        yPosition += 15;
        
        doc.text(`Tasks Completed: ${member.tasksCompleted} / ${member.totalTasks} (${member.taskCompletionRate.toFixed(1)}%)`, 50, yPosition);
        
        yPosition += 25;
      });
    }

    // Footer
    const pageHeight = doc.page.height;
    doc.fontSize(10)
       .font('Helvetica')
       .text('Auto-generated by Connect Shiksha CMS', 50, pageHeight - 50);

    // Finalize PDF
    doc.end();

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to get member breakdown
async function getMemberBreakdown(teamId, expenses, payrolls, startOfMonth, endOfMonth) {
  const Task = require('../models/Task');
  
  // Get team members
  const team = await Team.findById(teamId).populate('members', 'name email');
  
  const memberBreakdown = await Promise.all(
    team.members.map(async (member) => {
      // Calculate member expenses
      const memberExpenses = expenses.filter(expense => 
        String(expense.submittedBy._id) === String(member._id)
      );
      const expenseAmount = memberExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Get member budget
      const memberBudget = team.memberBudgets.find(
        budget => String(budget.memberId) === String(member._id)
      );
      const budgetLimit = memberBudget ? memberBudget.monthlyLimit : 0;
      const budgetUsage = budgetLimit > 0 ? (expenseAmount / budgetLimit) * 100 : 0;
      
      // Calculate member payroll
      const memberPayroll = payrolls.find(payroll => 
        String(payroll.userId._id) === String(member._id)
      );
      const payrollAmount = memberPayroll ? memberPayroll.salaryAmount : 0;
      const payrollStatus = memberPayroll ? memberPayroll.status : 'N/A';
      
      // Calculate member tasks
      const memberTasks = await Task.find({
        assignedTo: member._id,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      const totalTasks = memberTasks.length;
      const tasksCompleted = memberTasks.filter(task => task.status === 'done').length;
      const taskCompletionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;
      
      return {
        name: member.name,
        email: member.email,
        expenseAmount,
        budgetLimit,
        budgetUsage,
        payrollAmount,
        payrollStatus,
        totalTasks,
        tasksCompleted,
        taskCompletionRate
      };
    })
  );
  
  return memberBreakdown;
}

module.exports = router;
