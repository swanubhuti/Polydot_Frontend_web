import { defineConfig } from "cypress";
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      config.baseUrl = process.env.E2E_BASE_URL || null;

      config.env.adminUsername = process.env.E2E_ADMIN_USERNAME || null;
      config.env.adminPassword = process.env.E2E_ADMIN_PASSWORD || null;

      config.env.businessPrefix = process.env.E2E_BUSINESS_PREFIX || null;
      config.env.userPassword = process.env.E2E_USER_PASSWORD || null;

      config.env.userEasyDairyId = process.env.E2E_USER_EASYDAIRYID || null;
      config.env.userHerdId = process.env.E2E_USER_HERDID || null;
      config.env.userCustomGroups = process.env.E2E_USER_CUSTOMGROUPS || null;

      return config
    },
  },
});