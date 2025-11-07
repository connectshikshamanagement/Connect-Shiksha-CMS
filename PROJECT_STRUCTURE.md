# Project Structure - Connect Shiksha CRM

## 📂 Directory Overview

```
Full Stack CRM/
├── 📁 models/                    # MongoDB Mongoose models (18 models)
│   ├── User.js                   # User accounts & authentication
│   ├── Role.js                   # Roles & permissions (5 roles)
│   ├── Team.js                   # Team management
│   ├── Project.js                # Project tracking with budgets
│   ├── Task.js                   # Task management with Kanban
│   ├── Attendance.js             # Employee attendance tracking
│   ├── Income.js                 # Income transactions
│   ├── Expense.js                # Expense tracking & approval
│   ├── Product.js                # Product catalog & inventory
│   ├── Sale.js                   # Sales transactions
│   ├── ProfitSharingRule.js      # Profit distribution rules
│   ├── Payout.js                 # Employee payouts & profit shares
│   ├── Payroll.js                # Payroll records & calculations
│   ├── AdvancePayment.js         # Advance payment requests
│   ├── Client.js                 # CRM client management
│   ├── Invoice.js                # Invoice generation
│   ├── Attachment.js             # File uploads to S3
│   └── Report.js                 # Saved reports & analytics
│
├── 📁 routes/                    # Express API routes (28 route files)
│   ├── authRoutes.js             # Authentication endpoints
│   ├── userRoutes.js             # User CRUD operations
│   ├── userHistoryRoutes.js      # User activity history
│   ├── roleRoutes.js             # Role management
│   ├── teamRoutes.js             # Team operations
│   ├── teamBudgetRoutes.js       # Team budget tracking
│   ├── teamPerformanceRoutes.js  # Team performance metrics
│   ├── teamMemberFinanceRoutes.js # Member finance tracking
│   ├── projectRoutes.js          # Project management
│   ├── projectProfitRoutes.js    # Project-based profit sharing
│   ├── taskRoutes.js             # Task operations (basic)
│   ├── enhancedTaskRoutes.js     # Enhanced task operations with real-time
│   ├── attendanceRoutes.js       # Attendance tracking
│   ├── incomeRoutes.js           # Income with profit sharing
│   ├── expenseRoutes.js          # Expense operations (basic)
│   ├── enhancedExpenseRoutes.js  # Enhanced expense workflow
│   ├── financeRoutes.js          # Finance dashboard & analytics
│   ├── productRoutes.js          # Product catalog
│   ├── salesRoutes.js            # Sales with stock updates
│   ├── profitSharingRoutes.js    # Profit rules & computation
│   ├── payoutRoutes.js           # Payout management
│   ├── payrollRoutes.js          # Payroll processing & export
│   ├── advancePaymentRoutes.js   # Advance payment requests
│   ├── clientRoutes.js           # CRM operations
│   ├── invoiceRoutes.js          # Invoice generation
│   ├── reportRoutes.js           # Analytics & exports
│   ├── attachmentRoutes.js       # File uploads to S3
│   └── dataManagementRoutes.js   # Data import/export utilities
│
├── 📁 controllers/               # Business logic
│   ├── authController.js         # Authentication logic
│   ├── userController.js         # User operations
│   └── genericController.js      # Reusable CRUD factory
│
├── 📁 middleware/               # Express middleware (6 files)
│   ├── auth.js                   # JWT authentication & authorization
│   ├── roleAccess.js             # Role-based access control
│   ├── validation.js             # Request validation with Joi
│   ├── rateLimiter.js            # Rate limiting (4 limiters)
│   ├── logger.js                 # Winston logging with rotation
│   └── upload.js                 # Multer & S3 file upload
│
├── 📁 utils/                     # Helper utilities (4 files)
│   ├── profitSharing.js          # Profit distribution logic
│   ├── projectProfitSharing.js   # Project-based profit sharing
│   ├── budgetTracking.js         # Budget tracking & warnings
│   └── roleAccess.js             # Role access utilities
│
├── 📁 scripts/                   # Utility scripts (58 files)
│   ├── seedProfitSharingRules.js # Seed profit sharing rules
│   ├── setRolePermissions.js     # Configure role permissions
│   ├── testPayrollAPI.js         # Test payroll endpoints
│   ├── checkPayrollData.js       # Validate payroll data
│   ├── fixProfitSharingRules.js  # Fix profit sharing calculations
│   └── ...                       # Many more utility scripts
│
├── 📁 seed/                      # Database seeding
│   └── seed.js                   # Sample data for Connect Shiksha
│
├── 📁 client/                    # Next.js 14 frontend
│   ├── 📁 app/                   # Next.js App Router
│   │   ├── layout.tsx            # Root layout with Socket.io
│   │   ├── page.tsx              # Home/redirect page
│   │   ├── globals.css           # Global styles with Tailwind
│   │   ├── 📁 login/
│   │   │   └── page.tsx          # Login page with JWT
│   │   └── 📁 dashboard/
│   │       ├── page.tsx          # Dashboard analytics with charts
│   │       ├── teams/page.tsx    # Team management (CRUD)
│   │       ├── projects/page.tsx # Project management (CRUD)
│   │       ├── tasks/page.tsx    # Task Kanban board (drag-drop)
│   │       ├── clients/page.tsx  # CRM pipeline management
│   │       ├── finance/page.tsx  # Finance dashboard
│   │       ├── finance-history/page.tsx # Finance history
│   │       ├── products/page.tsx # Product catalog (CRUD)
│   │       ├── sales/page.tsx    # Sales management
│   │       ├── payroll/page.tsx  # Payroll view & export
│   │       ├── reports/page.tsx  # Analytics & reports
│   │       ├── settings/page.tsx # User settings
│   │       ├── members/page.tsx  # Member management
│   │       ├── founder/members/page.tsx # Founder member view
│   │       ├── my-tasks/page.tsx # Personal task view
│   │       ├── my-expenses/page.tsx # Personal expenses
│   │       ├── my-advance-payments/page.tsx # Personal advances
│   │       ├── advance-payments/page.tsx # Advance payment management
│   │       ├── profile/history/page.tsx # Profile history
│   │       └── data-management/page.tsx # Data import/export
│   │
│   ├── 📁 components/            # React components (9 files)
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── Header.tsx            # Top header with user menu
│   │   ├── MobileNavbar.tsx      # Mobile navigation
│   │   ├── FABMenu.tsx           # Floating action button menu
│   │   ├── Modal.tsx             # Reusable modal (sm/md/lg/xl)
│   │   ├── Button.tsx            # Button component (5 variants)
│   │   ├── FormInput.tsx         # Form input with validation
│   │   ├── FormSelect.tsx        # Form select dropdown
│   │   └── 📁 tasks/
│   │       └── TaskList.tsx      # Task list component
│   │
│   ├── 📁 contexts/              # React contexts
│   │   └── SocketContext.tsx     # Socket.io context provider
│   │
│   ├── 📁 hooks/                 # Custom React hooks
│   │   ├── usePermissions.ts     # Permission checking hook
│   │   └── useTaskSocketEvents.ts # Task socket event handling
│   │
│   ├── 📁 lib/                   # Client utilities
│   │   ├── api.ts                # Axios API client with interceptors
│   │   ├── date.ts               # Date utility functions
│   │   └── toast.ts              # Toast notification helpers
│   │
│   ├── 📁 utils/                 # Client-side utilities
│   │   └── refreshUserData.js    # User data refresh utility
│   │
│   ├── package.json              # Frontend dependencies
│   ├── tailwind.config.js        # Tailwind configuration
│   ├── tsconfig.json             # TypeScript config
│   ├── next.config.js            # Next.js config
│   └── Dockerfile                # Frontend Docker image
│
├── 📁 flutter_app/               # Flutter mobile app
│   ├── 📁 lib/
│   │   ├── main.dart             # App entry point
│   │   ├── 📁 screens/
│   │   │   ├── login_screen.dart # Login UI
│   │   │   ├── dashboard_screen.dart # Dashboard
│   │   │   ├── tasks_screen.dart # Task management
│   │   │   └── ...
│   │   ├── 📁 providers/         # State management
│   │   │   ├── auth_provider.dart
│   │   │   ├── dashboard_provider.dart
│   │   │   └── ...
│   │   ├── 📁 services/          # API services
│   │   │   └── api_service.dart  # HTTP client
│   │   ├── 📁 models/            # Data models
│   │   │   └── ...
│   │   └── 📁 widgets/           # Reusable widgets
│   │       └── ...
│   └── pubspec.yaml              # Flutter dependencies
│
├── 📁 postman/                   # API testing
│   └── Connect-Shiksha-CRM.postman_collection.json # Postman collection
│
├── 📁 tests/                     # Test files
│   └── e2e-test-script.md        # E2E test documentation
│
├── 📁 temp/                      # Temporary files
│   ├── exports/                  # Generated exports
│   └── uploads/                  # Uploaded files
│
├── server.js                     # Express server entry point
├── package.json                  # Backend dependencies
├── backend-package.json          # Backend dependencies (alias)
├── Dockerfile                    # Backend Docker image
├── docker-compose.yml            # Multi-container setup
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── README.md                     # Main documentation
├── QUICKSTART.md                 # Quick setup guide
├── API_DOCUMENTATION.md          # API reference
├── SYSTEM_FEATURES.md            # Complete feature list
├── VISUAL_SYSTEM_MAP.md          # Visual system overview
└── PROJECT_STRUCTURE.md          # This file
```

