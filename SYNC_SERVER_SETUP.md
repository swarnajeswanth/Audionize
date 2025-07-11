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
