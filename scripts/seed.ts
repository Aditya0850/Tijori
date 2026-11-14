#!/usr/bin/env tsx
/**
 * Additional seeding script for more demo data
 */

import { getDatabase } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('🌱 Seeding additional demo data...');

  try {
    const db = getDatabase();

    const now = new Date().toISOString();
    const additionalDeals = [
      {
        id: uuidv4(),
        title: 'Backend API Development',
        description: 'RESTful API with Node.js/Express, PostgreSQL, authentication, and documentation. 3-week timeline.',
        amount: 60000,
        status: 'FUNDED' as const,
        seller_name: 'Arjun Mehta',
        buyer_name: 'Priya Sharma',
        delivery_proof: null,
        dispute_reason: null,
        ai_verdict: null,
        ai_reasoning: null,
        ai_seller_percent: null,
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Brand Identity Package',
        description: 'Complete brand identity including logo, color palette, typography, business cards, and brand guidelines.',
        amount: 30000,
        status: 'CREATED' as const,
        seller_name: 'Meera Krishnan',
        buyer_name: null,
        delivery_proof: null,
        dispute_reason: null,
        ai_verdict: null,
        ai_reasoning: null,
        ai_seller_percent: null,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: uuidv4(),
        title: 'SEO Optimization & Content Strategy',
        description: 'Technical SEO audit, keyword research, content strategy for 6 months, and on-page optimization for 50 pages.',
        amount: 40000,
        status: 'DELIVERED' as const,
        seller_name: 'Vikram Singh',
        buyer_name: 'Anjali Mehta',
        delivery_proof: 'https://docs.google.com/document/d/seo-report',
        dispute_reason: null,
        ai_verdict: null,
        ai_reasoning: null,
        ai_seller_percent: null,
        created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: uuidv4(),
        title: 'React Native Mobile App',
        description: 'Cross-platform mobile app for iOS and Android with Expo. Features: auth, push notifications, offline sync.',
        amount: 120000,
        status: 'DISPUTED' as const,
        seller_name: 'Rohit Verma',
        buyer_name: 'Kavya Nair',
        delivery_proof: 'https://expo.dev/@rohit/app',
        dispute_reason: 'App crashes on iOS 17, missing offline sync feature, push notifications not working',
        ai_verdict: 'SPLIT' as const,
        ai_reasoning: 'Core app functionality delivered but critical features (offline sync, iOS 17 compatibility) missing. Push notifications partially working. Recommend 70% to seller for substantial work completed.',
        ai_seller_percent: 70,
        created_at: new Date(Date.now() - 86400000 * 21).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Data Visualization Dashboard',
        description: 'Interactive dashboard with D3.js/Recharts showing real-time metrics, filters, and export capabilities.',
        amount: 55000,
        status: 'COMPLETED' as const,
        seller_name: 'Deepak Joshi',
        buyer_name: 'Sneha Reddy',
        delivery_proof: 'https://github.com/deepak/dashboard',
        dispute_reason: null,
        ai_verdict: null,
        ai_reasoning: null,
        ai_seller_percent: null,
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 15).toISOString(),
      },
    ];

    for (const deal of additionalDeals) {
      await db.createDeal(deal);

      // Add creation event
      await db.createEvent({
        deal_id: deal.id,
        type: 'CREATED',
        message: `Deal created by ${deal.seller_name}`,
        actor: deal.seller_name,
      });

      if (deal.buyer_name) {
        await db.createEvent({
          deal_id: deal.id,
          type: 'FUNDED',
          message: `Funded by ${deal.buyer_name} for ₹${deal.amount}`,
          actor: deal.buyer_name,
        });
      }

      if (deal.status === 'DELIVERED' || deal.status === 'COMPLETED' || deal.status === 'DISPUTED') {
        await db.createEvent({
          deal_id: deal.id,
          type: 'DELIVERED',
          message: `Work delivered: ${deal.delivery_proof}`,
          actor: deal.seller_name,
        });
      }

      if (deal.status === 'COMPLETED') {
        await db.createEvent({
          deal_id: deal.id,
          type: 'ACCEPTED',
          message: `Work accepted by ${deal.buyer_name}`,
          actor: deal.buyer_name!,
        });
      }

      if (deal.status === 'DISPUTED') {
        await db.createEvent({
          deal_id: deal.id,
          type: 'DISPUTED',
          message: `Disputed by ${deal.buyer_name}: ${deal.dispute_reason}`,
          actor: deal.buyer_name!,
        });
        if (deal.ai_verdict) {
          await db.createEvent({
            deal_id: deal.id,
            type: 'AI_VERDICT',
            message: `Panchayat AI recommends ${deal.ai_verdict} (${deal.ai_seller_percent}% to seller): ${deal.ai_reasoning}`,
            actor: 'Panchayat AI',
          });
        }
      }
    }

    console.log(`✅ Seeded ${additionalDeals.length} additional deals!`);

    const allDeals = await db.getDeals();
    console.log(`\n📋 Total deals in database: ${allDeals.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();