## 🔑 Key Files Explained

### Backend Core

**`server.js`**
- Main Express server with HTTP server
- MongoDB connection (MongoDB Atlas)
- Socket.io setup for real-time updates
- 28 route modules mounted
- CORS, Helmet, Morgan middleware
- Health check endpoint
- Error handling middleware

**`models/` (18 models)**
- Mongoose schemas with validation
- Business logic in pre/post hooks
- Virtual fields for computed data
- Indexes for performance
- Relationships between models
- **New Models:**
  - `AdvancePayment.js` - Advance payment requests
  - `Payroll.js` - Payroll records with calculations

**`routes/` (28 route files)**
- RESTful API endpoints
- JWT authentication middleware
- Role-based authorization
- Request validation with Joi
- **Enhanced Routes:**
  - `enhancedTaskRoutes.js` - Real-time task updates
  - `enhancedExpenseRoutes.js` - Expense workflow
  - `financeRoutes.js` - Finance dashboard
  - `projectProfitRoutes.js` - Project profit sharing
  - `teamBudgetRoutes.js` - Budget tracking
  - `teamPerformanceRoutes.js` - Performance metrics
  - `teamMemberFinanceRoutes.js` - Member finances
  - `advancePaymentRoutes.js` - Advance payments
  - `dataManagementRoutes.js` - Data utilities

