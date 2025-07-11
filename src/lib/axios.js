import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  timeout: 10000, // 10 seconds
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies for authentication
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("next-auth.session-token") ||
        localStorage.getItem("__Secure-next-auth.session-token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Log request in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`,
        config.data
      );
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `✅ API Response: ${response.status} ${response.config.url}`,
        response.data
      );
    }

    return response;
  },
  (error) => {
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      console.error(`❌ API Error ${status}:`, data);

      // Handle specific error cases
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          if (typeof window !== "undefined") {
            window.location.href = "/auth/signin";
          }
          break;
        case 403:
          // Forbidden
          console.error("Access forbidden");
          break;
        case 404:
          // Not found
          console.error("Resource not found");
          break;
        case 429:
          // Rate limited
          console.error("Rate limit exceeded");
          break;
        case 500:
          // Server error
          console.error("Internal server error");
          break;
        default:
          console.error(`Unexpected error: ${status}`);
      }

      // Return a standardized error object
      return Promise.reject({
        message: data?.message || `HTTP ${status} Error`,
        status,
        data,
        isAxiosError: true,
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error("❌ Network Error: No response received", error.request);
      return Promise.reject({
        message: "Network error - no response received",
        isNetworkError: true,
      });
    } else {
      // Something else happened
      console.error("❌ Request Setup Error:", error.message);
      return Promise.reject({
        message: error.message || "Request setup failed",
        isSetupError: true,
      });
    }
  }
);

// API helper functions
export const apiHelpers = {
  // GET request
  get: (url, config = {}) => api.get(url, config),

  // POST request
  post: (url, data = {}, config = {}) => api.post(url, data, config),

  // PUT request
  put: (url, data = {}, config = {}) => api.put(url, data, config),

  // PATCH request
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),

  // DELETE request
  delete: (url, config = {}) => api.delete(url, config),

  // Upload file
  upload: (url, file, onProgress = null) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: onProgress,
    });
  },

  // Download file
  download: (url, filename = "download") => {
    return api
      .get(url, {
        responseType: "blob",
      })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      });
  },
};

// API endpoints configuration
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    SIGNUP: "/api/auth/signup",
    SIGNIN: "/api/auth/signin",
    SIGNOUT: "/api/auth/signout",
    SESSION: "/api/auth/session",
  },

  // User endpoints
  USER: {
    PROFILE: "/api/user/profile",
    PREFERENCES: "/api/user/preferences",
    UPDATE: "/api/user/update",
  },

  // Session endpoints
  SESSION: {
    CREATE: "/api/session/create",
    JOIN: "/api/session/join",
    LEAVE: "/api/session/leave",
    STATUS: "/api/session/status",
  },

  // Audio endpoints
  AUDIO: {
    UPLOAD: "/api/audio/upload",
    PROCESS: "/api/audio/process",
    DELETE: "/api/audio/delete",
  },

  // Sync endpoints
  SYNC: {
    STATUS: "/api/sync/status",
    BROADCAST: "/api/sync/broadcast",
    RECEIVE: "/api/sync/receive",
  },
};

export default api;
