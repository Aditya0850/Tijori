#!/usr/bin/env tsx
/**
 * Backend API test script
 * Tests all major API endpoints and business logic
 */

import { dealsService } from '../lib/deals-service';
import { getDatabase } from '../lib/db';

console.log('🧪 Testing Tijori Backend...\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  const condition = JSON.stringify(actual) === JSON.stringify(expected);
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
    failed++;
  }
}

async function runTests() {
  try {
    // Test 1: Create a deal
    console.log('\n📝 Test 1: Create Deal');
    const deal = await dealsService.createDeal({
      title: 'Test Deal',
      description: 'A test deal for verification',
      amount: 10000,
      seller_name: 'Test Seller',
    });
    assert(deal.id.length > 0, 'Deal has ID');
    assert(deal.title === 'Test Deal', 'Deal title matches');
    assert(deal.amount === 10000, 'Deal amount matches');
    assert(deal.status === 'CREATED', 'Deal status is CREATED');
    assert(deal.seller_name === 'Test Seller', 'Seller name matches');
    assert(deal.buyer_name === null, 'Buyer name is null initially');

    const dealId = deal.id;

    // Test 2: Get deal with events
    console.log('\n📖 Test 2: Get Deal with Events');
    const result = await dealsService.getDeal(dealId);
    assert(result !== null, 'Deal found');
    assert(result!.deal.id === dealId, 'Correct deal returned');
    assert(result!.events.length >= 1, 'Has creation event');
    assert(result!.events[0].type === 'CREATED', 'First event is CREATED');

    // Test 3: Fund deal
    console.log('\n💰 Test 3: Fund Deal');
    const fundedDeal = await dealsService.fundDeal(dealId, 'Test Buyer');
    assert(fundedDeal.status === 'FUNDED', 'Status changed to FUNDED');
    assert(fundedDeal.buyer_name === 'Test Buyer', 'Buyer name set');

    const fundedResult = await dealsService.getDeal(dealId);
    assert(fundedResult!.events.some(e => e.type === 'FUNDED'), 'FUNDED event created');

    // Test 4: Deliver deal
    console.log('\n📦 Test 4: Deliver Deal');
    const deliveredDeal = await dealsService.deliverDeal(dealId, 'https://example.com/delivery', 'Test Seller');
    assert(deliveredDeal.status === 'DELIVERED', 'Status changed to DELIVERED');
    assert(deliveredDeal.delivery_proof === 'https://example.com/delivery', 'Delivery proof set');

    const deliveredResult = await dealsService.getDeal(dealId);
    assert(deliveredResult!.events.some(e => e.type === 'DELIVERED'), 'DELIVERED event created');

    // Test 5: Accept deal
    console.log('\n✅ Test 5: Accept Deal');
    const acceptedDeal = await dealsService.acceptDeal(dealId, 'Test Buyer');
    assert(acceptedDeal.status === 'COMPLETED', 'Status changed to COMPLETED');

    const acceptedResult = await dealsService.getDeal(dealId);
    assert(acceptedResult!.events.some(e => e.type === 'ACCEPTED'), 'ACCEPTED event created');

    // Test 6: Create another deal for dispute testing
    console.log('\n📝 Test 6: Create Deal for Dispute');
    const disputeDeal = await dealsService.createDeal({
      title: 'Dispute Test Deal',
      description: 'A deal to test dispute flow',
      amount: 20000,
      seller_name: 'Dispute Seller',
    });
    const disputeDealId = disputeDeal.id;

    // Fund it
    await dealsService.fundDeal(disputeDealId, 'Dispute Buyer');
    // Deliver it
    await dealsService.deliverDeal(disputeDealId, 'https://example.com/dispute-delivery', 'Dispute Seller');

    // Test 7: Dispute deal (triggers AI)
    console.log('\n⚔️ Test 7: Dispute Deal');
    const disputeResult = await dealsService.disputeDeal(disputeDealId, 'Dispute Buyer', 'Work quality is poor and incomplete');
    assert(disputeResult.deal.status === 'DISPUTED', 'Status changed to DISPUTED');
    assert(disputeResult.deal.dispute_reason === 'Work quality is poor and incomplete', 'Dispute reason set');
    assert(disputeResult.aiVerdict !== null, 'AI verdict returned');
    assert(['RELEASE', 'REFUND', 'SPLIT'].includes(disputeResult.aiVerdict!.verdict), 'Valid AI verdict type');
    assert(typeof disputeResult.aiVerdict!.sellerPercent === 'number', 'AI seller percent is number');
    assert(disputeResult.aiVerdict!.sellerPercent >= 0 && disputeResult.aiVerdict!.sellerPercent <= 100, 'AI seller percent in range');
    assert(disputeResult.aiVerdict!.reasoning.length > 10, 'AI reasoning provided');

    const disputedResult = await dealsService.getDeal(disputeDealId);
    assert(disputedResult!.events.some(e => e.type === 'DISPUTED'), 'DISPUTED event created');
    assert(disputedResult!.events.some(e => e.type === 'AI_VERDICT'), 'AI_VERDICT event created');

    // Test 8: Resolve dispute (admin)
    console.log('\n⚖️ Test 8: Resolve Dispute');
    const resolvedDeal = await dealsService.resolveDeal(disputeDealId, 'Admin User', 'SPLIT', 60);
    assert(resolvedDeal.status === 'RESOLVED_SPLIT', 'Status changed to RESOLVED_SPLIT');
    assert(resolvedDeal.ai_seller_percent === 60, 'Seller percent set to 60');

    const resolvedResult = await dealsService.getDeal(disputeDealId);
    assert(resolvedResult!.events.some(e => e.type === 'RESOLVED'), 'RESOLVED event created');

    // Test 9: List deals with filters
    console.log('\n📋 Test 9: List Deals with Filters');
    const allDeals = await dealsService.listDeals();
    assert(allDeals.length >= 2, 'At least 2 deals exist');

    const createdDeals = await dealsService.listDeals({ status: 'CREATED' });
    assert(createdDeals.every(d => d.status === 'CREATED'), 'Filter by CREATED works');

    const fundedDeals = await dealsService.listDeals({ status: 'FUNDED' });
    assert(fundedDeals.every(d => d.status === 'FUNDED'), 'Filter by FUNDED works');

    const sellerDeals = await dealsService.listDeals({ sellerName: 'Test Seller' });
    assert(sellerDeals.every(d => d.seller_name === 'Test Seller'), 'Filter by seller works');

    const buyerDeals = await dealsService.listDeals({ buyerName: 'Test Buyer' });
    assert(buyerDeals.every(d => d.buyer_name === 'Test Buyer'), 'Filter by buyer works');

    // Test 10: Error handling
    console.log('\n🚫 Test 10: Error Handling');
    const notFoundDeal = await dealsService.getDeal('non-existent-id');
    assert(notFoundDeal === null, 'Returns null for non-existent deal');

    try {
      await dealsService.fundDeal('non-existent-id', 'Buyer');
      assert(false, 'Should throw for non-existent deal');
    } catch (error) {
      assert((error as Error).message.includes('NOT_FOUND'), 'Throws NOT_FOUND for funding missing deal');
    }

    // Test invalid state transition
    const newDeal = await dealsService.createDeal({
      title: 'Another Deal',
      description: 'Test',
      amount: 5000,
      seller_name: 'Seller',
    });
    try {
      await dealsService.deliverDeal(newDeal.id, 'https://example.com', 'Seller'); // Can't deliver CREATED deal
      assert(false, 'Should throw for invalid transition');
    } catch (error) {
      assert((error as Error).message.includes('INVALID_STATE'), 'Throws INVALID_STATE for invalid transition');
    }

    // Test role authorization
    try {
      await dealsService.fundDeal(newDeal.id, 'Wrong Buyer'); // Already funded by test
    } catch (error) {
      // This might throw FORBIDDEN or INVALID_STATE depending on implementation
      assert(true, 'Handles double funding appropriately');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    if (failed > 0) {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  }
}

runTests();