const express = require('express');
const Payout = require('../models/Payout');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const router = express.Router();

router.use(protect);
router.use(authorize('payroll.read'));

// Run payroll for a specific month/year
router.get('/run', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide month and year'
      });
    }

    const payouts = await Payout.find({
      month: parseInt(month),
      year: parseInt(year)
    })
      .populate('userId')
      .sort('userId.name');

    // Calculate summary
    const summary = {
      totalEmployees: payouts.length,
      totalBaseSalary: payouts.reduce((sum, p) => sum + p.baseSalary, 0),
      totalShares: payouts.reduce((sum, p) => sum + p.totalShares, 0),
      totalBonuses: payouts.reduce((sum, p) => sum + p.bonuses, 0),
      totalDeductions: payouts.reduce((sum, p) => sum + p.deductions, 0),
      totalPayout: payouts.reduce((sum, p) => sum + p.netAmount, 0)
    };

    res.status(200).json({
      success: true,
      month: parseInt(month),
      year: parseInt(year),
      summary,
      data: payouts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Export payroll to Excel
router.get('/export/excel', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide month and year'
      });
    }

    const payouts = await Payout.find({
      month: parseInt(month),
      year: parseInt(year)
    })
      .populate('userId')
      .sort('userId.name');

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Payroll ${month}-${year}`);

    // Add headers
    worksheet.columns = [
      { header: 'Employee Name', key: 'name', width: 30 },
      { header: 'Employee ID', key: 'id', width: 20 },
      { header: 'Base Salary', key: 'baseSalary', width: 15 },
      { header: 'Profit Shares', key: 'shares', width: 15 },
      { header: 'Bonuses', key: 'bonuses', width: 15 },
      { header: 'Deductions', key: 'deductions', width: 15 },
      { header: 'Net Amount', key: 'netAmount', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Add data
    payouts.forEach(payout => {
      worksheet.addRow({
        name: payout.userId.name,
        id: payout.userId._id,
        baseSalary: payout.baseSalary,
        shares: payout.totalShares,
        bonuses: payout.bonuses,
        deductions: payout.deductions,
        netAmount: payout.netAmount,
        status: payout.status
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payroll-${month}-${year}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Export payroll to PDF
router.get('/export/pdf', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide month and year'
      });
    }

    const payouts = await Payout.find({
      month: parseInt(month),
      year: parseInt(year)
    })
      .populate('userId')
      .sort('userId.name');

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payroll-${month}-${year}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Add content
    doc.fontSize(20).text('Connect Shiksha - Payroll Report', { align: 'center' });
    doc.fontSize(12).text(`Month: ${month}/${year}`, { align: 'center' });
    doc.moveDown();

    // Table headers
    const tableTop = 150;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Employee', 50, tableTop);
    doc.text('Base Salary', 200, tableTop);
    doc.text('Shares', 280, tableTop);
    doc.text('Bonuses', 340, tableTop);
    doc.text('Deductions', 400, tableTop);
    doc.text('Net Amount', 480, tableTop);

    // Table rows
    doc.font('Helvetica');
    let y = tableTop + 20;
    payouts.forEach(payout => {
      doc.text(payout.userId.name.substring(0, 20), 50, y);
      doc.text(`₹${payout.baseSalary}`, 200, y);
      doc.text(`₹${payout.totalShares}`, 280, y);
      doc.text(`₹${payout.bonuses}`, 340, y);
      doc.text(`₹${payout.deductions}`, 400, y);
      doc.text(`₹${payout.netAmount}`, 480, y);
      y += 20;
    });

    // Calculate total
    const total = payouts.reduce((sum, p) => sum + p.netAmount, 0);
    doc.moveDown();
    doc.font('Helvetica-Bold');
    doc.text(`Total Payout: ₹${total}`, 50, y + 20);

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

