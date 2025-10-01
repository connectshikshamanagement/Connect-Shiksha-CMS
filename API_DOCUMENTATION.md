# API Documentation - Connect Shiksha CRM

Base URL: `http://localhost:5000/api`

All endpoints (except auth) require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 🔐 Authentication

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "password123",
  "roleIds": ["roleId1", "roleId2"],
  "salary": 50000
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "founder@connectshiksha.com",
  "password": "founder123"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

## 👥 Users

### Get All Users
```http
GET /users
```

### Get Single User
```http
GET /users/:id
```

### Create User
```http
POST /users
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "9876543211",
  "password": "password123",
  "roleIds": ["roleId"],
  "salary": 45000
}
```

### Update User
```http
PUT /users/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "salary": 55000
}
```

### Delete User
```http
DELETE /users/:id
```

## 👔 Roles

### Get All Roles
```http
GET /roles
```

### Create Role
```http
POST /roles
Content-Type: application/json

{
  "key": "CUSTOM_ROLE",
  "name": "Custom Role",
  "permissions": {
    "users": { "create": true, "read": true, "update": false, "delete": false },
    "finance": { "create": false, "read": true, "update": false, "delete": false }
  }
}
```

## 👨‍👩‍👧‍👦 Teams

### Get All Teams
```http
GET /teams?populate=leadUserId,members
```

### Create Team
```http
POST /teams
Content-Type: application/json

{
  "name": "Product Development",
  "description": "Handles product development",
  "leadUserId": "userId",
  "members": ["userId1", "userId2"],
  "category": "Other"
}
```

## 📁 Projects

### Get All Projects
```http
GET /projects?status=active&populate=teamId,ownerId
```

### Create Project
```http
POST /projects
Content-Type: application/json

{
  "title": "New Workshop Series",
  "description": "Workshop for schools",
  "category": "Workshops",
  "status": "planned",
  "teamId": "teamId",
  "ownerId": "userId",
  "budget": 200000,
  "priority": "high"
}
```

### Update Project
```http
PUT /projects/:id
Content-Type: application/json

{
  "status": "active",
  "progress": 50
}
```

## ✅ Tasks

### Get All Tasks
```http
GET /tasks?status=in_progress
```

### Create Task
```http
POST /tasks
Content-Type: application/json

{
  "projectId": "projectId",
  "title": "Design workshop materials",
  "description": "Create presentation and handouts",
  "status": "todo",
  "assigneeIds": ["userId1", "userId2"],
  "priority": "high",
  "dueDate": "2025-10-15"
}
```

### Update Task Status (Kanban)
```http
PATCH /tasks/:id/status
Content-Type: application/json

{
  "status": "in_progress"
}
```

### Add Comment to Task
```http
POST /tasks/:id/comments
Content-Type: application/json

{
  "text": "Task is progressing well"
}
```

## 💰 Income

### Get All Income
```http
GET /income?sourceType=Coaching
```

### Create Income (Auto triggers profit sharing)
```http
POST /income
Content-Type: application/json

{
  "sourceType": "Paid Workshops",
  "amount": 150000,
  "date": "2025-10-01",
  "description": "Robotics workshop payment",
  "paymentMethod": "bank_transfer",
  "clientId": "clientId"
}
```

## 💸 Expenses

### Get All Expenses
```http
GET /expenses?status=pending
```

### Create Expense
```http
POST /expenses
Content-Type: application/json

{
  "category": "Marketing",
  "amount": 25000,
  "date": "2025-10-01",
  "description": "Facebook ads campaign",
  "paymentMethod": "card"
}
```

### Approve/Reject Expense
```http
PATCH /expenses/:id/approve
Content-Type: application/json

{
  "status": "approved"
}
```

## 🎁 Products

### Get All Products
```http
GET /products?category=IoT Kits
```

### Create Product
```http
POST /products
Content-Type: application/json

{
  "name": "Arduino Starter Kit",
  "sku": "ARD-KIT-001",
  "category": "IoT Kits",
  "costPrice": 1200,
  "sellPrice": 2000,
  "stock": 30
}
```

## 🛒 Sales

### Get All Sales
```http
GET /sales
```

### Create Sale (Auto updates stock & triggers profit sharing)
```http
POST /sales
Content-Type: application/json

{
  "productId": "productId",
  "quantity": 5,
  "unitPrice": 2500,
  "discount": 500,
  "buyer": {
    "name": "ABC School",
    "email": "school@abc.com",
    "phone": "9999888877",
    "organization": "ABC School"
  }
}
```

## 📊 Profit Sharing

### Get All Rules
```http
GET /profit-sharing/rules
```

