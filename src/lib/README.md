# API Configuration with Axios

This directory contains the centralized API configuration for the Audionize app using Axios.

## Files

### `axios.js`

The main Axios instance configuration with:

- Base URL configuration
- Request/response interceptors
- Error handling
- Authentication token management
- Development logging
- Helper functions for common operations

### `../services/api.js`

Service layer that provides organized API methods:

- `authService` - Authentication operations
- `userService` - User profile and preferences
- `sessionService` - Session management
- `audioService` - Audio file operations
- `syncService` - Real-time synchronization
- `utilityService` - Health checks and system info

### `../hooks/useApi.js`

Custom React hook that combines API services with loading states:

- Automatic loading state management
- Error handling with toast notifications
- Success feedback
- Consistent API interface

## Usage

### Basic API Call

```javascript
import { apiHelpers, API_ENDPOINTS } from "../lib/axios";

// Simple GET request
const response = await apiHelpers.get(API_ENDPOINTS.AUTH.SESSION);

// POST request with data
const response = await apiHelpers.post(API_ENDPOINTS.AUTH.SIGNUP, {
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
});
```

### Using Service Layer

```javascript
import { authService } from "../services/api";

// Sign up user
const response = await authService.signup({
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
});
```

### Using Custom Hook (Recommended)

```javascript
import { useApi } from "../hooks/useApi";

function MyComponent() {
  const { signup, isLoading, error, success } = useApi();

  const handleSignup = async () => {
    await signup({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    });
  };

  return (
    <button onClick={handleSignup} disabled={isLoading}>
      {isLoading ? "Creating Account..." : "Sign Up"}
    </button>
  );
}
```

## Features

### Automatic Error Handling

- HTTP status code handling
- Network error detection
- Request timeout handling
- Automatic redirect on 401 errors

### Authentication

- Automatic token inclusion in requests
- Session token management
- Credential handling

### Development Features

- Request/response logging in development
- Detailed error information
- Network request tracking

### File Upload/Download

```javascript
// Upload file with progress
const response = await apiHelpers.upload(
  "/api/audio/upload",
  file,
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);

// Download file
await apiHelpers.download("/api/audio/download", "audio.mp3");
```

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Base Configuration

- Timeout: 10 seconds
- Base URL: Configurable via environment
- Credentials: Included automatically
- Content-Type: application/json

## Error Handling

The Axios instance automatically handles:

- 401 Unauthorized → Redirect to login
- 403 Forbidden → Log access denied
- 404 Not Found → Log resource not found
- 429 Rate Limited → Log rate limit exceeded
- 500 Server Error → Log internal server error
- Network errors → Log network issues

## Best Practices

1. **Use the `useApi` hook** for components that need loading states
2. **Use service layer** for reusable API operations
3. **Use `apiHelpers`** for one-off API calls
4. **Handle errors gracefully** - the interceptors provide good defaults
5. **Use TypeScript** for better type safety (when available)

## Adding New Endpoints

1. Add endpoint to `API_ENDPOINTS` in `axios.js`
2. Add method to appropriate service in `api.js`
3. Add method to `useApi` hook if needed
4. Update this documentation
