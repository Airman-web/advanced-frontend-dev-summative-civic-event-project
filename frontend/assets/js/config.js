/**
 * Runtime configuration for the CivicEvents frontend.
 * Point `apiBaseUrl` at the running backend (no trailing slash, no `/api`).
 */
window.CE_CONFIG = Object.freeze({
  apiBaseUrl: 'http://localhost:4000',
  appName: 'CivicEvents',
  supportEmail: 'support@civicevents.local',
  pageSize: 9,
});
