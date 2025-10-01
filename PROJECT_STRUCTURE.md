# Project Structure - Connect Shiksha CRM

## 📂 Directory Overview

```
Full Stack CRM/
├── 📁 models/                    # MongoDB Mongoose models
│   ├── User.js                   # User accounts & authentication
│   ├── Role.js                   # Roles & permissions
│   ├── Team.js                   # Team management
│   ├── Project.js                # Project tracking
│   ├── Task.js                   # Task management with Kanban
│   ├── Attendance.js             # Employee attendance
│   ├── Income.js                 # Income transactions
│   ├── Expense.js                # Expense tracking
│   ├── Product.js                # Product catalog
│   ├── Sale.js                   # Sales transactions
│   ├── ProfitSharingRule.js      # Profit distribution rules
│   ├── Payout.js                 # Employee payouts
│   ├── Client.js                 # CRM client management
│   ├── Invoice.js                # Invoice management
│   ├── Attachment.js             # File uploads
│   └── Report.js                 # Saved reports
│
├── 📁 routes/                    # Express API routes
│   ├── authRoutes.js             # Authentication endpoints
│   ├── userRoutes.js             # User CRUD
│   ├── roleRoutes.js             # Role management
│   ├── teamRoutes.js             # Team operations
│   ├── projectRoutes.js          # Project management
│   ├── taskRoutes.js             # Task operations with real-time
│   ├── attendanceRoutes.js       # Attendance tracking
│   ├── incomeRoutes.js           # Income with profit sharing
│   ├── expenseRoutes.js          # Expense approval workflow
│   ├── productRoutes.js          # Product catalog
│   ├── salesRoutes.js            # Sales with stock updates
│   ├── profitSharingRoutes.js    # Profit rules & computation
│   ├── payoutRoutes.js           # Payout management
│   ├── payrollRoutes.js          # Payroll processing & export
│   ├── clientRoutes.js           # CRM operations
│   ├── invoiceRoutes.js          # Invoice generation
│   ├── reportRoutes.js           # Analytics & exports
│   └── attachmentRoutes.js       # File uploads to S3
│
├── 📁 controllers/               # Business logic
│   ├── authController.js         # Auth logic
│   ├── userController.js         # User operations
│   └── genericController.js      # Reusable CRUD factory
│
├── 📁 middleware/                # Express middleware
│   ├── auth.js                   # JWT authentication & authorization
│   └── upload.js                 # Multer & S3 file upload
│
├── 📁 utils/                     # Helper utilities
│   └── profitSharing.js          # Profit distribution logic
│
├── 📁 seed/                      # Database seeding
│   └── seed.js                   # Sample data for Connect Shiksha
│
├── 📁 client/                    # Next.js frontend
│   ├── 📁 app/                   # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home/redirect page
│   │   ├── globals.css           # Global styles with Tailwind
│   │   ├── 📁 login/
│   │   │   └── page.tsx          # Login page
│   │   └── 📁 dashboard/
│   │       ├── page.tsx          # Dashboard analytics
│   │       ├── teams/            # Team management
│   │       ├── projects/         # Project management
│   │       ├── tasks/            # Task board
│   │       ├── clients/          # CRM
│   │       ├── finance/          # Income/Expense
│   │       ├── products/         # Product catalog
│   │       ├── reports/          # Analytics
│   │       └── settings/         # Settings
│   │
│   ├── 📁 components/            # React components
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── Header.tsx            # Top header
│   │   ├── StatCard.tsx          # Dashboard stat cards
│   │   └── ...                   # More components
│   │
│   ├── 📁 lib/                   # Client utilities
│   │   └── api.ts                # Axios API client
│   │
│   ├── package.json              # Frontend dependencies
│   ├── tailwind.config.js        # Tailwind configuration
│   ├── tsconfig.json             # TypeScript config
│   └── next.config.js            # Next.js config
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
├── server.js                     # Express server entry point
├── backend-package.json          # Backend dependencies
├── Dockerfile                    # Backend Docker image
├── docker-compose.yml            # Multi-container setup
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── README.md                     # Main documentation
├── QUICKSTART.md                 # Quick setup guide
├── API_DOCUMENTATION.md          # API reference
└── PROJECT_STRUCTURE.md          # This file
```

## 🔑 Key Files Explained

### Backend Core

**`server.js`**
- Main Express server
- MongoDB connection
- Socket.io setup
- Route mounting
- Error handling