**`controllers/`**
- Business logic separation
- Error handling
- Response formatting
- Generic CRUD factory for reusable operations

**`middleware/` (6 files)**
- `auth.js` - JWT token verification & user authentication
- `roleAccess.js` - Role-based access control (RBAC)
- `validation.js` - Request validation with Joi schemas
- `rateLimiter.js` - 4 rate limiters (auth/API/upload/expensive)
- `logger.js` - Winston logging with rotation
- `upload.js` - Multer & S3 file upload

**`utils/` (4 files)**
- `profitSharing.js` - Automatic profit distribution logic
- `projectProfitSharing.js` - Project-based profit sharing
- `budgetTracking.js` - Budget tracking & warnings
- `roleAccess.js` - Role access utilities

**`scripts/` (58 utility scripts)**
- Database migration scripts
- Data validation scripts
- Testing scripts
- Fix/update scripts for data integrity

### Frontend (Next.js 14)

**`client/app/layout.tsx`**
- Root layout component
- Socket.io context provider
- Global styles
- Font configuration
- Metadata

**`client/app/page.tsx`**
- Home page with auth redirect
- Checks for existing token
- Routes to dashboard or login

**`client/app/login/page.tsx`**
- Authentication form
- JWT token storage
- User session management
- Rate limiting feedback

