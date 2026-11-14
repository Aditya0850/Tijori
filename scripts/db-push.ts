#!/usr/bin/env tsx
/**
 * Database initialization script
 * Creates the database schema and seeds demo data
 */

import { getDatabase } from '../lib/db';

async function main() {
  console.log('🔧 Initializing Tijori database...');

  try {
    const db = getDatabase();

    // Reset and seed database
    db.resetDatabase();

    console.log('✅ Database initialized successfully!');
    console.log('📊 Demo data seeded with 5 sample deals');

    // Verify by listing deals
    const deals = await db.getDeals();
    console.log(`\n📋 Current deals (${deals.length}):`);
    deals.forEach((deal, index) => {
      console.log(`  ${index + 1}. ${deal.title} - ₹${deal.amount.toLocaleString()} (${deal.status})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

main();