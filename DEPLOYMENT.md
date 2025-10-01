# Deployment Guide - Connect Shiksha CRM

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

Deploy to any cloud platform that supports Docker:

#### Deploy to AWS ECS/EC2

1. **Build and push Docker images**
```bash
# Build backend
docker build -t connect-shiksha-backend .

# Tag and push to AWS ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.ap-south-1.amazonaws.com
docker tag connect-shiksha-backend:latest your-account.dkr.ecr.ap-south-1.amazonaws.com/connect-shiksha-backend:latest
docker push your-account.dkr.ecr.ap-south-1.amazonaws.com/connect-shiksha-backend:latest

# Build and push frontend
cd client
docker build -t connect-shiksha-frontend .
docker tag connect-shiksha-frontend:latest your-account.dkr.ecr.ap-south-1.amazonaws.com/connect-shiksha-frontend:latest
docker push your-account.dkr.ecr.ap-south-1.amazonaws.com/connect-shiksha-frontend:latest
```

2. **Setup MongoDB Atlas**
- Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Create cluster
- Get connection string
- Update environment variables

3. **Deploy using docker-compose on EC2**
```bash
# SSH into EC2 instance
ssh -i key.pem ubuntu@your-ec2-ip

# Install Docker and Docker Compose
sudo apt update
sudo apt install docker.io docker-compose -y

# Clone repository
git clone your-repo-url
cd connect-shiksha-crm

# Create .env file
nano .env
# Add production environment variables

# Start services
sudo docker-compose up -d

# Seed database
sudo docker exec -it connect-shiksha-backend npm run seed
```

#### Deploy to Render

