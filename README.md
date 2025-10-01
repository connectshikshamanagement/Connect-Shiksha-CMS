# Connect Shiksha - Company Management System

A complete full-stack CRM system built for Connect Shiksha with web and mobile applications. This system manages teams, projects, tasks, finances, profit-sharing, payroll, clients, and provides comprehensive analytics.

## 🚀 Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API
- **MongoDB** + **Mongoose** - Database
- **JWT** - Authentication
- **AWS S3** - File storage
- **Socket.io** - Real-time updates

### Frontend (Web)
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Recharts** - Data visualization
- **Axios** - API calls
- **React Query** - Data fetching

### Mobile App
- **Flutter** - Cross-platform mobile
- **Provider** - State management
- **SQLite** - Offline storage
- **Socket.io** - Real-time sync

### DevOps
- **Docker** + **Docker Compose** - Containerization
- **MongoDB** - Database container

## 📋 Features

### 1. User & Role Management
- JWT-based authentication
- Role-based permissions (CRUD operations)
- User profiles with salary, contact info, bank details
- Roles: Founder, Innovation Lead, Coaching Manager, Media Manager, Mentors

### 2. Team Management
- Create and manage teams
- Assign team leads and members
- Track attendance and performance
- Team categories: Funding & Innovation, Coaching, Media, Workshops

### 3. Project & Task Management
- Create projects with budgets and timelines
- Kanban board for tasks (todo → in_progress → review → done)
- Task assignment, comments, checklists
- Real-time updates via Socket.io

### 4. Income & Expense Tracking
- Multiple income sources: Coaching, Workshops, Guest Lectures, Product Sales, Courses
- Expense categories with approval workflow
- Auto-calculate net profit
- Attach receipts and invoices

### 5. Profit-Sharing & Incentives
**Connect Shiksha Profit Sharing Rules:**
- **Coaching**: 70% retained, 30% to instructors
- **Workshops**: 60% retained, 30% to team, 10% lead gen bonus
- **Guest Lectures**: 70% retained, 30% to speaker
- **Product Sales**: 60% retained, 30% product team, 10% marketing
- **Online Courses**: 70% retained, 20% instructor, 10% editor

System automatically computes profit distribution after each income entry.

### 6. Payroll & Payouts
- Monthly payroll = base salary + profit shares + bonuses - deductions
- Track payout status: pending → processing → paid
- Export payroll to Excel/PDF

### 7. Client & Lead CRM
- Manage schools, colleges, CSR partners, individuals
- Track lead status: lead → contacted → proposal_sent → won → lost
- Follow-up management
- Attach proposals and contracts

### 8. Products & Sales
- Product catalog with stock tracking
- Sales management with auto stock updates
- Profit-sharing integration for sales

### 9. Reporting & Analytics
- Dashboard with:
  - Monthly income vs expenses
  - Profit trends
  - Sales performance
  - Task completion rates
  - Team performance
- Export reports as PDF/Excel
- Custom report builder

### 10. Attachments & Notifications
- AWS S3 file uploads
- Support for receipts, invoices, proposals
- Real-time notifications

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MongoDB (or use Docker)
- AWS account (for S3)
- Flutter SDK (for mobile app)

### Backend Setup

1. **Clone the repository**
```bash
cd "Full Stack CRM"
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/connect-shiksha-crm
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-south-1
AWS_S3_BUCKET=connect-shiksha-files

CLIENT_URL=http://localhost:3000
```

4. **Seed the database**
```bash
npm run seed
```

5. **Start the backend**
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to client folder**
```bash
cd client
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. **Start the frontend**
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

### Mobile App Setup

1. **Navigate to Flutter app**
```bash
cd flutter_app
```

2. **Get Flutter dependencies**
```bash
flutter pub get
```

3. **Run the app**
```bash
flutter run
```

### Docker Setup

Run everything with Docker Compose:

```bash
docker-compose up -d
```

This will start:
- MongoDB on port 27017
- Backend API on port 5000
- Frontend on port 3000

## 📱 Default Credentials

After running the seed script:

**Email:** founder@connectshiksha.com  
**Password:** founder123

Other test users:
- innovation@connectshiksha.com / innovation123
- coaching@connectshiksha.com / coaching123
- media@connectshiksha.com / media123
- mentor1@connectshiksha.com / mentor123

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Teams
- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team

### Projects & Tasks
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id/status` - Update task status

### Finance
- `GET /api/income` - Get income records
- `POST /api/income` - Add income
- `GET /api/expenses` - Get expenses
- `POST /api/expenses` - Add expense
- `PATCH /api/expenses/:id/approve` - Approve/reject expense

### Payroll
- `GET /api/payroll/run` - Run payroll
- `GET /api/payroll/export/excel` - Export to Excel
- `GET /api/payroll/export/pdf` - Export to PDF

### Reports
- `GET /api/reports/dashboard` - Get dashboard analytics
- `POST /api/reports/custom` - Generate custom report
- `GET /api/reports/export` - Export report

## 📊 Database Schema

### Collections
- `users` - User accounts and profiles
- `roles` - Roles and permissions
- `teams` - Team structure
- `projects` - Project management
- `tasks` - Task tracking
- `attendance` - Attendance records
- `income` - Income transactions
- `expenses` - Expense records
- `products` - Product catalog
- `sales` - Sales transactions
- `profit_sharing_rules` - Profit distribution rules
- `payouts` - Employee payouts
- `clients` - Client/Lead management
- `invoices` - Invoice management
- `attachments` - File uploads
- `reports` - Saved reports

## 🎨 Frontend Pages

- `/` - Home/Redirect
- `/login` - Login page
- `/dashboard` - Main dashboard
- `/dashboard/teams` - Team management
- `/dashboard/projects` - Project management
- `/dashboard/tasks` - Task board
- `/dashboard/clients` - Client CRM
- `/dashboard/finance` - Finance tracking
- `/dashboard/products` - Product catalog
- `/dashboard/reports` - Analytics & reports
- `/dashboard/settings` - Settings

## 📱 Mobile App Features

- Dashboard with key metrics
- Task management
- Attendance tracking
- Income/Expense logging
- Offline sync
- Real-time notifications

## 🚢 Deployment

### Backend (Render/Heroku/AWS)
1. Set environment variables
2. Push to repository
3. Deploy using platform CLI or GUI

### Frontend (Vercel/Netlify)
1. Connect GitHub repository
2. Set `NEXT_PUBLIC_API_URL`
3. Deploy

### Mobile App
- **Android**: Build APK with `flutter build apk`
- **iOS**: Build with `flutter build ios`

## 🤝 Contributing

This is a private project for Connect Shiksha. For feature requests or bug reports, contact the development team.

## 📄 License

Proprietary - © 2025 Connect Shiksha

## 👨‍💻 Support

For technical support, contact: founder@connectshiksha.com

---

**Built with ❤️ for Connect Shiksha**