**`client/app/dashboard/page.tsx`**
- Analytics dashboard with Recharts
- Real-time data fetching
- Multiple chart visualizations:
  - Line charts (income/expense trends)
  - Bar charts (team performance)
  - Pie charts (task distribution)
- Summary statistics cards
- Quick action buttons
- Role-based content display

**Dashboard Pages (18 pages):**
- `teams/page.tsx` - Full CRUD with member management
- `projects/page.tsx` - Project CRUD with budget tracking
- `tasks/page.tsx` - Kanban board with drag-drop (@dnd-kit)
- `clients/page.tsx` - CRM pipeline with 7 stages
- `finance/page.tsx` - Finance dashboard with totals
- `finance-history/page.tsx` - Historical finance data
- `products/page.tsx` - Product catalog with stock alerts
- `sales/page.tsx` - Sales management
- `payroll/page.tsx` - Payroll view with Excel/PDF export
- `reports/page.tsx` - Analytics & reports
- `settings/page.tsx` - User settings & profile
- `members/page.tsx` - Member management
- `founder/members/page.tsx` - Founder member view
- `my-tasks/page.tsx` - Personal task view
- `my-expenses/page.tsx` - Personal expenses
- `my-advance-payments/page.tsx` - Personal advances
- `advance-payments/page.tsx` - Advance payment management
- `profile/history/page.tsx` - Profile activity history
- `data-management/page.tsx` - Data import/export

**`client/components/` (9 components)**
- `Sidebar.tsx` - Navigation sidebar with role-based menu
- `Header.tsx` - Top header with user menu & notifications
- `MobileNavbar.tsx` - Mobile-responsive navigation
- `FABMenu.tsx` - Floating action button menu
- `Modal.tsx` - Reusable modal (sm/md/lg/xl sizes, keyboard nav)
- `Button.tsx` - Button component (5 variants, loading states)
- `FormInput.tsx` - Form input with validation & error display
- `FormSelect.tsx` - Form select dropdown with options
- `tasks/TaskList.tsx` - Task list component

**`client/contexts/SocketContext.tsx`**
- Socket.io context provider
- Real-time event handling
- Connection management

**`client/hooks/`**
- `usePermissions.ts` - Permission checking hook (isFounder, isManager, isMember)
- `useTaskSocketEvents.ts` - Task socket event handling

**`client/lib/api.ts`**
- Axios configuration with base URL
- API endpoint definitions (all modules)
- Request/response interceptors
- Token injection
- Error handling

**`client/lib/date.ts`**
- Date formatting utilities
- Date manipulation helpers

**`client/lib/toast.ts`**
- Toast notification helpers
- Success/error/info toasts

### Mobile App (Flutter)

**`flutter_app/lib/main.dart`**
- App initialization
- Provider setup
- Theme configuration
- Route management

**`flutter_app/lib/providers/`**
- State management with Provider
- API data caching
- Local storage
- Reactive updates

**`flutter_app/lib/services/api_service.dart`**
- HTTP client
- JWT token handling
- Error handling
- Response parsing

### DevOps

**`Dockerfile`**
- Node.js base image
- Dependency installation
- Production build
- Container configuration

**`docker-compose.yml`**
- MongoDB service
- Backend API service
- Frontend service
- Network & volume setup

**`seed/seed.js`**
- Database initialization
- Sample users & roles (5 roles)
- Test data for Connect Shiksha
- Profit sharing rules
- Teams & projects

## 🔄 Data Flow

### Income Entry → Profit Sharing → Payout
```
1. POST /api/income
   ↓
2. Create income record
   ↓
3. Link income to project (if applicable)
   ↓
4. Find applicable profit sharing rule
   ↓
5. Calculate distribution percentages
   ↓
6. Create/update payout records for recipients
   ↓
7. Update project totals
   ↓
8. Return success response
```

### Task Update → Real-time Notification
```
1. PATCH /api/tasks/:id/status (via enhancedTaskRoutes)
   ↓
2. Update task in MongoDB
   ↓
3. Emit Socket.io event (task:updated)
   ↓
4. Connected clients receive update
   ↓
5. UI updates automatically via SocketContext
```

