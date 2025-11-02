'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import RoleBasedNav from '../../components/layout/RoleBasedNav';
import InvoiceForm from '../../components/invoice/InvoiceForm';

export default function InvoicePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      // Check if user has permission to create invoices
      const userRole = session?.user?.role;
      if (!['owner', 'invoice_manager', 'sales_rep'].includes(userRole || '')) {
        router.push('/dashboard');
        return;
      }
    }
  }, [status, session, router]);

  const handleInvoiceCreated = (invoice: any) => {
    setCreatedInvoice(invoice);
    setShowSuccess(true);
  };

  const handleNewInvoice = () => {
    setShowSuccess(false);
    setCreatedInvoice(null);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showSuccess && createdInvoice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <RoleBasedNav />
        <div className="py-8">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-green-600 text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice Created!</h1>
              <p className="text-gray-600 mb-6">
                Invoice #{createdInvoice.invoice.id.slice(0, 8).toUpperCase()} has been created successfully.
              </p>
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Invoice Details</h3>
                <p className="text-gray-600">Total Amount: <span className="font-semibold">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(createdInvoice.invoice.total)}
                </span></p>
                <p className="text-gray-600">Items: {createdInvoice.items.length}</p>
                <p className="text-gray-600">Date: {new Date(createdInvoice.invoice.date).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={handleNewInvoice}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Another Invoice
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleBasedNav />
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
            <p className="mt-2 text-gray-600">
              Fill in the details below to create a new invoice
            </p>
          </div>
          <InvoiceForm onSuccess={handleInvoiceCreated} />
        </div>
      </div>
    </div>
  );
}
