'use client';

import { useState, useEffect } from 'react';
import { AiVerdictCard, type Deal } from '@/components/AiVerdictCard';

export default function AdminDealPage({ params }: { params: Promise<{ id: string }> }) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'ADMIN' | 'BUYER' | 'SELLER'>('ADMIN');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    async function fetchDeal() {
      try {
        const resolvedParams = await params;
        const response = await fetch(`/api/deals/${resolvedParams.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch deal');
        }
        const data = await response.json();
        if (data.data) {
          setDeal(data.data);
        } else {
          throw new Error('Deal not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deal');
      } finally {
        setLoading(false);
      }
    }
    fetchDeal();
  }, [params]);

  const handleResolve = async (verdict: 'RELEASE' | 'REFUND' | 'SPLIT', sellerPercent?: number) => {
    if (!deal) return;
    setResolving(true);
    try {
      const resolvedParams = await params;
      const response = await fetch(`/api/deals/${resolvedParams.id}/actions/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_name: 'Admin User',
          verdict,
          seller_percent: sellerPercent,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to resolve dispute');
      }
      // Refresh deal data
      const refreshed = await fetch(`/api/deals/${resolvedParams.id}`);
      const refreshedData = await refreshed.json();
      if (refreshedData.data) {
        setDeal(refreshedData.data);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error || 'Deal not found'}</p>
        </div>
      </div>
    );
  }

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Deal Details (Admin)</h1>
          <p className="text-gray-600 mt-1">Deal ID: {deal.id.slice(0, 8)}...</p>
        </div>

        {/* Deal Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{deal.title}</h2>
              <p className="text-gray-600 mt-1">{deal.description}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[deal.status] || 'bg-gray-100 text-gray-800'}`}>
              {deal.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="text-2xl font-bold text-gray-900">₹{deal.amount.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Seller</p>
              <p className="font-medium text-gray-900">{deal.seller_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Buyer</p>
              <p className="font-medium text-gray-900">{deal.buyer_name || 'Not funded yet'}</p>
            </div>
          </div>

          {deal.delivery_proof && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Delivery Proof</p>
              <a href={deal.delivery_proof} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                {deal.delivery_proof}
              </a>
            </div>
          )}

          {deal.dispute_reason && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-1">Dispute Reason</p>
              <p className="text-red-700">{deal.dispute_reason}</p>
            </div>
          )}
        </div>

        {/* AI Verdict Card */}
        <AiVerdictCard deal={deal} userRole={userRole} onResolve={handleResolve} />

        {/* Events Timeline */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
          <div className="space-y-4">
            {[
              { type: 'CREATED', label: 'Deal Created', actor: deal.seller_name, date: deal.created_at },
              { type: 'FUNDED', label: 'Funded by Buyer', actor: deal.buyer_name || '', date: deal.updated_at },
              { type: 'DELIVERED', label: 'Work Delivered', actor: deal.seller_name, date: deal.updated_at },
              deal.status === 'DISPUTED' && { type: 'DISPUTED', label: 'Disputed', actor: deal.buyer_name || '', date: deal.updated_at },
              deal.ai_verdict && { type: 'AI_VERDICT', label: 'AI Verdict', actor: 'Panchayat AI', date: deal.updated_at },
              ['RESOLVED_RELEASED', 'RESOLVED_REFUNDED', 'RESOLVED_SPLIT'].includes(deal.status) && { type: 'RESOLVED', label: 'Resolved', actor: 'Admin', date: deal.updated_at },
              deal.status === 'COMPLETED' && { type: 'ACCEPTED', label: 'Accepted', actor: deal.buyer_name || '', date: deal.updated_at },
            ]
              .filter(Boolean)
              .map((event, index) => (
                <div key={event!.type} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-white shadow-sm"></div>
                    {index < 6 && <div className="w-0.5 h-full bg-gray-200 mt-1"></div>}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{event!.label}</p>
                    <p className="text-sm text-gray-500">By {event!.actor} • {formatDate(event!.date)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}