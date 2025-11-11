require('ts-node').register({
  transpileOnly: true,
  project: './tsconfig.server.json'
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketIO = require('socket.io');

// Load env vars
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const teamRoutes = require('./routes/teamRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes.ts').default;
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const productRoutes = require('./routes/productRoutes');
const salesRoutes = require('./routes/salesRoutes');
const profitSharingRoutes = require('./routes/profitSharingRoutes');
const projectProfitRoutes = require('./routes/projectProfitRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const clientRoutes = require('./routes/clientRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const financeRoutes = require('./routes/financeRoutes');
const userHistoryRoutes = require('./routes/userHistoryRoutes');
const teamBudgetRoutes = require('./routes/teamBudgetRoutes');
const enhancedTaskRoutes = require('./routes/enhancedTaskRoutes');
const enhancedExpenseRoutes = require('./routes/enhancedExpenseRoutes');
const teamPerformanceRoutes = require('./routes/teamPerformanceRoutes');
const advancePaymentRoutes = require('./routes/advancePaymentRoutes');
const teamMemberFinanceRoutes = require('./routes/teamMemberFinanceRoutes');
const dataManagementRoutes = require('./routes/dataManagementRoutes');
const { computeAllProjectsProfitSharing } = require('./utils/projectProfitSharing');

// Initialize app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Security & Middleware
app.set('trust proxy', 1); // ensure secure cookies work behind proxies

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", 'data:', 'blob:'],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'", process.env.CLIENT_URL || 'http://localhost:3000']
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

// Global API rate limiter (exclude health and auth refresh path-specific limits handled in route)
const { apiLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiLimiter);

// Make io accessible to routes
app.set('io', io);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/profit-sharing', profitSharingRoutes);
app.use('/api/project-profit', projectProfitRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/users', userHistoryRoutes);
app.use('/api/teams', teamBudgetRoutes);
app.use('/api/tasks', enhancedTaskRoutes);
app.use('/api/expenses', enhancedExpenseRoutes);
app.use('/api/teams', teamPerformanceRoutes);
app.use('/api/advance-payments', advancePaymentRoutes);
app.use('/api/team-member-finance', teamMemberFinanceRoutes);
app.use('/api/data', dataManagementRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Connect Shiksha CRM is running' });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📱 Access from other devices: 3:${PORT}`);
});

const scheduleDailyProfitSharing = () => {
  if (process.env.NODE_ENV === 'test') {
    console.log('🛑 Skipping auto profit sharing scheduler in test environment');
    return;
  }

  const runJob = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    try {
      console.log(`⏰ Auto profit sharing job started for ${month}/${year}`);
      await computeAllProjectsProfitSharing(month, year);
      console.log('✅ Auto profit sharing job completed');
    } catch (error) {
      console.error('❌ Auto profit sharing job failed:', error);
    }
  };

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const targetHour = parseInt(process.env.AUTO_PROFIT_SHARING_HOUR || '2', 10);

  const now = new Date();
  const firstRun = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    targetHour,
    0,
    0,
    0
  );

  if (firstRun <= now) {
    firstRun.setDate(firstRun.getDate() + 1);
  }

  const initialDelay = firstRun.getTime() - now.getTime();
  console.log(`🗓️ Auto profit sharing scheduled in ${(initialDelay / (60 * 1000)).toFixed(1)} minutes (daily at ${targetHour}:00)`);

  // Run immediately on startup so the latest figures are available without waiting for the first schedule window
  runJob();

  setTimeout(() => {
    runJob();
    setInterval(runJob, ONE_DAY_MS);
  }, initialDelay);
};

scheduleDailyProfitSharing();

module.exports = { app, io };

