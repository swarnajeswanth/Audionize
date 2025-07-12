# Sync Server Setup Guide

## Current Issue

Your sync server at `https://aduionize-socket.onrender.com` is not accessible. This is causing the "Not connected to sync server yet" error.

## Solutions

### Option 1: Deploy to Render (Recommended)

1. **Create a new Render account** at https://render.com
2. **Create a new Web Service** with these settings:

   - **Name**: `audionize-sync-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Port**: `4000`

3. **Upload your server.js file** to the repository
4. **Set environment variables**:

   - `NODE_ENV`: `production`
   - `PORT`: `4000`

5. **Deploy and get your URL** (e.g., `https://your-app-name.onrender.com`)

6. **Update your Netlify environment variables**:
   - Go to your Netlify dashboard
   - Navigate to Site settings > Environment variables
   - Add: `NEXT_PUBLIC_IO_URL` = `https://your-app-name.onrender.com`

### Option 2: Local Development Server

1. **Start your local server**:

   ```bash
   cd /path/to/your/project
   node server.js
   ```

2. **The app will automatically use localhost:4000 in development mode**

### Option 3: Use a Different Hosting Service

You can deploy to:

- **Railway**: https://railway.app
- **Heroku**: https://heroku.com
- **DigitalOcean App Platform**: https://digitalocean.com
- **Vercel**: https://vercel.com (with serverless functions)

## Testing the Connection

1. **Check if your server is running**:

   - Visit your server URL directly in browser
   - Should show: "Audionize Sync Server is running!"

2. **Test from your app**:
   - Open browser developer tools (F12)
   - Go to Console tab
   - Try to create a host session
   - Look for connection logs

## Common Issues

### CORS Errors

If you see CORS errors, update your server.js:

```javascript
const io = new IOServer(server, {
  path: "/socket.io",
  cors: {
    origin: ["https://your-netlify-app.netlify.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});
```

### Server Not Starting

- Check if port 4000 is available
- Make sure all dependencies are installed
- Check server logs for errors

### Environment Variables

Make sure your Netlify app has the correct environment variable:

- `NEXT_PUBLIC_IO_URL` = your server URL

## Quick Fix for Testing

If you want to test without a server temporarily, you can:

1. **Comment out the sync service calls** in your components
2. **Use local state only** for testing the UI
3. **Deploy the server later** when ready

## Server Health Check

The app now includes a "Test Connection" button that will:

- Check if your server is accessible
- Show detailed error messages
- Attempt to reconnect if possible

## Next Steps

1. **Deploy your sync server** using one of the options above
2. **Update your environment variables** in Netlify
3. **Test the connection** using the Test Connection button
4. **Check browser console** for detailed connection logs

The enhanced error handling will now give you much better information about what's going wrong with the connection.

---

Your Render dashboard screenshot confirms that your **sync server is deploying and running** at:

```
https://aduionize-socket.onrender.com
```

You are using the **free Render plan**, which means:

- The server will **spin down after inactivity** and may take 50+ seconds to wake up on the first request.
- After waking up, it should work normally for all clients.

---

## ✅ **Your `server.js` is Correct**

Your current `server.js` (with CORS at the top) is **correct and production-ready** for Render and Netlify:

- **CORS middleware** is at the very top, before any routes or Socket.IO.
- **Socket.IO** is configured with the correct CORS origins.
- **Health endpoints** (`/`, `/healthz`, `/status`) are present for Render health checks.
- **Session and client management** is robust and matches your frontend expectations.

---

## 🚦 **What to Expect**

- **First request after inactivity** may be slow (50+ seconds) due to Render's free plan.
- After waking up, **connections should be stable**.
- If you see CORS errors, make sure you are using the public Render URL in your frontend (`NEXT_PUBLIC_IO_URL`).

---

## 🟢 **Next Steps**

1. **Wait for the deploy to finish** (watch for "Service is live" in Render logs).
2. **Test your frontend** (Netlify or local) and ensure:

   - No CORS errors in the browser console.
   - Host and clients can connect and see each other.
   - Audio sync and commands work as expected.

3. If you see any issues:
   - **Check the Render logs** for errors.
   - **Check the browser console** for CORS or connection errors.
   - Make sure your frontend is using the correct environment variable:
     ```
     NEXT_PUBLIC_IO_URL=https://aduionize-socket.onrender.com
     ```

---

## 🛠️ **Troubleshooting Tips**

- If you see `502 Bad Gateway` or timeouts, the server may still be waking up.
- If you see CORS errors, double-check the CORS middleware and allowed origins.
- If you see "Not connected to sync server yet", check the server logs for errors.

---

**You are very close!**  
If you encounter any specific errors after the deploy finishes, please share the error message or screenshot and I’ll help you resolve it immediately.

---

## **What’s Happening**

- **Host and Client both show "Disconnected"** and "0 Clients".
- **Console logs show:**
  - The Host connects to the sync server, then immediately disconnects (`io client disconnect`).
  - The Client connects, but never sees the Host as connected.
- **No CORS or network errors**—the connection to the sync server is established, but the session is not maintained.

---

## **Root Cause**

### 1. **Immediate Disconnect After Connect**

- The Host connects, then immediately disconnects.
- This is visible in the logs:
  ```
  Successfully connected to sync service
  Disconnecting from sync service
  Disconnected from sync server: io client disconnect
  ```
- The Client never sees the Host as present, so it stays "Disconnected".

### 2. **Likely Causes**

- **React effect or state logic is causing the Host to disconnect right after connecting.**
- This is often due to:
  - The `useEffect` in `useSyncService` or `HostPage` running with changing dependencies, causing a disconnect/reconnect loop.
  - The session code or user info being reset or not persisted correctly.
  - The HostPage unmounting/remounting, triggering disconnect.

---

## **What to Check and Fix**

### **A. Check `useSyncService` Hook**

- Make sure the disconnect logic in the cleanup function of `useEffect` **only runs on true unmount**, not on every render or dependency change.
- You already have logic to track previous values, but double-check that the disconnect is not being called unless the component is truly unmounting.

### **B. Check Session Code Persistence**

- Ensure the session code is **not being reset** or cleared after initial connection.
- In `HostPage`, the session code should be set once and not change unless the session is truly ending.

### **C. Check HostPage Mounting**

- Make sure the HostPage is not being unmounted/remounted due to parent state changes or navigation.

---

## **Targeted Fix**

**In your `useSyncService.js`, update the cleanup logic:**

```js
<code_block_to_apply_changes_from>
```

- **Do NOT include `defaultConfig` or any object/array/function that changes on every render in the dependency array.**
- Only include `sessionCode`, `role`, `userName`, and `dispatch`.

---

## **Quick Checklist**

- [ ] **Session code is set and does not change after initial load.**
- [ ] **`useSyncService` only disconnects on true unmount.**
- [ ] **No unnecessary dependencies in the `useEffect` that manages connection.**
- [ ] **HostPage is not being unmounted/remounted by parent state changes.**

---

## **If You Want a Quick Test**

1. **Hardcode a session code** in both Host and Client

```

```
