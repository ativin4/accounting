'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RoleBasedNav from '../../components/layout/RoleBasedNav';

interface DashboardMetrics {
  today: {
    revenue: number;
    invoiceCount: number;
  };
  thisMonth: {
    revenue: number;
    invoiceCount: number;
    revenueGrowth: number;
    invoiceGrowth: number;
  };
  topCustomers: Array<{
    id: string;
    name: string;
    gstin?: string;
    invoiceCount: number;
    totalRevenue: number;
  }>;
  categorySales: Array<{
    category: string;
    invoiceCount: number;
    totalRevenue: number;
  }>;
  recentInvoices: Array<{
    id: string;
    date: string;
    total: number;
    gst: boolean;
    paymentType: string;
    customerName: string;
    itemCount: number;
  }>;
  outstandingBalance: {
    total: number;
    customerCount: number;
  };
  lowStockCount: number;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchMetrics();
    }
  }, [status, router]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/metrics');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return '↑';
    if (growth < 0) return '↓';
    return '→';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchMetrics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="mt-2 text-gray-600">
            Here's what's happening with your business today
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Link
            href="/invoice"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Invoice
          </Link>
          <Link
            href="/customers"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Add Customer
          </Link>
          {session?.user?.role === 'owner' && (
            <Link
              href="/team"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Manage Team
            </Link>
          )}
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Today's Sales</h3>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(metrics.today.revenue)}
            </p>
            <p className="text-gray-600 mt-1">
              {metrics.today.invoiceCount} invoices
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">This Month</h3>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(metrics.thisMonth.revenue)}
            </p>
            <div className="flex items-center mt-1">
              <span className={`text-sm ${getGrowthColor(metrics.thisMonth.revenueGrowth)}`}>
                {getGrowthIcon(metrics.thisMonth.revenueGrowth)} {Math.abs(metrics.thisMonth.revenueGrowth)}%
              </span>
              <span className="text-gray-600 text-sm ml-2">
                {metrics.thisMonth.invoiceCount} invoices
              </span>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Outstanding Balance</h3>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(metrics.outstandingBalance.total)}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {metrics.outstandingBalance.customerCount} customers
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Low Stock Alert</h3>
            <p className="text-2xl font-bold text-red-600">
              {metrics.lowStockCount}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Products need restocking
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Customer</h3>
            <p className="text-lg font-bold text-purple-600 truncate">
              {metrics.topCustomers[0]?.name || 'No customers yet'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {metrics.topCustomers[0] ? formatCurrency(metrics.topCustomers[0].totalRevenue) : 'No sales yet'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Invoices */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            </div>
            <div className="p-6">
              {metrics.recentInvoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No invoices yet</p>
              ) : (
                <div className="space-y-4">
                  {metrics.recentInvoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{invoice.customerName}</p>
                          <p className="text-sm text-gray-600">{formatDate(invoice.date)}</p>
                          <p className="text-sm text-gray-500">
                            {invoice.itemCount} items • {invoice.paymentType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(invoice.total)}
                          </p>
                          {invoice.gst && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              GST
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
            </div>
            <div className="p-6">
              {metrics.topCustomers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No customers yet</p>
              ) : (
                <div className="space-y-4">
                  {metrics.topCustomers.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-semibold text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-600">
                            {customer.invoiceCount} invoices
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(customer.totalRevenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Sales */}
        {metrics.categorySales.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sales by Category</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {metrics.categorySales.map((category) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-900">{category.category}</span>
                        <span className="text-gray-900">{formatCurrency(category.totalRevenue)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(category.totalRevenue / Math.max(...metrics.categorySales.map(c => c.totalRevenue))) * 100}%`
                          }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {category.invoiceCount} invoices
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}