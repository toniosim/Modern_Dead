// src/config/environment.ts
export const environment = {
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
  socketUrl: process.env.SOCKET_URL || 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production',
  // Add any other environment variables here
};
