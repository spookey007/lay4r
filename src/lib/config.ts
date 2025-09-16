// API Configuration
export const config = {
  // Backend API URLs
  api: {
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api',
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // CORS configuration
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true); // allow non-browser requests (curl, Postman)

      try {
        const hostname = new URL(origin).hostname;

        // allow localhost:3000 for dev OR any subdomain of lay4r.io
        if (
          hostname === "localhost" ||
          hostname.endsWith(".lay4r.io") ||
          hostname === "lay4r.io"
        ) {
          return callback(null, true);
        }
      } catch (err) {
        return callback(err as Error);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  },
  
  // Backend server configuration
  server: {
    port: process.env.PORT || 3001,
  },
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/layer4',
  },
  
  // Email configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  },
};

// Helper function to get API URL
export const getApiUrl = (endpoint: string = '') => {
  // Always use the configured API URL
  return `${config.api.baseUrl}${endpoint}`;
};

// Helper function to get Socket URL
export const getSocketUrl = () => {
  // Always use the configured socket URL
  return config.api.socketUrl;
};

// Helper function to check if running in production
export const isProduction = () => {
  return config.isProduction;
};

// Helper function to check if running in development
export const isDevelopment = () => {
  return config.isDevelopment;
};
