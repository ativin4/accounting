'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { OrganizationUser, InviteLink, Role } from '../../types';

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full access to everything and team management'
  },
  {
    value: 'invoice_manager',
    label: 'Invoice Manager',
    description: 'Create/edit invoices, manage customers, view ledgers'
  },
  {
    value: 'inventory_manager',
    label: 'Inventory Manager',
    description: 'Add/edit products, manage stock'
  },
  {
    value: 'sales_rep',
    label: 'Sales Representative',
    description: 'Create invoices, view own customers'
  },
  {
    value: 'viewer',
    label: 'Viewer (Accountant)',
    description: 'View all data, export reports'
  }
];

export default function TeamManagement() {
  const { data: session } = useSession();
  const [teamMembers, setTeamMembers] = useState<OrganizationUser[]>([]);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('invoice_manager');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [membersResponse, invitesResponse] = await Promise.all([
        fetch('/api/organizations/users'),
        fetch('/api/invites')
      ]);

      if (!membersResponse.ok || !invitesResponse.ok) {
        throw new Error('Failed to fetch team data');
      }

      const membersData = await membersResponse.json();
      const invitesData = await invitesResponse.json();

      setTeamMembers(membersData);
      setInviteLinks(invitesData);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async () => {
    setInviteLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate invite link');
      }

      const inviteData = await response.json();
      setInviteLinks(prev => [inviteData, ...prev]);
      setShowInviteForm(false);
    } catch (err) {
      console.error('Error generating invite link:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate invite link');
    } finally {
      setInviteLoading(false);
    }
  };

  const changeUserRole = async (userId: string, newRole: Role) => {
    try {
      const response = await fetch('/api/organizations/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change user role');
      }

      setTeamMembers(prev =>
        prev.map(member =>
          member.userId === userId ? { ...member, role: newRole } : member
        )
      );
    } catch (err) {
      console.error('Error changing user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to change user role');
    }
  };

  const copyInviteLink = async (inviteUrl: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      // Show success feedback (you could add a toast notification here)
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeColor = (role: Role) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      invoice_manager: 'bg-blue-100 text-blue-800',
      inventory_manager: 'bg-green-100 text-green-800',
      sales_rep: 'bg-orange-100 text-orange-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return colors[role];
  };

  const isInviteExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">⚠️</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchTeamData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
        <p className="mt-2 text-gray-600">Manage your organization team members and their permissions</p>
      </div>

      {/* Generate Invite Section */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite Team Members</h2>
        </div>
        <div className="p-6">
          {!showInviteForm ? (
            <button
              onClick={() => setShowInviteForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Generate Invite Link
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Role for New Team Member
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={generateInviteLink}
                  disabled={inviteLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviteLoading ? 'Generating...' : 'Generate Link'}
                </button>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Invite Links */}
      {inviteLinks.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Active Invite Links</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {inviteLinks.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(invite.role)}`}>
                        {ROLES.find(r => r.value === invite.role)?.label}
                      </span>
                      {isInviteExpired(invite.expiresAt) && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Expired</span>
                      )}
                      {invite.usedBy && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Used</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Expires: {formatDate(invite.expiresAt)}
                    </p>
                    {invite.usedBy && (
                      <p className="text-sm text-green-600">
                        Accepted by {invite.usedBy?.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => copyInviteLink(invite.inviteUrl)}
                      className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 text-sm"
                      disabled={isInviteExpired(invite.expiresAt) || !!invite.usedBy}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Team Members ({teamMembers.length})</h2>
        </div>
        <div className="p-6">
          {teamMembers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No team members yet</p>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-semibold">
                        {member.user?.name?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.user?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{member.user?.email}</p>
                      <p className="text-xs text-gray-500">
                        Joined {formatDate(member.joinedAt)}
                        {member.invitedBy && ` • Invited by ${member.invitedBy}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(member.role)}`}>
                      {ROLES.find(r => r.value === member.role)?.label}
                    </span>
                    {session?.user?.id !== member.user?.id && member.role !== 'owner' && (
                      <select
                        value={member.role}
                        onChange={(e) => changeUserRole(member.userId, e.target.value as Role)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        {ROLES.filter(r => r.value !== 'owner' || member.user?.id === session?.user?.id).map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {member.user?.id === session?.user?.id && (
                      <span className="text-sm text-gray-500">You</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}