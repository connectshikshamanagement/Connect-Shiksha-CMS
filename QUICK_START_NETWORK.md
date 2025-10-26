# 🚀 Quick Start: Access From Other Devices

## ✅ Configuration Complete!

Both **Backend** and **Frontend** are now configured for network access.

## 🏃 Start Your Application

### Terminal 1: Backend
```powershell
node server.js
```

### Terminal 2: Frontend
```powershell
cd client
npm run dev
```

## 📱 Access from Other Devices

Once both servers are running, access your application from any device on the same Wi-Fi:

```
http://192.168.1.2:3000
```

## 🎯 What Was Changed

### Backend (`server.js`)
- ✅ Now listens on `0.0.0.0` (all network interfaces)
- ✅ Port: `10000`

### Frontend (`client/package.json`)
- ✅ Added `-H 0.0.0.0` flag to dev and start scripts
- ✅ Port: `3000`
- ✅ API URL: `http://192.168.1.2:10000/api`

## 📱 Test on Your Phone

1. Make sure your phone is on the **same Wi-Fi network**
2. Open browser on phone
3. Go to: `http://192.168.1.2:3000`
4. Login and test!

## 💡 Tips

- **Same Network:** Both devices must be on the same Wi-Fi
- **Firewall:** Windows may prompt - click "Allow"
- **IP Changed?** Run `ipconfig | findstr "IPv4"` to get new IP, then update `client/next.config.js` line 6

## 🛠️ Troubleshooting

**Can't access?**
1. Check Windows Firewall allows Node.js
2. Verify both devices on same Wi-Fi
3. Try `ping 192.168.1.2` from phone to test connectivity