### Create Rule
```http
POST /profit-sharing/rules
Content-Type: application/json

{
  "appliesTo": "Guest Lectures",
  "description": "70% retained, 30% to speaker",
  "distribution": [
    { "recipientType": "pool", "recipientId": "COMPANY", "percentage": 70 },
    { "recipientType": "role", "recipientId": "MENTOR", "percentage": 30 }
  ]
}
```

### Manually Trigger Profit Sharing
```http
POST /profit-sharing/compute/:incomeId
```

## 💵 Payouts

### Get All Payouts
```http
GET /payouts?month=10&year=2025&status=pending
```

### Get My Payouts
```http
GET /payouts/me
```

### Update Payout Status
```http
PATCH /payouts/:id/status
Content-Type: application/json

{
  "status": "paid",
  "paymentMethod": "bank_transfer",
  "transactionId": "TXN123456"
}
```

## 💼 Payroll

### Run Payroll
```http
GET /payroll/run?month=10&year=2025
```

### Export Payroll to Excel
```http
GET /payroll/export/excel?month=10&year=2025
```

### Export Payroll to PDF
```http
GET /payroll/export/pdf?month=10&year=2025
```

## 🏢 Clients

### Get All Clients
```http
GET /clients?status=won
```

### Create Client
```http
POST /clients
Content-Type: application/json

{
  "name": "New School",
  "type": "School",
  "status": "lead",
  "contact": {
    "primaryName": "Principal Kumar",
    "designation": "Principal",
    "email": "principal@school.com",
    "phone": "9999888877",
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  },
  "expectedRevenue": 250000
}
```

### Add Follow-up
```http
POST /clients/:id/followups
Content-Type: application/json

{
  "date": "2025-10-05",
  "notes": "Had a great meeting, sending proposal",
  "nextFollowUp": "2025-10-12"
}
```

## 📄 Invoices

### Get All Invoices
```http
GET /invoices?status=sent
```

### Create Invoice (Auto generates invoice number)
```http
POST /invoices
Content-Type: application/json

{
  "clientId": "clientId",
  "projectId": "projectId",
  "items": [
    {
      "description": "Workshop fees",
      "quantity": 1,
      "unitPrice": 150000
    }
  ],
  "taxPercentage": 18,
  "discount": 5000,
  "dueDate": "2025-10-30",
  "notes": "Payment terms: Net 30"
}
```

## 📈 Reports

### Get Dashboard Analytics
```http
GET /reports/dashboard?startDate=2025-09-01&endDate=2025-09-30

Response:
{
  "success": true,
  "data": {
    "financialSummary": {
      "totalIncome": 225000,
      "totalExpenses": 400000,
      "netProfit": -175000
    },
    "monthlyIncome": [...],
    "monthlyExpenses": [...],
    "salesPerformance": [...],
    "taskStats": [...],
    "teamPerformance": [...]
  }
}
```

### Generate Custom Report
```http
POST /reports/custom
Content-Type: application/json

{
  "reportType": "income_expense",
  "filters": {
    "income": { "sourceType": "Coaching" },
    "expense": { "category": "Marketing" }
  }
}
```

### Export Report
```http
GET /reports/export?type=income&format=excel&startDate=2025-09-01&endDate=2025-09-30
```

## 📎 Attachments

### Upload File
```http
POST /attachments
Content-Type: multipart/form-data

{
  "file": <file>,
  "type": "invoice",
  "folder": "invoices",
  "description": "Invoice for September",
  "relatedTo": "incomeId",
  "relatedToModel": "Income"
}
```

### Get All Attachments
```http
GET /attachments?type=invoice
```

### Delete Attachment
```http
DELETE /attachments/:id
```

## 📅 Attendance

### Get All Attendance
```http
GET /attendance?userId=userId&date=2025-10-01
```

### Create Attendance
```http
POST /attendance
Content-Type: application/json

{
  "userId": "userId",
  "date": "2025-10-01",
  "status": "present",
  "checkIn": "2025-10-01T09:00:00Z",
  "checkOut": "2025-10-01T18:00:00Z",
  "notes": "Regular day"
}
```

## 🔍 Query Parameters

Most GET endpoints support these query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 100)
- `sort` - Sort field (e.g., `-createdAt` for descending)
- `fields` - Select specific fields (e.g., `name,email`)
- `populate` - Populate references (e.g., `userId,teamId`)

Example:
```http
GET /tasks?page=1&limit=20&sort=-createdAt&populate=assigneeIds,projectId&status=in_progress
```

## ⚠️ Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

For more details, see the [README.md](README.md)

