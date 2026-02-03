// =====================================================
// USER MANAGEMENT PANEL COMPONENT
// =====================================================
// Full admin panel for viewing and impersonating users

import React, { useState, useEffect } from 'react';
import { useImpersonation } from '../hooks/useImpersonation';
import ImpersonateButton from './ImpersonateButton';

// Role badge colors
const ROLE_COLORS = {
  super_admin: { bg: '#7c3aed', text: 'white' },
  admin: { bg: '#2563eb', text: 'white' },
  manager: { bg: '#059669', text: 'white' },
  agent: { bg: '#6b7280', text: 'white' }
};

// Role display names
const ROLE_NAMES = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent'
};

export function UserManagementPanel({ currentUser }) {
  const { fetchWithImpersonation, isImpersonating, originalUser } = useImpersonation();
  
  const [users, setUsers] = useState({ managers: [], agents: [], admins: [] });
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'hierarchy'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Get the effective user (original if impersonating)
  const effectiveUser = isImpersonating ? originalUser : currentUser;
  const canViewAdmins = ['super_admin'].includes(effectiveUser?.role);
  const canViewManagers = ['super_admin', 'admin'].includes(effectiveUser?.role);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
    if (canViewManagers) {
      fetchHierarchy();
    }
  }, [effectiveUser?.id]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetchWithImpersonation('/api/impersonation/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.grouped);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const response = await fetchWithImpersonation('/api/impersonation/users/hierarchy');
      const data = await response.json();
      
      if (data.success) {
        setHierarchy(data.hierarchy);
      }
    } catch (err) {
      console.error('Failed to fetch hierarchy:', err);
    }
  };

  // Filter users based on search and role
  const getFilteredUsers = () => {
    let allUsers = [];
    
    if (filterRole === 'all' || filterRole === 'admin') {
      allUsers = [...allUsers, ...users.admins];
    }
    if (filterRole === 'all' || filterRole === 'manager') {
      allUsers = [...allUsers, ...users.managers];
    }
    if (filterRole === 'all' || filterRole === 'agent') {
      allUsers = [...allUsers, ...users.agents];
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      allUsers = allUsers.filter(u => 
        u.email.toLowerCase().includes(term) ||
        u.firstName?.toLowerCase().includes(term) ||
        u.lastName?.toLowerCase().includes(term)
      );
    }

    return allUsers;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>Error: {error}</p>
          <button onClick={fetchUsers} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>User Management</h2>
          <p style={styles.subtitle}>
            View and impersonate users based on your permissions
          </p>
        </div>
        
        <div style={styles.viewToggle}>
          <button 
            style={{
              ...styles.toggleButton,
              ...(view === 'list' ? styles.toggleButtonActive : {})
            }}
            onClick={() => setView('list')}
          >
            List View
          </button>
          {canViewManagers && (
            <button 
              style={{
                ...styles.toggleButton,
                ...(view === 'hierarchy' ? styles.toggleButtonActive : {})
              }}
              onClick={() => setView('hierarchy')}
            >
              Hierarchy
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        
        <select 
          value={filterRole} 
          onChange={(e) => setFilterRole(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Roles</option>
          {canViewAdmins && <option value="admin">Admins</option>}
          {canViewManagers && <option value="manager">Managers</option>}
          <option value="agent">Agents</option>
        </select>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        {canViewAdmins && (
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{users.admins.length}</span>
            <span style={styles.statLabel}>Admins</span>
          </div>
        )}
        {canViewManagers && (
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{users.managers.length}</span>
            <span style={styles.statLabel}>Managers</span>
          </div>
        )}
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{users.agents.length}</span>
          <span style={styles.statLabel}>Agents</span>
        </div>
      </div>

      {/* Content */}
      {view === 'list' ? (
        <div style={styles.userList}>
          {getFilteredUsers().length === 0 ? (
            <div style={styles.emptyState}>
              <p>No users found matching your criteria</p>
            </div>
          ) : (
            getFilteredUsers().map(user => (
              <UserCard key={user.id} user={user} />
            ))
          )}
        </div>
      ) : (
        <div style={styles.hierarchyView}>
          {hierarchy.map(manager => (
            <HierarchyCard key={manager.manager_id} manager={manager} />
          ))}
        </div>
      )}
    </div>
  );
}

// User Card Component
function UserCard({ user }) {
  const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.agent;
  
  return (
    <div style={styles.userCard}>
      <div style={styles.userInfo}>
        <div style={styles.avatar}>
          {(user.firstName?.[0] || user.email[0]).toUpperCase()}
        </div>
        <div style={styles.userDetails}>
          <span style={styles.userName}>
            {user.fullName || user.email}
          </span>
          <span style={styles.userEmail}>{user.email}</span>
        </div>
      </div>
      
      <div style={styles.userActions}>
        <span style={{
          ...styles.roleBadge,
          backgroundColor: roleColor.bg,
          color: roleColor.text
        }}>
          {ROLE_NAMES[user.role]}
        </span>
        <ImpersonateButton targetUser={user} size="small" />
      </div>
    </div>
  );
}

// Hierarchy Card Component
function HierarchyCard({ manager }) {
  const [expanded, setExpanded] = useState(true);
  const roleColor = ROLE_COLORS[manager.manager_role] || ROLE_COLORS.manager;
  
  return (
    <div style={styles.hierarchyCard}>
      <div 
        style={styles.hierarchyHeader}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={styles.userInfo}>
          <div style={{
            ...styles.avatar,
            backgroundColor: roleColor.bg
          }}>
            {(manager.manager_first_name?.[0] || manager.manager_email[0]).toUpperCase()}
          </div>
          <div style={styles.userDetails}>
            <span style={styles.userName}>
              {manager.manager_first_name} {manager.manager_last_name}
            </span>
            <span style={styles.userEmail}>{manager.manager_email}</span>
          </div>
        </div>
        
        <div style={styles.hierarchyMeta}>
          <span style={{
            ...styles.roleBadge,
            backgroundColor: roleColor.bg,
            color: roleColor.text
          }}>
            {ROLE_NAMES[manager.manager_role]}
          </span>
          <span style={styles.agentCount}>
            {manager.agents.length} agent{manager.agents.length !== 1 ? 's' : ''}
          </span>
          <span style={styles.expandIcon}>
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>
      
      {expanded && manager.agents.length > 0 && (
        <div style={styles.agentList}>
          {manager.agents.map(agent => (
            <div key={agent.id} style={styles.agentRow}>
              <div style={styles.agentInfo}>
                <div style={{...styles.smallAvatar}}>
                  {(agent.firstName?.[0] || agent.email[0]).toUpperCase()}
                </div>
                <div>
                  <span style={styles.agentName}>
                    {agent.firstName} {agent.lastName}
                  </span>
                  <span style={styles.agentEmail}>{agent.email}</span>
                </div>
              </div>
              <ImpersonateButton 
                targetUser={{...agent, role: 'agent'}} 
                size="small" 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827'
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#6b7280'
  },
  viewToggle: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#f3f4f6',
    padding: '4px',
    borderRadius: '8px'
  },
  toggleButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  toggleButtonActive: {
    backgroundColor: 'white',
    color: '#111827',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: '1',
    minWidth: '200px',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  },
  filterSelect: {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  stats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  statCard: {
    backgroundColor: '#f9fafb',
    padding: '16px 24px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  userCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'box-shadow 0.2s'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '16px'
  },
  smallAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#6b7280',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '500',
    fontSize: '13px'
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  userName: {
    fontWeight: '500',
    color: '#111827',
    fontSize: '14px'
  },
  userEmail: {
    fontSize: '13px',
    color: '#6b7280'
  },
  userActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  roleBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  hierarchyView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  hierarchyCard: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  hierarchyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    cursor: 'pointer',
    backgroundColor: '#f9fafb'
  },
  hierarchyMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  agentCount: {
    fontSize: '13px',
    color: '#6b7280'
  },
  expandIcon: {
    color: '#9ca3af',
    fontSize: '12px'
  },
  agentList: {
    padding: '8px 16px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  agentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginLeft: '24px'
  },
  agentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  agentName: {
    display: 'block',
    fontWeight: '500',
    fontSize: '13px',
    color: '#374151'
  },
  agentEmail: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#6b7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#dc2626'
  },
  retryButton: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  }
};

export default UserManagementPanel;
