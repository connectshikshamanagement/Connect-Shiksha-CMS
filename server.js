const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
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
const attendanceRoutes = require('./routes/attendanceRoutes');
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
const attachmentRoutes = require('./routes/attachmentRoutes');

// Initialize app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Make io accessible to routes
app.set('io', io);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://connectshikshamanagement_db_user:9WBkyhQmDvMPkozp@cluster0.2w5toa1.mongodb.net/connect-shiksha-crm')
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
app.use('/api/attachments', attachmentRoutes);

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
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = { app, io };

