const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const Payout = require('../models/Payout');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Team = require('../models/Team');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const testExport = async () => {
  try {
    console.log('🧪 Testing Export Functionality...');

    // Get current month and year
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    console.log(`📅 Testing for Month: ${month}, Year: ${year}`);

    // Get both simple payroll and advanced payouts
    const [payrolls, payouts] = await Promise.all([
      Payroll.find({ month: `${year}-${String(month).padStart(2, '0')}` })
        .populate('userId', 'name email')
        .populate('teamId', 'name')
        .sort('-createdAt'),
      Payout.find({ month, year })
        .populate('userId', 'name email')
        .populate('processedBy', 'name')
        .sort('-year -month')
    ]);

    console.log(`📊 Found ${payrolls.length} payroll records`);
    console.log(`📊 Found ${payouts.length} payout records`);

    // Test Excel generation
    console.log('\n📈 Testing Excel Export...');
    const ExcelJS = require('exceljs');
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

    // Save Excel file
    await workbook.xlsx.writeFile(`test-payroll-${month}-${year}.xlsx`);
    console.log('✅ Excel file created successfully: test-payroll-' + month + '-' + year + '.xlsx');

    // Test PDF generation
    console.log('\n📄 Testing PDF Export...');
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(`test-payroll-${month}-${year}.pdf`);
    doc.pipe(stream);

    // Add title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Payroll Report', 50, 50);

    // Add period info
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Period: ${month} / ${year}`, 50, 80);

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

    // Wait for PDF to finish writing
    await new Promise((resolve) => {
      stream.on('finish', resolve);
    });

    console.log('✅ PDF file created successfully: test-payroll-' + month + '-' + year + '.pdf');

    console.log('\n📊 Export Summary:');
    console.log(`   - Excel rows: ${worksheet.rowCount}`);
    console.log(`   - Total Base Salary: ₹${totalBaseSalary.toLocaleString()}`);
    console.log(`   - Total Profit Shares: ₹${totalProfitShares.toLocaleString()}`);
    console.log(`   - Total Net Amount: ₹${totalNetAmount.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error testing export:', error);
  } finally {
    mongoose.connection.close();
  }
};

testExport();
