// API Configuration
export const config = {
  // Backend API URLs
  api: {
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api',
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  },
  
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  // Backend server configuration
  server: {
    port: process.env.PORT || 4000,
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
  return `${config.api.baseUrl}${endpoint}`;
};

// Helper function to get Socket URL
export const getSocketUrl = () => {
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
