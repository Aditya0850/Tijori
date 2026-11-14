'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Deal = {
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
  created_at: string;
  updated_at: string;
};

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeals() {
      try {
        const response = await fetch('/api/deals');
        if (!response.ok) {
          throw new Error('Failed to fetch deals');
        }
        const data = await response.json();
        if (data.data?.deals) {
          setDeals(data.data.deals);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deals');
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
  }, []);

  const statusColors: Record<string, string> = {
    CREATED: 'bg-gray-100 text-gray-800',
    FUNDED: 'bg-blue-100 text-blue-800',
    DELIVERED: 'bg-yellow-100 text-yellow-800',
    DISPUTED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-green-100 text-green-800',
    RESOLVED_RELEASED: 'bg-green-100 text-green-800',
    RESOLVED_REFUNDED: 'bg-green-100 text-green-800',
    RESOLVED_SPLIT: 'bg-green-100 text-green-800',
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage all deals and disputes</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parties</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Verdict</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link href={`/admin/deals/${deal.id}`} className="text-blue-600 hover:underline font-medium">
                        {deal.title}
                      </Link>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{deal.description}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      ₹{deal.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{deal.seller_name}</p>
                      <p className="text-sm text-gray-500">{deal.buyer_name || 'No buyer'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[deal.status] || 'bg-gray-100 text-gray-800'}`}>
                        {deal.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {deal.ai_verdict ? (
                        <span className="px-2 py-1 rounded text-xs font-medium
                          {deal.ai_verdict === 'RELEASE' ? 'bg-green-100 text-green-800' :
                           deal.ai_verdict === 'REFUND' ? 'bg-red-100 text-red-800' :
                           'bg-yellow-100 text-yellow-800'}">
                          {deal.ai_verdict} ({deal.ai_seller_percent}%)
                        </span>
                      ) : deal.status === 'DISPUTED' ? (
                        <span className="text-sm text-gray-500">Pending...</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(deal.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/deals/${deal.id}`}
                        className="text-purple-600 hover:text-purple-900 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {deals.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-500">No deals found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}