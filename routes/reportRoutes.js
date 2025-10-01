const express = require('express');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Sale = require('../models/Sale');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const router = express.Router();

router.use(protect);
router.use(authorize('reports.read'));

// Dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};

    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Income vs Expense
    const income = await Income.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' }
        }
      }
    ]);

    const expenses = await Expense.aggregate([
      { $match: { ...dateFilter, status: 'approved' } },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Total calculations
    const totalIncome = await Income.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalExpenses = await Expense.aggregate([
      { $match: { ...dateFilter, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const netProfit = (totalIncome[0]?.total || 0) - (totalExpenses[0]?.total || 0);

    // Sales performance
    const salesData = await Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $month: '$date' },
          totalSales: { $sum: '$finalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Task completion rate
    const tasks = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Team performance
    const teamPerformance = await Task.aggregate([
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'project'
        }
      },
      { $unwind: '$project' },
      {
        $group: {
          _id: '$project.teamId',
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
          },
          totalTasks: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        financialSummary: {
          totalIncome: totalIncome[0]?.total || 0,
          totalExpenses: totalExpenses[0]?.total || 0,
          netProfit
        },
        monthlyIncome: income,
        monthlyExpenses: expenses,
        salesPerformance: salesData,
        taskStats: tasks,
        teamPerformance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Custom report
router.post('/custom', async (req, res) => {
  try {
    const { reportType, filters } = req.body;
    let data = [];

    switch (reportType) {
      case 'income_expense':
        const incomeData = await Income.find(filters.income || {})
          .populate('receivedByUserId')
          .populate('clientId');
        const expenseData = await Expense.find(filters.expense || {})
          .populate('submittedBy')
          .populate('approvedBy');
        
        data = { income: incomeData, expenses: expenseData };
        break;

      case 'sales_performance':
        data = await Sale.find(filters || {})
          .populate('productId')
          .populate('soldBy');
        break;

      case 'team_performance':
        data = await Task.aggregate([
          { $match: filters || {} },
          {
            $lookup: {
              from: 'projects',
              localField: 'projectId',
              foreignField: '_id',
              as: 'project'
            }
          },
          { $unwind: '$project' },
          {
            $group: {
              _id: '$project.teamId',
              completedTasks: {
                $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
              },
              totalTasks: { $sum: 1 },
              avgPriority: { $avg: 1 }
            }
          }
        ]);
        break;

      case 'attendance':
        data = await Attendance.find(filters || {})
          .populate('userId');
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    res.status(200).json({
      success: true,
      reportType,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Export report as Excel
router.get('/export', async (req, res) => {
  try {
    const { type, format, startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Fetch data based on type
    let data = [];
    let headers = [];
    let filename = 'report';

    if (type === 'income') {
      data = await Income.find(dateFilter).populate('receivedByUserId clientId');
      headers = ['Date', 'Source Type', 'Amount', 'Received By', 'Client', 'Payment Method'];
      filename = 'income-report';
    } else if (type === 'expense') {
      data = await Expense.find({ ...dateFilter, status: 'approved' }).populate('submittedBy approvedBy');
      headers = ['Date', 'Category', 'Amount', 'Description', 'Submitted By', 'Approved By'];
      filename = 'expense-report';
    } else if (type === 'sales') {
      data = await Sale.find(dateFilter).populate('productId soldBy');
      headers = ['Date', 'Product', 'Quantity', 'Unit Price', 'Total', 'Buyer', 'Sold By'];
      filename = 'sales-report';
    }

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      worksheet.columns = headers.map(h => ({ header: h, key: h.toLowerCase().replace(' ', '_'), width: 20 }));

      // Add data rows based on type
      if (type === 'income') {
        data.forEach(item => {
          worksheet.addRow({
            date: item.date.toLocaleDateString(),
            source_type: item.sourceType,
            amount: item.amount,
            received_by: item.receivedByUserId?.name || 'N/A',
            client: item.clientId?.name || 'N/A',
            payment_method: item.paymentMethod
          });
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();

    } else if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
      doc.pipe(res);

      doc.fontSize(16).text(`Connect Shiksha - ${type.toUpperCase()} Report`, { align: 'center' });
      doc.moveDown();
      
      // Add basic data (simplified)
      data.forEach(item => {
        doc.fontSize(10).text(JSON.stringify(item, null, 2).substring(0, 100));
      });

      doc.end();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Use excel or pdf'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

