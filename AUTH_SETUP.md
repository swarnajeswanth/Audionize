# Email/Password Authentication Setup

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production
```

## Demo Account

A demo account is pre-configured:

- **Email**: admin@audionize.com
- **Password**: password

## Features

### ✅ Implemented

- Email/password authentication with NextAuth.js
- Secure password hashing with bcryptjs
- User registration and sign-in pages
- Protected routes (redirects to sign-in if not authenticated)
- Session management
- Sign-out functionality
- In-memory user storage (demo purposes)

### 🔄 Next Steps for Production

1. **Database Integration**: Replace in-memory storage with a real database (PostgreSQL, MongoDB, etc.)
2. **Email Verification**: Add email verification for new accounts
3. **Password Reset**: Implement password reset functionality
4. **Rate Limiting**: Add rate limiting for login attempts
5. **Environment Variables**: Use proper environment variables for production

## Usage

1. **Sign Up**: Visit `/auth/signup` to create a new account
2. **Sign In**: Visit `/auth/signin` to sign in with existing credentials
3. **Protected Routes**: All main app routes require authentication
4. **Sign Out**: Use the sign-out button in the navigation

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/
│   │       │   └── route.js          # NextAuth configuration
│   │       └── signup/
│   │           └── route.js          # User registration API
│   └── auth/
│       ├── signin/
│       │   └── page.js               # Sign-in page
│       └── signup/
│           └── page.js               # Sign-up page
├── utils/
│   └── users.js                      # User storage utilities
└── components/                       # Your existing components
```

## Security Notes

- Passwords are hashed using bcryptjs with salt rounds of 10
- JWT tokens are used for session management
- All authentication routes are protected
- Input validation is implemented on both client and server
