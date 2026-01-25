/**
 * App Configuration
 * Central place to manage version, update date, and other app-wide settings
 */

export const APP_CONFIG = {
  name: 'ניהול גבאות',
  description: 'מערכת בית הכנסת',
  version: '1.0.0',
  lastUpdated: 'ינואר 2025',
  developer: {
    name: 'Avihai Yosipovich',
    // website: 'https://example.com', // Optional: add developer website
    // linkedin: 'https://linkedin.com/in/example', // Optional: add LinkedIn
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
