/**
 * App Configuration
 * Central place to manage version, update date, and other app-wide settings
 */

export const APP_CONFIG = {
  name: 'דיגון',
  description: 'מערכת הדייג של ישראל',
  version: '1.1.45',
  lastUpdated: 'פברואר 2026',
  developer: {
    name: 'Avihai Yosipovich',
    // website: 'https://example.com', // Optional: add developer website
    // linkedin: 'https://linkedin.com/in/example', // Optional: add LinkedIn
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
