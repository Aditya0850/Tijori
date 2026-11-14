import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <span className="text-white text-3xl font-bold">🏦</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Tijori</h1>
        <p className="text-xl text-gray-600 mb-8">
          Secure escrow platform for freelancers with Panchayat AI dispute resolution
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/admin/deals"
            className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Admin Dashboard
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🤝</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Escrow Protection</h3>
            <p className="text-gray-600">Funds held securely until both parties are satisfied</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚖️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Panchayat AI</h3>
            <p className="text-gray-600">Neutral AI mediator recommends fair dispute resolution</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Transparent Process</h3>
            <p className="text-gray-600">Full audit trail with event-sourced history</p>
          </div>
        </div>
      </div>
    </div>
  );
}