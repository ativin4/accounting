'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import RoleBasedNav from '../../../components/layout/RoleBasedNav';

interface InviteData {
  id: string;
  organization: {
    id: string;
    name: string;
  };
  role: string;
  expiresAt: string;
}

export default function InvitePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    fetchInviteData();
  }, [token]);

  const fetchInviteData = async () => {
    try {
      const response = await fetch(`/api/invites/${token}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('This invite link is invalid or has expired');
        } else {
          setError('Failed to load invite information');
        }
        return;
      }

      const data = await response.json();
      setInviteData(data);
    } catch (err) {
      console.error('Error fetching invite data:', err);
      setError('Failed to load invite information');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!session) {
      router.push(`/?callbackUrl=/invite/${token}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invite');
      }

      setSuccess(true);
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error accepting invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      owner: 'Owner',
      invoice_manager: 'Invoice Manager',
      inventory_manager: 'Inventory Manager',
      sales_rep: 'Sales Representative',
      viewer: 'Viewer (Accountant)'
    };
    return roleLabels[role as keyof typeof roleLabels] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors = {
      owner: 'bg-purple-100 text-purple-800',
      invoice_manager: 'bg-blue-100 text-blue-800',
      inventory_manager: 'bg-green-100 text-green-800',
      sales_rep: 'bg-orange-100 text-orange-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invite information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Accepted!</h1>
          <p className="text-gray-600 mb-6">
            You have successfully joined {inviteData?.organization.name}. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {session && <RoleBasedNav />}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xl">📧</span>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              You're Invited!
            </h2>
            <p className="mt-2 text-gray-600">
              You've been invited to join a team on InvoicePro
            </p>
          </div>

          {inviteData && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {inviteData.organization.name}
                  </h3>
                  <p className="text-sm text-gray-600">Organization</p>
                </div>

                <div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(inviteData.role)}`}>
                    {getRoleLabel(inviteData.role)}
                  </span>
                </div>

                <div className="text-sm text-gray-500">
                  <p>Invite expires on {formatDate(inviteData.expiresAt)}</p>
                </div>
              </div>
            </div>
          )}

          {!session ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                Please sign in to accept this invitation.
              </p>
              <Link
                href={`/?callbackUrl=/invite/${token}`}
                className="mt-3 inline-block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In to Accept
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Accept this invitation to join {inviteData?.organization.name} as a {getRoleLabel(inviteData?.role || '')}
              </p>
              <button
                onClick={acceptInvite}
                disabled={accepting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {accepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
              <Link
                href="/dashboard"
                className="block w-full text-center px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Maybe Later
              </Link>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}