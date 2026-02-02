/**
 * PCBancard RBAC - User Permissions Admin Page
 * 
 * Admin/Manager interface to:
 * - View all users and their current permissions
 * - Change user roles (admin only)
 * - Change agent stages (manager+)
 * - Add/remove feature overrides
 * - Apply presets
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Shield,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Zap,
  Search,
  Filter,
  RefreshCw,
  History,
  Save,
  AlertTriangle
} from 'lucide-react';
import {
  FEATURES,
  PERMISSION_PRESETS,
  UserRole,
  AgentStage,
  FeatureDefinition,
  getFeaturesByStageUnlock
} from '../../shared/permissions';
import { usePermissions, RequireRole } from '../contexts/PermissionContext';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface UserWithPermissions {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  agentStage: AgentStage;
  overrides: Record<string, boolean>;
  updatedAt: string;
  setByName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function UserPermissionsAdmin() {
  const { role: currentUserRole } = usePermissions();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStage, setFilterStage] = useState<AgentStage | 'all'>('all');

  // Fetch users
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['permissions', 'users'],
    queryFn: async () => {
      const res = await fetch('/api/permissions/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });

  const users: UserWithPermissions[] = usersData?.users || [];

  // Filter users
  const filteredUsers = users.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!user.name?.toLowerCase().includes(query) && 
          !user.email?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (filterStage !== 'all' && user.agentStage !== filterStage) return false;
    return true;
  });

  // Group by role
  const groupedUsers = {
    admin: filteredUsers.filter(u => u.role === 'admin'),
    manager: filteredUsers.filter(u => u.role === 'manager'),
    agent: filteredUsers.filter(u => u.role === 'agent')
  };

  return (
    <RequireRole role="manager" fallback={<NoAccessMessage />}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="w-7 h-7 text-blue-600" />
              User Permissions
            </h1>
            <p className="text-gray-500 mt-1">
              Manage user roles, agent stages, and feature access
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Users" value={users.length} color="blue" />
          <StatCard 
            label="Trainees" 
            value={users.filter(u => u.role === 'agent' && u.agentStage === 'trainee').length} 
            color="amber"
          />
          <StatCard 
            label="Active Agents" 
            value={users.filter(u => u.role === 'agent' && u.agentStage === 'active').length} 
            color="green"
          />
          <StatCard 
            label="Senior Agents" 
            value={users.filter(u => u.role === 'agent' && u.agentStage === 'senior').length} 
            color="purple"
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            
            {/* Role filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="manager">Managers</option>
              <option value="agent">Agents</option>
            </select>
            
            {/* Stage filter */}
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value as AgentStage | 'all')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="all">All Stages</option>
              <option value="trainee">Trainee</option>
              <option value="active">Active</option>
              <option value="senior">Senior</option>
            </select>
          </div>
        </div>

        {/* Main content */}
        <div className="flex gap-6">
          {/* User list */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Admins */}
                {groupedUsers.admin.length > 0 && (
                  <UserGroup 
                    title="Admins" 
                    users={groupedUsers.admin} 
                    selectedUser={selectedUser}
                    onSelectUser={setSelectedUser}
                  />
                )}
                
                {/* Managers */}
                {groupedUsers.manager.length > 0 && (
                  <UserGroup 
                    title="Managers" 
                    users={groupedUsers.manager}
                    selectedUser={selectedUser}
                    onSelectUser={setSelectedUser}
                  />
                )}
                
                {/* Agents by stage */}
                {groupedUsers.agent.length > 0 && (
                  <UserGroup 
                    title="Agents" 
                    users={groupedUsers.agent}
                    selectedUser={selectedUser}
                    onSelectUser={setSelectedUser}
                    showStage
                  />
                )}
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No users match your filters
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User detail panel */}
          {selectedUser && (
            <UserDetailPanel 
              user={selectedUser} 
              onClose={() => setSelectedUser(null)}
              currentUserRole={currentUserRole}
              onUpdate={() => {
                refetch();
                // Refresh selected user
                const updated = users.find(u => u.id === selectedUser.id);
                if (updated) setSelectedUser(updated);
              }}
            />
          )}
        </div>
      </div>
    </RequireRole>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color]?.split(' ').slice(1).join(' ')}`}>
        {value}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER GROUP
// ═══════════════════════════════════════════════════════════════════════════════

interface UserGroupProps {
  title: string;
  users: UserWithPermissions[];
  selectedUser: UserWithPermissions | null;
  onSelectUser: (user: UserWithPermissions) => void;
  showStage?: boolean;
}

function UserGroup({ title, users, selectedUser, onSelectUser, showStage }: UserGroupProps) {
  const [expanded, setExpanded] = useState(true);
  
  const stageBadgeColors: Record<AgentStage, string> = {
    trainee: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    senior: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <span className="font-semibold">{title}</span>
          <span className="text-sm text-gray-500">({users.length})</span>
        </div>
      </button>
      
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user)}
              className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                         ${selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {showStage && user.agentStage && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageBadgeColors[user.agentStage]}`}>
                    {user.agentStage}
                  </span>
                )}
                {Object.keys(user.overrides || {}).length > 0 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                    {Object.keys(user.overrides).length} overrides
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════════════

interface UserDetailPanelProps {
  user: UserWithPermissions;
  onClose: () => void;
  currentUserRole: UserRole | null;
  onUpdate: () => void;
}

function UserDetailPanel({ user, onClose, currentUserRole, onUpdate }: UserDetailPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'features' | 'presets'>('settings');
  
  const isAdmin = currentUserRole === 'admin';
  
  // Stage mutation
  const stageMutation = useMutation({
    mutationFn: async (stage: AgentStage) => {
      const res = await fetch(`/api/permissions/users/${user.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage })
      });
      if (!res.ok) throw new Error('Failed to update stage');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      onUpdate();
    }
  });
  
  // Role mutation (admin only)
  const roleMutation = useMutation({
    mutationFn: async (role: UserRole) => {
      const res = await fetch(`/api/permissions/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      onUpdate();
    }
  });
  
  // Override mutation
  const overrideMutation = useMutation({
    mutationFn: async ({ featureId, enabled }: { featureId: string; enabled: boolean }) => {
      const res = await fetch(`/api/permissions/users/${user.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId, enabled })
      });
      if (!res.ok) throw new Error('Failed to update override');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      onUpdate();
    }
  });
  
  // Preset mutation
  const presetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const res = await fetch(`/api/permissions/users/${user.id}/preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId })
      });
      if (!res.ok) throw new Error('Failed to apply preset');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      onUpdate();
    }
  });
  
  const stageFeatures = getFeaturesByStageUnlock();
  
  return (
    <div className="w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['settings', 'features', 'presets'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors
                       ${activeTab === tab 
                         ? 'text-blue-600 border-b-2 border-blue-600' 
                         : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-4 max-h-[60vh] overflow-auto">
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Role (admin only) */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <div className="flex gap-2">
                  {(['agent', 'manager', 'admin'] as UserRole[]).map(role => (
                    <button
                      key={role}
                      onClick={() => roleMutation.mutate(role)}
                      disabled={roleMutation.isPending}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                 ${user.role === role
                                   ? 'bg-blue-600 text-white'
                                   : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Stage (for agents) */}
            {user.role === 'agent' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agent Stage
                </label>
                <div className="flex gap-2">
                  {(['trainee', 'active', 'senior'] as AgentStage[]).map(stage => (
                    <button
                      key={stage}
                      onClick={() => stageMutation.mutate(stage)}
                      disabled={stageMutation.isPending}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                 ${user.agentStage === stage
                                   ? 'bg-blue-600 text-white'
                                   : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}
                    >
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </button>
                  ))}
                </div>
                
                {/* Stage descriptions */}
                <div className="mt-3 space-y-2 text-xs text-gray-500">
                  <p><strong>Trainee:</strong> Training only (Sales Spark, Role Play, EquipIQ)</p>
                  <p><strong>Active:</strong> + Pipeline, CRM, Drops, basic AI tools</p>
                  <p><strong>Senior:</strong> + Statement Analyzer, Proposal Generator</p>
                </div>
              </div>
            )}
            
            {/* Overrides count */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">
                <strong>{Object.keys(user.overrides || {}).length}</strong> feature overrides
              </p>
            </div>
          </div>
        )}
        
        {activeTab === 'features' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              Toggle features to add explicit overrides. Gray = using default.
            </p>
            
            {FEATURES.filter(f => !f.isCritical).map(feature => {
              const hasOverride = user.overrides?.[feature.id] !== undefined;
              const isEnabled = hasOverride 
                ? user.overrides[feature.id]
                : getDefaultAccess(feature, user.role, user.agentStage);
              
              return (
                <div 
                  key={feature.id}
                  className={`flex items-center justify-between p-3 rounded-lg
                             ${hasOverride ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {feature.name}
                    </p>
                    {hasOverride && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">Override active</p>
                    )}
                  </div>
                  <button
                    onClick={() => overrideMutation.mutate({ 
                      featureId: feature.id, 
                      enabled: !isEnabled 
                    })}
                    disabled={overrideMutation.isPending}
                    className={`relative w-12 h-6 rounded-full transition-colors
                               ${isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span 
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                                 ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              Quick presets to set role, stage, and clear overrides
            </p>
            
            {PERMISSION_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  if (confirm(`Apply "${preset.name}" preset to ${user.name}?`)) {
                    presetMutation.mutate(preset.id);
                  }
                }}
                disabled={presetMutation.isPending || (preset.targetRole !== 'agent' && !isAdmin)}
                className="w-full p-4 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{preset.name}</p>
                    <p className="text-sm text-gray-500">{preset.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getDefaultAccess(feature: FeatureDefinition, role: UserRole, stage: AgentStage): boolean {
  if (role === 'admin') return true;
  if (role === 'manager') return feature.roleDefaults.manager;
  return feature.stageDefaults[stage];
}

function NoAccessMessage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Manager Access Required</h2>
        <p className="text-gray-500 mt-2">You need manager or admin role to access this page.</p>
      </div>
    </div>
  );
}
