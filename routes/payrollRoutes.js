const express = require('express');
const Payroll = require('../models/Payroll');
const Payout = require('../models/Payout');
const User = require('../models/User');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const router = express.Router();

router.use(protect);

// Get all payroll records
router.get('/', authorize('finance.read'), async (req, res) => {
  try {
    const { month, year, teamId, status } = req.query;
    
    let query = {};
    let dateFilter = {}; // Filter for income/expense dates
    
    if (month && year) {
      // Format: YYYY-MM (e.g., 2025-10)
      query.month = `${year}-${month.toString().padStart(2, '0')}`;
      
      // Create date range for filtering income and expenses
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const startDate = new Date(yearNum, monthNum - 1, 1); // First day of month
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999); // Last day of month
      
      dateFilter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    } else if (month) {
      query.month = month;
    }
    // If no month/year specified, show all records
    if (teamId) query.teamId = teamId;
    if (status) query.status = status;

    console.log('Payroll query:', query);
    console.log('Date filter for income/expenses:', dateFilter);

    const payrolls = await Payroll.find(query)
      .populate('userId', 'name email')
      .populate('teamId', 'name category monthlyBudget')
      .populate('projectId', 'title allocatedBudget')
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    console.log('Found payroll records:', payrolls.length);

    // Add project financial data to each payroll record
    const payrollsWithFinancials = await Promise.all(
      payrolls.map(async (payroll) => {
        let projectIncome = 0;
        let projectExpenses = 0;
        let projectBudget = 0;

        // If payroll has a projectId, get project-specific data
        if (payroll.projectId) {
          // Get project income (using sourceRefId and sourceRefModel) - WITH date filter
          const incomeQuery = { 
            sourceRefId: payroll.projectId._id,
            sourceRefModel: 'Project'
          };
          if (dateFilter.date) {
            incomeQuery.date = dateFilter.date;
          }
          
          const incomes = await Income.find(incomeQuery);
          projectIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

          // Get project expenses (using projectId) - WITH date filter
          const expenseQuery = { 
            projectId: payroll.projectId._id
          };
          if (dateFilter.date) {
            expenseQuery.date = dateFilter.date;
          }
          
          const expenses = await Expense.find(expenseQuery);
          projectExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

          // Get project budget
          projectBudget = payroll.projectId.allocatedBudget || 0;
        } else {
          // If no projectId, get team-level data as fallback - WITH date filter
          const teamIncomeQuery = { 
            teamId: payroll.teamId._id
          };
          if (dateFilter.date) {
            teamIncomeQuery.date = dateFilter.date;
          }
          
          const teamIncomes = await Income.find(teamIncomeQuery);
          projectIncome = teamIncomes.reduce((sum, income) => sum + income.amount, 0);

          // Get team expenses
          const teamExpenseQuery = { 
            teamId: payroll.teamId._id
          };
          if (dateFilter.date) {
            teamExpenseQuery.date = dateFilter.date;
          }
          
          const teamExpenses = await Expense.find(teamExpenseQuery);
          projectExpenses = teamExpenses.reduce((sum, expense) => sum + expense.amount, 0);

          // Get team budget
          projectBudget = payroll.teamId.monthlyBudget || 0;
        }

        return {
          ...payroll.toObject(),
          projectIncome,
          projectExpenses,
          projectBudget
        };
      })
    );

    res.status(200).json({
      success: true,
      count: payrollsWithFinancials.length,
      data: payrollsWithFinancials
    });
  } catch (error) {
    console.error('Payroll fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get team-wise payroll summary
router.get('/summary/:month', authorize('finance.read'), async (req, res) => {
  try {
    const { month } = req.params;
    
    const summary = await Payroll.aggregate([
      {
        $match: { month }
      },
      {
        $group: {
          _id: '$teamId',
          totalAmount: { $sum: '$salaryAmount' },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$salaryAmount', 0]
            }
          },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$salaryAmount', 0]
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: '_id',
          foreignField: '_id',
          as: 'team'
        }
      },
      {
        $unwind: '$team'
      }
    ]);

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
});

// Create payroll record
router.post('/', authorize('finance.create'), async (req, res) => {
  try {
    const { userId, teamId, month, salaryAmount, notes } = req.body;

    // Check if user exists and is in the team
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if user is in the team
    if (!team.members.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is not a member of the specified team' 
      });
    }

    const payroll = await Payroll.create({
      userId,
      teamId,
      month,
      salaryAmount,
      notes,
      createdBy: req.user.id
    });

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('userId', 'name email')
      .populate('teamId', 'name category')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedPayroll
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Payroll record already exists for this user and month'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update payroll record
router.put('/:id', authorize('finance.update'), async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'name email')
     .populate('teamId', 'name category')
     .populate('createdBy', 'name email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mark payroll as paid
router.patch('/:id/pay', authorize('finance.update'), async (req, res) => {
  try {
    const { paymentMethod, transactionId } = req.body;

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'bank_transfer',
        transactionId
      },
      { new: true, runValidators: true }
    ).populate('userId', 'name email')
     .populate('teamId', 'name category')
     .populate('createdBy', 'name email');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete payroll record
router.delete('/:id', authorize('finance.delete'), async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Export payroll data to Excel
router.get('/export/excel', authorize('payroll.read'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    // Get both simple payroll and advanced payouts
    const [payrolls, payouts] = await Promise.all([
      Payroll.find(filter)
        .populate('userId', 'name email')
        .populate('teamId', 'name')
        .sort('-createdAt'),
      Payout.find(filter)
        .populate('userId', 'name email')
        .populate('processedBy', 'name')
        .sort('-year -month')
    ]);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll Report');

    // Set up columns
    worksheet.columns = [
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Base Salary', key: 'baseSalary', width: 15 },
      { header: 'Profit Shares', key: 'profitShares', width: 15 },
      { header: 'Bonuses', key: 'bonuses', width: 15 },
      { header: 'Deductions', key: 'deductions', width: 15 },
      { header: 'Net Amount', key: 'netAmount', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Month/Year', key: 'period', width: 15 },
      { header: 'Team', key: 'team', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add simple payroll data
    payrolls.forEach(payroll => {
      worksheet.addRow({
        employeeName: payroll.userId?.name || 'N/A',
        email: payroll.userId?.email || 'N/A',
        type: 'Fixed Salary',
        baseSalary: payroll.salaryAmount || 0,
        profitShares: 0,
        bonuses: 0,
        deductions: 0,
        netAmount: payroll.salaryAmount || 0,
        status: payroll.status || 'pending',
        period: payroll.month || 'N/A',
        team: payroll.teamId?.name || 'N/A',
        notes: payroll.notes || ''
      });
    });

    // Add advanced payout data
    payouts.forEach(payout => {
      worksheet.addRow({
        employeeName: payout.userId?.name || 'N/A',
        email: payout.userId?.email || 'N/A',
        type: 'Advanced Payout',
        baseSalary: payout.baseSalary || 0,
        profitShares: payout.totalShares || 0,
        bonuses: payout.bonuses || 0,
        deductions: payout.deductions || 0,
        netAmount: payout.netAmount || 0,
        status: payout.status || 'pending',
        period: `${payout.month}/${payout.year}`,
        team: 'N/A',
        notes: payout.notes || ''
      });
    });

    // Add summary row
    const totalBaseSalary = [...payrolls, ...payouts].reduce((sum, item) => sum + (item.baseSalary || item.salaryAmount || 0), 0);
    const totalProfitShares = payouts.reduce((sum, payout) => sum + (payout.totalShares || 0), 0);
    const totalBonuses = payouts.reduce((sum, payout) => sum + (payout.bonuses || 0), 0);
    const totalDeductions = payouts.reduce((sum, payout) => sum + (payout.deductions || 0), 0);
    const totalNetAmount = [...payrolls, ...payouts].reduce((sum, item) => sum + (item.netAmount || item.salaryAmount || 0), 0);

    worksheet.addRow({
      employeeName: 'TOTAL',
      email: '',
      type: '',
      baseSalary: totalBaseSalary,
      profitShares: totalProfitShares,
      bonuses: totalBonuses,
      deductions: totalDeductions,
      netAmount: totalNetAmount,
      status: '',
      period: '',
      team: '',
      notes: ''
    });

    // Style summary row
    const summaryRow = worksheet.getRow(worksheet.rowCount);
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE0B2' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-${month || 'all'}-${year || 'all'}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export Excel file'
    });
  }
});

// Export payroll data to PDF
router.get('/export/pdf', authorize('payroll.read'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    // Get both simple payroll and advanced payouts
    const [payrolls, payouts] = await Promise.all([
      Payroll.find(filter)
        .populate('userId', 'name email')
        .populate('teamId', 'name')
        .sort('-createdAt'),
      Payout.find(filter)
        .populate('userId', 'name email')
        .populate('processedBy', 'name')
        .sort('-year -month')
    ]);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-${month || 'all'}-${year || 'all'}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Payroll Report', 50, 50);

    // Add period info
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Period: ${month || 'All Months'} / ${year || 'All Years'}`, 50, 80);

    // Add generation date
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 50, 100);

    let yPosition = 130;

    // Add simple payroll section
    if (payrolls.length > 0) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Fixed Salary Records', 50, yPosition);
      
      yPosition += 30;

      // Table headers
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Employee', 50, yPosition)
         .text('Amount', 200, yPosition)
         .text('Status', 280, yPosition)
         .text('Team', 350, yPosition);
      
      yPosition += 20;

      // Table rows
      payrolls.forEach(payroll => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.font('Helvetica')
           .text(payroll.userId?.name || 'N/A', 50, yPosition)
           .text(`₹${(payroll.salaryAmount || 0).toLocaleString()}`, 200, yPosition)
           .text(payroll.status || 'pending', 280, yPosition)
           .text(payroll.teamId?.name || 'N/A', 350, yPosition);
        
        yPosition += 15;
      });

      yPosition += 20;
    }

    // Add advanced payouts section
    if (payouts.length > 0) {
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Advanced Payouts (Profit Sharing)', 50, yPosition);
      
      yPosition += 30;

      // Table headers
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Employee', 50, yPosition)
         .text('Base Salary', 150, yPosition)
         .text('Profit Shares', 220, yPosition)
         .text('Bonuses', 290, yPosition)
         .text('Deductions', 360, yPosition)
         .text('Net Amount', 430, yPosition)
         .text('Status', 500, yPosition);
      
      yPosition += 20;

      // Table rows
      payouts.forEach(payout => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.font('Helvetica')
           .text(payout.userId?.name || 'N/A', 50, yPosition)
           .text(`₹${(payout.baseSalary || 0).toLocaleString()}`, 150, yPosition)
           .text(`₹${(payout.totalShares || 0).toLocaleString()}`, 220, yPosition)
           .text(`₹${(payout.bonuses || 0).toLocaleString()}`, 290, yPosition)
           .text(`₹${(payout.deductions || 0).toLocaleString()}`, 360, yPosition)
           .text(`₹${(payout.netAmount || 0).toLocaleString()}`, 430, yPosition)
           .text(payout.status || 'pending', 500, yPosition);
        
        yPosition += 15;
      });

      yPosition += 20;
    }

    // Add summary
    if (yPosition > 650) {
      doc.addPage();
      yPosition = 50;
    }

    const totalBaseSalary = [...payrolls, ...payouts].reduce((sum, item) => sum + (item.baseSalary || item.salaryAmount || 0), 0);
    const totalProfitShares = payouts.reduce((sum, payout) => sum + (payout.totalShares || 0), 0);
    const totalBonuses = payouts.reduce((sum, payout) => sum + (payout.bonuses || 0), 0);
    const totalDeductions = payouts.reduce((sum, payout) => sum + (payout.deductions || 0), 0);
    const totalNetAmount = [...payrolls, ...payouts].reduce((sum, item) => sum + (item.netAmount || item.salaryAmount || 0), 0);

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Summary', 50, yPosition);
    
    yPosition += 30;

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Total Base Salary: ₹${totalBaseSalary.toLocaleString()}`, 50, yPosition)
       .text(`Total Profit Shares: ₹${totalProfitShares.toLocaleString()}`, 50, yPosition + 20)
       .text(`Total Bonuses: ₹${totalBonuses.toLocaleString()}`, 50, yPosition + 40)
       .text(`Total Deductions: ₹${totalDeductions.toLocaleString()}`, 50, yPosition + 60)
       .text(`Total Net Amount: ₹${totalNetAmount.toLocaleString()}`, 50, yPosition + 80);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export PDF file'
    });
  }
});

module.exports = router;