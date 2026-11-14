'use client';

import { useState } from 'react';

export type AiVerdict = {
  verdict: 'RELEASE' | 'REFUND' | 'SPLIT';
  sellerPercent: number;
  reasoning: string;
};

export type Deal = {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  seller_name: string;
  buyer_name: string | null;
  delivery_proof: string | null;
  dispute_reason: string | null;
  ai_verdict: 'RELEASE' | 'REFUND' | 'SPLIT' | null;
  ai_reasoning: string | null;
  ai_seller_percent: number | null;
};

type Props = {
  deal: Deal;
  userRole: 'ADMIN' | 'BUYER' | 'SELLER';
  onResolve: (verdict: 'RELEASE' | 'REFUND' | 'SPLIT', sellerPercent?: number) => void;
};

const VERDICT_COLORS: Record<'RELEASE' | 'REFUND' | 'SPLIT', string> = {
  RELEASE: 'bg-green-100 text-green-800 border-green-300',
  REFUND: 'bg-red-100 text-red-800 border-red-300',
  SPLIT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const VERDICT_LABELS: Record<'RELEASE' | 'REFUND' | 'SPLIT', string> = {
  RELEASE: 'Release to Seller',
  REFUND: 'Refund to Buyer',
  SPLIT: 'Split Amount',
};

export function AiVerdictCard({ deal, userRole, onResolve }: Props) {
  const [isResolving, setIsResolving] = useState(false);

  // Only show for ADMIN on DISPUTED deals
  if (userRole !== 'ADMIN' || deal.status !== 'DISPUTED') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 font-medium">⏳ Under review by Panchayat AI</p>
        <p className="text-blue-600 text-sm mt-1">The dispute is being reviewed. You will be notified once a decision is made.</p>
      </div>
    );
  }

  // No AI verdict available
  if (!deal.ai_verdict || !deal.ai_reasoning || deal.ai_seller_percent === null) {
    return (
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-500">⚠️</span>
          <h3 className="text-gray-800 font-semibold">AI Unavailable</h3>
        </div>
        <p className="text-gray-600 mb-4">Panchayat AI could not generate a recommendation. Manual review needed.</p>
        <div className="flex gap-2">
          <button
            onClick={() => onResolve('RELEASE')}
            disabled={isResolving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Release to Seller
          </button>
          <button
            onClick={() => onResolve('REFUND')}
            disabled={isResolving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Refund to Buyer
          </button>
          <button
            onClick={() => onResolve('SPLIT', 50)}
            disabled={isResolving}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
          >
            Split 50/50
          </button>
        </div>
      </div>
    );
  }

  const verdict = deal.ai_verdict;
  const sellerPercent = deal.ai_seller_percent!;
  const reasoning = deal.ai_reasoning;
  const sellerAmount = Math.round((deal.amount * sellerPercent) / 100);
  const buyerAmount = deal.amount - sellerAmount;

  const handleAccept = () => {
    onResolve(verdict, sellerPercent);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-bold">⚖️</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Panchayat AI Recommendation</h3>
            <p className="text-sm text-gray-500">Neutral AI mediator for dispute resolution</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${VERDICT_COLORS[verdict]}`}>
          {VERDICT_LABELS[verdict]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Seller Share</p>
          <p className="text-2xl font-bold text-green-600">₹{sellerAmount.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500">{sellerPercent}% of ₹{deal.amount.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Buyer Share</p>
          <p className="text-2xl font-bold text-blue-600">₹{buyerAmount.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500">{100 - sellerPercent}% of ₹{deal.amount.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900">₹{deal.amount.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500">Escrow balance</p>
        </div>
      </div>

      <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm font-medium text-purple-900 mb-1">AI Reasoning</p>
        <p className="text-purple-800">{reasoning}</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={isResolving}
          className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {isResolving ? 'Processing...' : `Accept Panchayat's Verdict (${VERDICT_LABELS[verdict]})`}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onResolve('RELEASE')}
            disabled={isResolving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
            title="Override: Release full amount to seller"
          >
            Release
          </button>
          <button
            onClick={() => onResolve('REFUND')}
            disabled={isResolving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
            title="Override: Refund full amount to buyer"
          >
            Refund
          </button>
          <button
            onClick={() => onResolve('SPLIT', 50)}
            disabled={isResolving}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm"
            title="Override: Split 50/50"
          >
            Split
          </button>
        </div>
      </div>
    </div>
  );
}