1. **Backend Deployment**
- Go to [render.com](https://render.com)
- New → Web Service
- Connect GitHub repository
- Settings:
  - Build Command: `npm install`
  - Start Command: `node server.js`
  - Environment Variables: Add all from `.env`

2. **Frontend Deployment**
- New → Static Site
- Connect GitHub repository
- Settings:
  - Build Command: `cd client && npm install && npm run build`
  - Publish Directory: `client/.next`

3. **MongoDB**
- Use Render's managed MongoDB or MongoDB Atlas
- Update `MONGODB_URI` in backend environment

### Option 2: Platform-Specific Deployments

#### Backend to Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create connect-shiksha-api

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set AWS_ACCESS_KEY_ID=your_key
heroku config:set AWS_SECRET_ACCESS_KEY=your_secret

# Deploy
git push heroku main

# Seed database
heroku run npm run seed
```

#### Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to client folder
cd client

# Deploy
vercel

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://your-backend-url.com/api

# Deploy production
vercel --prod
```

#### Frontend to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Navigate to client folder
cd client

# Build
npm run build

# Deploy
netlify deploy --prod --dir=.next

# Set environment variable in Netlify UI
# NEXT_PUBLIC_API_URL = https://your-backend-url.com/api
```

### Option 3: Manual VPS Deployment

#### Setup on Ubuntu Server

1. **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

2. **Deploy Backend**
```bash
# Clone repository
cd /var/www
git clone your-repo-url connect-shiksha
cd connect-shiksha

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add production environment variables

# Start with PM2
pm2 start server.js --name connect-shiksha-api
pm2 save
pm2 startup
```

3. **Deploy Frontend**
```bash
cd /var/www/connect-shiksha/client
npm install
npm run build

# Start with PM2
pm2 start npm --name connect-shiksha-web -- start
pm2 save
```

4. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/connect-shiksha
```

Add this configuration:
```nginx
# Backend API
server {
    listen 80;
    server_name api.connectshiksha.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name connectshiksha.com www.connectshiksha.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/connect-shiksha /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

5. **Setup SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d connectshiksha.com -d www.connectshiksha.com
sudo certbot --nginx -d api.connectshiksha.com
```

### Mobile App Deployment

#### Android

1. **Build APK**
```bash
cd flutter_app
flutter build apk --release
```

2. **Build App Bundle for Play Store**
```bash
flutter build appbundle --release
```

3. **Upload to Google Play Console**
- Go to [play.google.com/console](https://play.google.com/console)
- Create new app
- Upload `build/app/outputs/bundle/release/app-release.aab`
- Fill app details and submit for review

#### iOS

1. **Build iOS App**
```bash
cd flutter_app
flutter build ios --release
```

2. **Archive and Upload**
- Open `ios/Runner.xcworkspace` in Xcode
- Product → Archive
- Upload to App Store Connect
- Submit for review

## 🔒 Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong MongoDB credentials
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Enable rate limiting
- [ ] Sanitize user inputs
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB encryption at rest
- [ ] Setup AWS S3 bucket policies
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Regular security updates

## 📊 Monitoring & Maintenance

### Setup Monitoring

1. **Application Monitoring**
```bash
# Install monitoring agent
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

2. **Error Tracking**
- Setup Sentry: [sentry.io](https://sentry.io)
- Add to backend and frontend
- Track errors and performance

3. **Uptime Monitoring**
- Use UptimeRobot or Pingdom
- Monitor API endpoints
- Setup alerts

4. **Database Monitoring**
- MongoDB Atlas built-in monitoring
- Setup alerts for disk space
- Monitor query performance

### Backup Strategy

1. **MongoDB Backups**
```bash
# Automated daily backup
crontab -e

# Add this line for daily 2 AM backup
0 2 * * * mongodump --uri="mongodb://localhost:27017/connect-shiksha-crm" --out=/backups/$(date +\%Y-\%m-\%d)
```

2. **S3 Backups**
- Enable S3 versioning
- Configure lifecycle rules
- Cross-region replication

### Update Strategy

1. **Zero Downtime Deployment**
```bash
# Backend update
pm2 reload connect-shiksha-api

# Frontend update
cd client && git pull && npm run build
pm2 reload connect-shiksha-web
```

2. **Database Migrations**
- Test migrations in staging
- Backup before migration
- Run during low traffic
- Have rollback plan

## 🌍 Environment Variables

### Production Environment (.env)

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/connect-shiksha-crm
JWT_SECRET=super_secret_production_key_min_32_chars
JWT_EXPIRE=7d

AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-south-1
AWS_S3_BUCKET=connect-shiksha-prod-files

CLIENT_URL=https://connectshiksha.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@connectshiksha.com
SMTP_PASS=app_specific_password
```

### Frontend Environment (.env.production)

```env
NEXT_PUBLIC_API_URL=https://api.connectshiksha.com/api
```

## 📈 Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**
- Use AWS ELB or Nginx
- Distribute traffic across instances
- Health checks

2. **MongoDB Replica Set**
- Setup replica set for high availability
- Read replicas for scaling reads
- Automatic failover

3. **Redis for Caching**
```bash
# Install Redis
sudo apt install redis-server

# Configure in backend
npm install redis
# Use for session storage and caching
```

### Performance Optimization

1. **Backend**
- Enable gzip compression
- Use MongoDB indexes
- Implement query pagination
- Cache frequent queries
- Use CDN for static assets

2. **Frontend**
- Enable Next.js ISR
- Optimize images
- Code splitting
- Lazy loading
- CDN for assets

## 🆘 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGODB_URI

# Test connection
mongo "mongodb://localhost:27017/connect-shiksha-crm"
```

**PM2 App Not Starting**
```bash
# Check logs
pm2 logs connect-shiksha-api

# Restart app
pm2 restart connect-shiksha-api

# Check status
pm2 status
```

**High Memory Usage**
```bash
# Check memory
free -h

# Restart services
pm2 restart all

# Clear logs
pm2 flush
```

## 📞 Support

For deployment support, contact: founder@connectshiksha.com

---

**Good luck with your deployment! 🚀**

