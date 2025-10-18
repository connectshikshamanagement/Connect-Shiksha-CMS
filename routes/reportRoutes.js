const express = require('express');
const PDFDocument = require('pdfkit');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Team = require('../models/Team');
const Payroll = require('../models/Payroll');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

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
      status: 'approved',
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

module.exports = router;