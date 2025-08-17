// src/config/api.js
const getApiUrl = () => {
  // Check hostname for environment detection
  const hostname = window.location.hostname;

  // Replit development environment
  if (hostname.includes('replit.dev')) {
    return '/api';  // Uses proxy to backend on port 5000
  }

  // Production - Netlify main branch
  if (hostname === 'timesheet-app-frontend.netlify.app') {
    return 'https://timesheet-api-production-804c.up.railway.app/api';
  }

  // Staging - Netlify develop branch  
  if (hostname.includes('develop--') && hostname.includes('netlify.app')) {
    return 'https://timesheet-api-staging-production-c93c.up.railway.app/api';
  }

  // Any other Netlify preview/branch (fallback to staging)
  if (hostname.includes('netlify.app')) {
    return 'https://timesheet-api-staging-production-c93c.up.railway.app/api';
  }

  // Local development (localhost)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }

  // Fallback - if we can't determine environment, use relative path
  console.warn('Unknown environment, falling back to relative API path');
  return '/api';
};

const API_URL = getApiUrl();

// Log the detected environment (helpful for debugging)
console.log('API Configuration:', {
  hostname: window.location.hostname,
  apiUrl: API_URL,
  environment: window.location.hostname.includes('replit.dev') ? 'replit' :
               window.location.hostname.includes('develop--') ? 'staging' :
               window.location.hostname.includes('netlify.app') ? 'production' :
               window.location.hostname === 'localhost' ? 'local' : 'unknown'
});

export default API_URL;