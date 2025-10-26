# Network Access Setup Guide

## ✅ Configuration Complete!

Your application is now configured to be accessible from other devices on your local network.

## 📱 How to Access from Other Devices

### 1. Make sure both devices are on the same Wi-Fi network

### 2. Start your servers

**Start Backend:**
```bash
node server.js
```

**Start Frontend (in a new terminal):**
```bash
cd client
npm run dev
```

### 3. Access from other devices

**On your other device (phone, tablet, etc.), open a browser and go to:**

```
http://192.168.1.2:3000
```

**Note:** Replace `192.168.1.2` with your computer's actual IP address if it changes.

## 🔧 Finding Your IP Address (if it changes)

**On Windows:**
```bash
ipconfig | findstr "IPv4"
```

**On Mac/Linux:**
```bash
ifconfig | grep "inet "
```

## ⚙️ Changes Made

1. **Backend Server** (`server.js`):
   - Now listens on `0.0.0.0` (all network interfaces)
   - Port: `10000`

2. **Frontend Config** (`client/next.config.js`):
   - API URL set to: `http://192.168.1.2:10000/api`
   - Port: `3000`

## 🔒 Important Notes

- **Same Network Required:** Both devices must be on the same Wi-Fi network
- **Firewall:** Windows Firewall may prompt you to allow Node.js through - click "Allow"
- **IP Address:** Your IP might change when you reconnect to Wi-Fi. Run `ipconfig` again if it stops working.

## 🚨 Troubleshooting

**If you can't access from other devices:**

1. **Check Firewall:**
   - Windows Security → Firewall & network protection
   - Allow Node.js through firewall

2. **Verify IP Address:**
   - Run `ipconfig` again to get current IP
   - Update `client/next.config.js` with new IP if it changed

3. **Check Network:**
   - Ensure both devices are on same Wi-Fi
   - Try accessing from your phone's browser first

## 📊 Access URLs

- **Backend API:** http://192.168.1.2:10000/api
- **Frontend App:** http://192.168.1.2:3000
- **Local Device (localhost):** http://localhost:3000

