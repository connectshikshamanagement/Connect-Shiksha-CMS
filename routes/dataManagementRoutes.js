const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Payroll = require('../models/Payroll');
const Client = require('../models/Client');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Role = require('../models/Role');
const AdvancePayment = require('../models/AdvancePayment');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const multer = require('multer');
const AdmZip = require('adm-zip');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../temp/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `import-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// All routes require authentication and founder role
router.use(protect);
router.use(authorize('users.delete')); // Only founders have this permission

// Get data statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments(),
      teams: await Team.countDocuments(),
      projects: await Project.countDocuments(),
      tasks: await Task.countDocuments(),
      income: await Income.countDocuments(),
      expenses: await Expense.countDocuments(),
      payroll: await Payroll.countDocuments(),
      clients: await Client.countDocuments(),
      products: await Product.countDocuments(),
      sales: await Sale.countDocuments(),
      advancePayments: await AdvancePayment.countDocuments(),
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Export all data
router.get('/export', async (req, res) => {
  try {
    // Create a temporary directory for the export
    const exportDir = path.join(__dirname, '../temp/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const zipFileName = `connect-shiksha-export-${timestamp}.zip`;
    const zipPath = path.join(exportDir, zipFileName);

    // Create a zip file
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      // Send the file
      res.download(zipPath, zipFileName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up the file after sending
        setTimeout(() => {
          fs.unlink(zipPath, (unlinkErr) => {
            if (unlinkErr) console.error('Cleanup error:', unlinkErr);
          });
        }, 1000);
      });
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // Export each collection
    const collections = [
      { name: 'users', model: User },
      { name: 'teams', model: Team },
      { name: 'projects', model: Project },
      { name: 'tasks', model: Task },
      { name: 'income', model: Income },
      { name: 'expenses', model: Expense },
      { name: 'payroll', model: Payroll },
      { name: 'clients', model: Client },
      { name: 'products', model: Product },
      { name: 'sales', model: Sale },
      { name: 'roles', model: Role },
      { name: 'advancePayments', model: AdvancePayment },
    ];

    for (const collection of collections) {
      const data = await collection.model.find({}).lean();
      const jsonData = JSON.stringify(data, null, 2);
      archive.append(jsonData, { name: `${collection.name}.json` });
    }

    // Add metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      collections: collections.map(c => c.name),
      totalRecords: Object.values(await getCollectionCounts()).reduce((a, b) => a + b, 0)
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Clear all data
router.delete('/clear', async (req, res) => {
  try {
    // Get the current user (founder) to preserve their account
    const founderId = req.user._id;
    const founderEmail = req.user.email;
    
    console.log(`Preserving founder account: ${founderEmail} (${founderId})`);

    // Delete all collections in order (respecting foreign key constraints)
    // But preserve the founder's user account and their roles
    const deleteOrder = [
      AdvancePayment,
      Payroll,
      Task,
      Income,
      Expense,
      Sale,
      Project,
      Team,
      Client,
      Product
    ];

    const results = {};
    
    // Delete all data except users and roles
    for (const Model of deleteOrder) {
      const result = await Model.deleteMany({});
      results[Model.modelName] = result.deletedCount;
    }

    // Delete all users EXCEPT the founder
    const userDeleteResult = await User.deleteMany({
      _id: { $ne: founderId }
    });
    results[User.modelName] = userDeleteResult.deletedCount;

    // Keep all roles (they're needed for the system to function)
    const roleCount = await Role.countDocuments();
    results[Role.modelName] = `Preserved ${roleCount} roles`;

    // Log the preserved founder account
    console.log(`✅ Founder account preserved: ${founderEmail}`);
    console.log(`✅ Roles preserved: ${roleCount} roles`);

    res.json({
      success: true,
      message: 'All data cleared successfully. Founder account and roles preserved.',
      deletedCounts: results,
      preserved: {
        founderEmail,
        founderId,
        rolesCount: roleCount
      }
    });

  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Import/restore data from ZIP file
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    console.log(`Importing data from: ${filePath}`);

    // Extract ZIP file
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();

    // Check if metadata.json exists
    const metadataEntry = zipEntries.find(entry => entry.entryName === 'metadata.json');
    if (!metadataEntry) {
      throw new Error('Invalid backup file: metadata.json not found');
    }

    const metadata = JSON.parse(zip.readAsText(metadataEntry));
    console.log('Backup metadata:', metadata);

    // Validate backup version
    if (metadata.version !== '1.0') {
      throw new Error(`Unsupported backup version: ${metadata.version}`);
    }

    const importResults = {};
    const errors = [];

    // Import collections in order (respecting dependencies)
    const importOrder = [
      { name: 'roles', model: Role },
      { name: 'users', model: User },
      { name: 'teams', model: Team },
      { name: 'projects', model: Project },
      { name: 'clients', model: Client },
      { name: 'products', model: Product },
      { name: 'tasks', model: Task },
      { name: 'income', model: Income },
      { name: 'expenses', model: Expense },
      { name: 'sales', model: Sale },
      { name: 'payroll', model: Payroll },
      { name: 'advancePayments', model: AdvancePayment }
    ];

    for (const collection of importOrder) {
      try {
        const fileEntry = zipEntries.find(entry => entry.entryName === `${collection.name}.json`);
        if (!fileEntry) {
          console.log(`No ${collection.name}.json found in backup, skipping...`);
          importResults[collection.name] = 0;
          continue;
        }

        const jsonData = zip.readAsText(fileEntry);
        const data = JSON.parse(jsonData);

        if (data.length === 0) {
          importResults[collection.name] = 0;
          continue;
        }

        // Clear existing data for this collection (except roles and users)
        if (collection.name !== 'roles' && collection.name !== 'users') {
          await collection.model.deleteMany({});
        } else if (collection.name === 'users') {
          // Only delete non-founder users
          const founderId = req.user._id;
          await collection.model.deleteMany({ _id: { $ne: founderId } });
        }

        // Insert new data
        const result = await collection.model.insertMany(data, { ordered: false });
        importResults[collection.name] = result.length;
        
        console.log(`✅ Imported ${result.length} ${collection.name} records`);

      } catch (error) {
        console.error(`Error importing ${collection.name}:`, error.message);
        errors.push(`${collection.name}: ${error.message}`);
        importResults[collection.name] = 0;
      }
    }

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });

    // Calculate totals
    const totalImported = Object.values(importResults).reduce((sum, count) => sum + count, 0);

    res.json({
      success: true,
      message: `Data import completed. ${totalImported} records imported successfully.`,
      importResults,
      metadata: {
        exportDate: metadata.exportDate,
        version: metadata.version,
        collections: metadata.collections
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Import error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Export project-wise data to Excel
router.get('/export/project/:projectId/excel', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project details
    const project = await Project.findById(projectId).populate('teamId ownerId');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get all related data for the project
    const [tasks, incomeRecords, expenses, payrollRecords, team] = await Promise.all([
      Task.find({ projectId }).populate('assignedTo', 'name email'),
      Income.find({ 
        sourceRefModel: 'Project', 
        sourceRefId: projectId 
      }).populate('clientId', 'name email'),
      Expense.find({ projectId }),
      Payroll.find({ projectId }).populate('userId', 'name email'),
      Team.findById(project.teamId)
    ]);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    
    // Project Summary Sheet
    const summarySheet = workbook.addWorksheet('Project Summary');
    summarySheet.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 40 }
    ];
    summarySheet.addRow(['Project Title', project.title]);
    summarySheet.addRow(['Description', project.description]);
    summarySheet.addRow(['Category', project.category]);
    summarySheet.addRow(['Status', project.status]);
    summarySheet.addRow(['Team', team?.name || 'N/A']);
    summarySheet.addRow(['Owner', project.ownerId?.name || 'N/A']);
    summarySheet.addRow(['Budget', `${project.budget || 0} Rs`]);
    summarySheet.addRow(['Total Deal Amount', `${project.totalDealAmount || 0} Rs`]);
    summarySheet.addRow(['Progress', `${project.progress || 0}%`]);
    summarySheet.addRow(['Start Date', project.startDate || 'N/A']);
    summarySheet.addRow(['End Date', project.endDate || 'N/A']);
    summarySheet.addRow(['Priority', project.priority]);
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Tasks Sheet
    const tasksSheet = workbook.addWorksheet('Tasks');
    tasksSheet.columns = [
      { header: 'Task Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Assigned To', key: 'assignedTo', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Progress', key: 'progress', width: 15 },
      { header: 'Priority', key: 'priority', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 }
    ];
    tasks.forEach(task => {
      tasksSheet.addRow({
        name: task.name,
        description: task.description,
        assignedTo: task.assignedTo ? task.assignedTo.name : 'Unassigned',
        status: task.status,
        progress: `${task.progress}%`,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'
      });
    });
    tasksSheet.getRow(1).font = { bold: true };
    tasksSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Income Sheet
    const incomeSheet = workbook.addWorksheet('Income');
    incomeSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Client', key: 'client', width: 25 },
      { header: 'Payment Method', key: 'paymentMethod', width: 20 },
      { header: 'Transaction ID', key: 'transactionId', width: 25 }
    ];
    incomeRecords.forEach(income => {
      incomeSheet.addRow({
        date: new Date(income.date).toLocaleDateString(),
        description: income.description,
      amount: `${income.amount} Rs`,
        client: income.clientId ? income.clientId.name : 'N/A',
        paymentMethod: income.paymentMethod,
        transactionId: income.transactionId || 'N/A'
      });
    });
    incomeSheet.getRow(1).font = { bold: true };
    incomeSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    const totalIncome = incomeRecords.reduce((sum, inc) => sum + inc.amount, 0);
    incomeSheet.addRow({ date: 'TOTAL', amount: `${totalIncome} Rs` });
    incomeSheet.getRow(incomeRecords.length + 2).font = { bold: true };

    // Expenses Sheet
    const expenseSheet = workbook.addWorksheet('Expenses');
    expenseSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Payment Method', key: 'paymentMethod', width: 20 },
      { header: 'Vendor', key: 'vendorName', width: 25 }
    ];
    expenses.forEach(expense => {
      expenseSheet.addRow({
        date: new Date(expense.date).toLocaleDateString(),
        description: expense.description,
      amount: `${expense.amount} Rs`,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        vendorName: expense.vendorName || 'N/A'
      });
    });
    expenseSheet.getRow(1).font = { bold: true };
    expenseSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    expenseSheet.addRow({ date: 'TOTAL', amount: `${totalExpenses} Rs` });
    expenseSheet.getRow(expenses.length + 2).font = { bold: true };

    // Payroll Sheet
    const payrollSheet = workbook.addWorksheet('Payroll');
    payrollSheet.columns = [
      { header: 'Employee Name', key: 'employeeName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Base Salary', key: 'baseSalary', width: 15 },
      { header: 'Profit Share', key: 'profitShare', width: 15 },
      { header: 'Bonuses', key: 'bonuses', width: 15 },
      { header: 'Deductions', key: 'deductions', width: 15 },
      { header: 'Net Amount', key: 'netAmount', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
    ];
    payrollRecords.forEach(payroll => {
      payrollSheet.addRow({
        employeeName: payroll.userId ? payroll.userId.name : 'N/A',
        email: payroll.userId ? payroll.userId.email : 'N/A',
        month: payroll.month,
        baseSalary: `${payroll.baseSalary || 0} Rs`,
        profitShare: `${payroll.profitShare || 0} Rs`,
        bonuses: `${payroll.bonuses || 0} Rs`,
        deductions: `${payroll.deductions || 0} Rs`,
        netAmount: `${payroll.netAmount || 0} Rs`,
        status: payroll.status
      });
    });
    payrollSheet.getRow(1).font = { bold: true };
    payrollSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    const totalPayroll = payrollRecords.reduce((sum, p) => sum + (p.netAmount || 0), 0);
    payrollSheet.addRow({ 
      employeeName: 'TOTAL', 
      netAmount: `${totalPayroll} Rs` 
    });
    payrollSheet.getRow(payrollRecords.length + 2).font = { bold: true };

    // Financial Summary Sheet
    const financialSheet = workbook.addWorksheet('Financial Summary');
    financialSheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Amount', key: 'amount', width: 20 }
    ];
    const profit = totalIncome - totalExpenses;
    financialSheet.addRow(['Total Income', `${totalIncome} Rs`]);
    financialSheet.addRow(['Total Expenses', `${totalExpenses} Rs`]);
    financialSheet.addRow(['Net Profit', `${profit} Rs`]);
    financialSheet.addRow(['Total Payroll', `${totalPayroll} Rs`]);
    financialSheet.addRow(['Budget', `${project.budget || 0} Rs`]);
    financialSheet.addRow(['Remaining Budget', `${(project.budget || 0) - totalExpenses} Rs`]);
    financialSheet.getRow(1).font = { bold: true };
    financialSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=project-${project.title.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Project Excel export error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Export project-wise data to PDF
router.get('/export/project/:projectId/pdf', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project details
    const project = await Project.findById(projectId).populate('teamId ownerId');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get all related data for the project
    const [tasks, incomeRecords, expenses, payrollRecords, team] = await Promise.all([
      Task.find({ projectId }).populate('assignedTo', 'name email'),
      Income.find({ 
        sourceRefModel: 'Project', 
        sourceRefId: projectId 
      }).populate('clientId', 'name email'),
      Expense.find({ projectId }),
      Payroll.find({ projectId }).populate('userId', 'name email'),
      Team.findById(project.teamId)
    ]);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=project-${project.title.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add letterhead
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Connect Shiksha Private Limited', 50, 50)
       .fontSize(10)
       .font('Helvetica')
       .text('Reg. UDYAM-MP-06-0024200', 50, 70)
       .text('Address: Balaghat, Madhya Pradesh', 50, 85)
       .text('Web: www.connectshiksha.com', 50, 100)
       .text('Mobile: 9131782103, ', 50, 115)
       .text('Email: connectshikshaofficial@gmail.com', 50, 130);

    // Add a line separator
    doc.moveTo(50, 145)
       .lineTo(545, 145)
       .stroke();

    // Add title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('Project Report', 50, 160);

    // Add project info
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Project Information:', 50, 185);
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Title: ${project.title}`, 50, 205)
       .text(`Description: ${project.description}`, 50, 220)
       .text(`Team: ${team?.name || 'N/A'}`, 50, 235)
       .text(`Owner: ${project.ownerId?.name || 'N/A'}`, 50, 250)
       .text(`Status: ${project.status}`, 50, 265)
       .text(`Progress: ${project.progress}%`, 50, 280)
       .text(`Budget: ${project.budget || 0} Rs`, 50, 295)
       .text(`Total Deal Amount: ${project.totalDealAmount || 0} Rs`, 50, 310);

    let yPosition = 330;

    // Financial Summary
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Financial Summary', 50, yPosition);
    
    yPosition += 20;
    
    const totalIncome = incomeRecords.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalPayroll = payrollRecords.reduce((sum, p) => sum + (p.netAmount || 0), 0);
    const profit = totalIncome - totalExpenses;
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Total Income: ${totalIncome} Rs`, 50, yPosition)
       .text(`Total Expenses: ${totalExpenses} Rs`, 50, yPosition + 15)
       .text(`Net Profit: ${profit} Rs`, 50, yPosition + 30)
       .text(`Total Payroll: ${totalPayroll} Rs`, 50, yPosition + 45);

    yPosition += 80;

    // Payroll
    if (payrollRecords.length > 0) {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`Payroll Records (${payrollRecords.length})`, 50, yPosition);
      
      yPosition += 25;
      
      payrollRecords.forEach(payroll => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        const userName = payroll.userId ? payroll.userId.name : 'N/A';
        const baseSalary = payroll.baseSalary || 0;
        const profitShare = payroll.profitShare || 0;
        const netAmount = payroll.netAmount || 0;
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`${userName} - ${payroll.month}`, 50, yPosition);
        
        yPosition += 15;
        doc.fontSize(9)
           .font('Helvetica')
           .text(`Base Salary: ${baseSalary} Rs`, 70, yPosition)
           .text(`Profit Share: ${profitShare} Rs`, 70, yPosition + 12)
           .text(`Net Amount: ${netAmount} Rs`, 70, yPosition + 24)
           .text(`Status: ${payroll.status}`, 70, yPosition + 36);
        
        yPosition += 55;
      });
      
      yPosition += 10;
    }

    // Tasks
    if (tasks.length > 0) {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`Tasks (${tasks.length})`, 50, yPosition);
      
      yPosition += 20;
      
      tasks.slice(0, 10).forEach(task => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        doc.fontSize(10)
           .font('Helvetica')
           .text(`• ${task.name} - ${task.status} (${task.progress}%)`, 50, yPosition, { 
             width: 500,
             align: 'left'
           });
        yPosition += 20;
      });
      
      if (tasks.length > 10) {
        yPosition += 10;
        doc.text(`... and ${tasks.length - 10} more tasks`, 50, yPosition);
      }
    }

    yPosition += 20;
    
    // Add generation date
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }
    
    doc.fontSize(8)
       .font('Helvetica')
       .text(`Generated: ${new Date().toLocaleString()}`, 50, yPosition);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Project PDF export error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to get collection counts
async function getCollectionCounts() {
  const collections = [
    { name: 'users', model: User },
    { name: 'teams', model: Team },
    { name: 'projects', model: Project },
    { name: 'tasks', model: Task },
    { name: 'income', model: Income },
    { name: 'expenses', model: Expense },
    { name: 'payroll', model: Payroll },
    { name: 'clients', model: Client },
    { name: 'products', model: Product },
    { name: 'sales', model: Sale },
    { name: 'advancePayments', model: AdvancePayment },
  ];

  const counts = {};
  for (const collection of collections) {
    counts[collection.name] = await collection.model.countDocuments();
  }
  return counts;
}

module.exports = router;