**`models/`**
- Mongoose schemas with validation
- Business logic in pre/post hooks
- Virtual fields for computed data
- Indexes for performance

**`routes/`**
- RESTful API endpoints
- JWT authentication middleware
- Role-based authorization
- Request validation

**`controllers/`**
- Business logic separation
- Error handling
- Response formatting
- Generic CRUD factory

**`middleware/auth.js`**
- JWT token verification
- User authentication
- Permission checking
- Token generation

**`utils/profitSharing.js`**
- Automatic profit distribution
- Rule-based allocation
- Payout creation
- Multi-recipient handling

### Frontend (Next.js)

**`client/app/layout.tsx`**
- Root layout component
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

**`client/app/dashboard/page.tsx`**
- Analytics dashboard
- Real-time data fetching
- Chart visualizations
- Summary statistics

**`client/components/Sidebar.tsx`**
- Navigation menu
- Active route highlighting
- Logout functionality

**`client/lib/api.ts`**
- Axios configuration
- API endpoint definitions
- Request/response interceptors
- Token injection

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
- Sample users & roles
- Test data for Connect Shiksha
- Profit sharing rules

## 🔄 Data Flow

### Income Entry → Profit Sharing → Payout
```
1. POST /api/income
   ↓
2. Create income record
   ↓
3. Find applicable profit sharing rule
   ↓
4. Calculate distribution percentages
   ↓
5. Create/update payout records for recipients
   ↓
6. Return success response
```

### Task Update → Real-time Notification
```
1. PATCH /api/tasks/:id/status
   ↓
2. Update task in MongoDB
   ↓
3. Emit Socket.io event
   ↓
4. Connected clients receive update
   ↓
5. UI updates automatically
```

### Payroll Processing
```
1. GET /api/payroll/run?month=10&year=2025
   ↓
2. Fetch all payouts for month/year
   ↓
3. Calculate totals (salary + shares + bonuses - deductions)
   ↓
4. Generate Excel/PDF
   ↓
5. Return downloadable file
```

## 🎨 UI Component Hierarchy

```
App
├── Layout
│   ├── Sidebar
│   │   └── Navigation Items
│   └── Main Content
│       ├── Header
│       │   ├── Search
│       │   ├── Notifications
│       │   └── User Menu
│       └── Page Content
│           ├── Dashboard
│           │   ├── Stat Cards
│           │   ├── Charts
│           │   └── Activity Feed
│           ├── Projects
│           │   ├── Project List
│           │   └── Project Form
│           ├── Tasks (Kanban)
│           │   ├── Todo Column
│           │   ├── In Progress Column
│           │   ├── Review Column
│           │   └── Done Column
│           └── ... other pages
```

## 🗃️ Database Collections

```
MongoDB: connect-shiksha-crm
├── users (6 documents)
├── roles (5 documents)
├── teams (3 documents)
├── projects (variable)
├── tasks (variable)
├── attendance (variable)
├── income (variable)
├── expenses (variable)
├── products (3 documents)
├── sales (variable)
├── profit_sharing_rules (5 documents)
├── payouts (variable)
├── clients (variable)
├── invoices (variable)
├── attachments (variable)
└── reports (variable)
```

## 📦 Dependencies

### Backend
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **jsonwebtoken** - JWT auth
- **bcryptjs** - Password hashing
- **socket.io** - Real-time communication
- **aws-sdk** - S3 file storage
- **exceljs** - Excel export
- **pdfkit** - PDF generation

### Frontend
- **next** - React framework
- **react** - UI library
- **tailwindcss** - CSS framework
- **axios** - HTTP client
- **recharts** - Data visualization
- **react-hot-toast** - Notifications

### Mobile
- **flutter** - Cross-platform framework
- **provider** - State management
- **http** - HTTP client
- **sqflite** - Local database
- **socket_io_client** - Real-time updates

## 🚀 Build & Deploy

### Development
```bash
npm run dev          # Backend dev server
cd client && npm run dev  # Frontend dev server
cd flutter_app && flutter run  # Mobile app
```

### Production
```bash
docker-compose up -d  # All services in containers
npm run build        # Production build
```

## 📖 Further Reading

- [README.md](README.md) - Main documentation
- [QUICKSTART.md](QUICKSTART.md) - Setup guide
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference

---

**Happy Coding! 🎉**

