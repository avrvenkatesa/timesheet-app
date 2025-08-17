// API Configuration
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://timesheet-api-production-804c.up.railway.app'
  : process.env.NODE_ENV === 'development'
  ? 'http://localhost:4000'  // Local development
  : 'https://timesheet-api-staging-production-c93c.up.railway.app'; // Staging

export default API_URL;
