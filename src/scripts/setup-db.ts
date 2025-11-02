#!/usr/bin/env tsx

import { setupDatabaseSchema } from '../lib/schema-setup';

async function main() {
  console.log('Setting up database schema...');

  try {
    await setupDatabaseSchema();
    console.log('✅ Database schema setup completed successfully!');
  } catch (error) {
    console.error('❌ Database schema setup failed:', error);
    process.exit(1);
  }
}

main();