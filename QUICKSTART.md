# Quick Start Guide - Connect Shiksha CRM

## 🚀 Get Started in 5 Minutes

### Option 1: Docker (Recommended)

The easiest way to run everything:

```bash
# 1. Clone and navigate to project
cd "Full Stack CRM"

# 2. Create .env file
cp .env.example .env
# Edit .env and add your AWS credentials (optional for local dev)

# 3. Start all services
docker-compose up -d

# 4. Seed the database
docker exec -it connect-shiksha-backend npm run seed

# 5. Open your browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Login: founder@connectshiksha.com / founder123
```

### Option 2: Manual Setup

If you prefer running services individually:

#### Backend

```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB (if not using Docker)
# Make sure MongoDB is running on localhost:27017

# 3. Create .env file
cp .env.example .env

# 4. Seed database
npm run seed

# 5. Start backend
npm run dev
# Backend runs on http://localhost:5000
```

#### Frontend

```bash
# 1. Navigate to client folder
cd client

# 2. Install dependencies
npm install

# 3. Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

# 4. Start frontend
npm run dev
# Frontend runs on http://localhost:3000
```

#### Mobile App

```bash
# 1. Navigate to Flutter app
cd flutter_app

# 2. Get dependencies
flutter pub get

# 3. Run on emulator/device
flutter run
```

## 📱 Test Accounts

After seeding, you can login with these accounts:

| Email | Password | Role |
|-------|----------|------|
| founder@connectshiksha.com | founder123 | Founder (Full Access) |
| innovation@connectshiksha.com | innovation123 | Innovation Lead |
| coaching@connectshiksha.com | coaching123 | Coaching Manager |
| media@connectshiksha.com | media123 | Media Manager |
| mentor1@connectshiksha.com | mentor123 | Mentor |

## 🎯 What to Try First

1. **Login** to the web app at http://localhost:3000
2. **View Dashboard** - See income, expenses, and profit analytics
3. **Create a Project** - Navigate to Projects and add a new one
4. **Add a Task** - Create tasks and move them through Kanban stages
5. **Record Income** - Add income and watch profit-sharing auto-calculate
6. **Check Payouts** - View auto-generated payouts based on profit rules
7. **Explore Reports** - Generate financial and team performance reports

## 🐛 Common Issues

### MongoDB Connection Failed
```bash
# Make sure MongoDB is running
docker-compose up mongodb -d
# Or install MongoDB locally
```

### Port Already in Use
```bash
# Check what's using the port
lsof -ti:5000  # Backend
lsof -ti:3000  # Frontend

# Kill the process or change ports in .env
```

### AWS S3 Errors
```bash
# For local development, S3 is optional
# You can skip file uploads or use fake AWS credentials
```

### Seed Script Fails
```bash
# Clear the database and try again
mongo connect-shiksha-crm --eval "db.dropDatabase()"
npm run seed
```

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore API endpoints at http://localhost:5000/health
- Check out the [Database Schema](#database-schema) section
- Deploy to production using Docker

## 🆘 Need Help?

- Check the [README.md](README.md) for detailed setup
- Review error logs in terminal
- Contact: founder@connectshiksha.com

---

Happy coding! 🎉

