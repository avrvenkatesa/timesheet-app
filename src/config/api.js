// API Configuration
const getApiUrl = () => {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }
  
  // Staging (develop branch on Netlify)
  if (hostname.includes('develop--')) {
    return 'https://timesheet-api-staging-production-c93c.up.railway.app';
  }
  
  // Production
  return 'https://timesheet-api-production-804c.up.railway.app';
};

const API_URL = getApiUrl();

export default API_URL;