### Expense Approval Workflow
```
1. POST /api/expenses (via enhancedExpenseRoutes)
   ↓
2. Create expense record (status: pending)
   ↓
3. Founder/Manager reviews
   ↓
4. PATCH /api/expenses/:id/approve
   ↓
5. Update status to approved
   ↓
6. Update project/team budgets
   ↓
7. Emit notification
```

### Payroll Processing
```
1. GET /api/payroll/run?month=10&year=2025
   ↓
2. Fetch all payouts for month/year
   ↓
3. Calculate totals (baseSalary + profitShares + bonuses - deductions)
   ↓
4. Create/update Payroll records
   ↓
5. Generate Excel/PDF export
   ↓
6. Return downloadable file
```

### Project Budget Tracking
```
1. Create/Update Project with budget
   ↓
2. Add expenses to project
   ↓
3. Budget tracking utility calculates:
   - Total expenses
   - Remaining budget
   - Budget utilization %
   ↓
4. Warnings when budget exceeded
   ↓
5. Dashboard shows budget status
```

## 🎨 UI Component Hierarchy

```
App
├── Layout (SocketContext Provider)
│   ├── Sidebar
│   │   ├── Navigation Items (role-based)
│   │   └── User Info
│   ├── MobileNavbar (mobile only)
│   └── Main Content
│       ├── Header
│       │   ├── Search
│       │   ├── Notifications
│       │   └── User Menu
│       └── Page Content
│           ├── Dashboard
│           │   ├── Stat Cards (4 cards)
│           │   ├── Charts (Line/Bar/Pie)
│           │   └── Quick Actions
│           ├── Projects
│           │   ├── Project List (cards)
│           │   ├── Project Form (Modal)
│           │   └── Budget Tracking
│           ├── Tasks (Kanban)
│           │   ├── Todo Column (drag-drop)
│           │   ├── In Progress Column
│           │   ├── Review Column
│           │   └── Done Column
│           ├── Clients (CRM)
│           │   ├── Pipeline View
│           │   ├── Status Filters
│           │   └── Client Form
│           ├── Finance
│           │   ├── Income/Expense Forms
│           │   ├── Totals Display
│           │   └── History Table
│           └── ... other pages
│
└── FABMenu (floating action button)
```

## 🗃️ Database Collections

```
MongoDB: connect-shiksha-crm
├── users (variable)
├── roles (5 documents: founder, innovation_lead, coaching_manager, media_manager, mentor)
├── teams (variable)
├── projects (variable)
├── tasks (variable)
├── attendance (variable)
├── income (variable)
├── expenses (variable)
├── products (variable)
├── sales (variable)
├── profit_sharing_rules (variable)
├── payouts (variable)
├── payrolls (variable)
├── advance_payments (variable)
├── clients (variable)
├── invoices (variable)
├── attachments (variable)
└── reports (variable)
```

## 📦 Dependencies

### Backend
- **express** (^4.18.2) - Web framework
- **mongoose** (^8.0.3) - MongoDB ODM
- **jsonwebtoken** (^9.0.2) - JWT auth
- **bcryptjs** (^2.4.3) - Password hashing
- **socket.io** (^4.6.1) - Real-time communication
- **aws-sdk** (^2.1498.0) - S3 file storage
- **exceljs** (^4.3.0) - Excel export
- **pdfkit** (^0.13.0) - PDF generation
- **helmet** (^7.2.0) - Security headers
- **cors** (^2.8.5) - CORS middleware
- **morgan** (^1.10.0) - HTTP logging
- **express-rate-limit** (^7.5.1) - Rate limiting
- **express-validator** (^7.2.1) - Request validation
- **joi** (^18.0.1) - Schema validation
- **winston** (^3.18.3) - Logging
- **multer** (^1.4.5-lts.1) - File uploads
- **dotenv** (^16.3.1) - Environment variables
- **archiver** (^7.0.1) - File archiving
- **adm-zip** (^0.5.16) - ZIP file handling

