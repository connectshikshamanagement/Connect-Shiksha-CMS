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
