const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : 'https://timesheet-api-production-804c.up.railway.app';

export default API_URL;