### Frontend
- **next** (14.0.4) - React framework
- **react** (^18.2.0) - UI library
- **react-dom** (^18.2.0) - React DOM
- **tailwindcss** (^3.4.0) - CSS framework
- **axios** (^1.6.2) - HTTP client
- **recharts** (^2.15.4) - Data visualization
- **react-hot-toast** (^2.6.0) - Notifications
- **react-icons** (^4.12.0) - Icon library
- **socket.io-client** (^4.6.1) - Real-time client
- **@dnd-kit/core** (^6.3.1) - Drag and drop
- **@dnd-kit/sortable** (^10.0.0) - Sortable lists
- **react-hook-form** (^7.63.0) - Form handling
- **@hookform/resolvers** (^5.2.2) - Form validation
- **zod** (^4.1.11) - Schema validation
- **zustand** (^4.4.7) - State management
- **react-query** (^3.39.3) - Data fetching
- **date-fns** (^3.6.0) - Date utilities
- **typescript** (^5.3.3) - TypeScript

### Mobile
- **flutter** - Cross-platform framework
- **provider** - State management
- **http** - HTTP client
- **sqflite** - Local database
- **socket_io_client** - Real-time updates

## 🚀 Build & Deploy

### Development
```bash
# Backend
npm run dev          # Backend dev server (nodemon)
npm run seed         # Seed database

# Frontend
cd client
npm run dev          # Frontend dev server (Next.js)

# Mobile
cd flutter_app
flutter run          # Mobile app
```

### Production
```bash
# Docker Compose
docker-compose up -d  # All services in containers

# Manual
npm start            # Backend production
cd client && npm run build && npm start  # Frontend production
```

## ✨ Key Features Implemented

### 🔐 Authentication & Security
- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ 5 predefined roles with granular permissions
- ✅ Rate limiting (4 different limiters)
- ✅ Password hashing with bcrypt
- ✅ Request validation with Joi
- ✅ Security headers with Helmet

### 👥 Team Management
- ✅ Full CRUD operations
- ✅ Team categories (5 types)
- ✅ Member assignment
- ✅ Team lead assignment
- ✅ Budget tracking per team
- ✅ Performance metrics

### 📁 Project Management
- ✅ Full CRUD operations
- ✅ Budget tracking & warnings
- ✅ Progress tracking
- ✅ Timeline management
- ✅ Project-based profit sharing
- ✅ Expense linking to projects

### ✅ Task Management
- ✅ Kanban board with drag-drop
- ✅ 4 status columns (Todo/In Progress/Review/Done)
- ✅ Real-time updates via Socket.io
- ✅ Task assignment
- ✅ Priority levels
- ✅ Due dates
- ✅ Comments & attachments (API ready)

### 🏢 CRM (Client Management)
- ✅ Full CRUD operations
- ✅ 7-stage pipeline (lead → won/lost)
- ✅ Status filtering
- ✅ Follow-up tracking
- ✅ Revenue tracking
- ✅ Contact management

### 💰 Financial Management
- ✅ Income tracking (6 sources)
- ✅ Expense tracking with approval workflow
- ✅ Finance dashboard with totals
- ✅ Finance history
- ✅ Budget tracking
- ✅ Advance payment requests
- ✅ Profit sharing automation
- ✅ Payroll processing & export

### 📦 Inventory Management
- ✅ Product catalog
- ✅ Stock tracking
- ✅ Low stock alerts
- ✅ Sales with auto stock decrement

### 📊 Analytics & Reports
- ✅ Dashboard with charts (Line/Bar/Pie)
- ✅ Team performance metrics
- ✅ Financial reports
- ✅ Export to Excel/PDF
- ✅ Custom report generation

### 🔔 Real-time Features
- ✅ Socket.io integration
- ✅ Real-time task updates
- ✅ Live notifications
- ✅ Collaborative editing

## 📖 Further Reading

- [README.md](README.md) - Main documentation
- [QUICKSTART.md](QUICKSTART.md) - Setup guide
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [SYSTEM_FEATURES.md](SYSTEM_FEATURES.md) - Complete feature list
- [VISUAL_SYSTEM_MAP.md](VISUAL_SYSTEM_MAP.md) - Visual system overview

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** ✅ Production-Ready

**Happy Coding! 🎉**
