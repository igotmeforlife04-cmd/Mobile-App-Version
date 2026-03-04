import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  Ban, 
  Unlock, 
  Trash2, 
  Eye, 
  Download,
  Mail,
  MoreHorizontal,
  Plus,
  Upload,
  X,
  Edit2
} from 'lucide-react';
import { UserData, UserRole, UserStatus } from '../types';

export const AdminUsers = ({ admin, filterRole }: { admin: UserData, filterRole?: UserRole }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>(filterRole || 'ALL');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserData>>({});
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'EMPLOYER', status: 'APPROVED' });
  const [importFile, setImportFile] = useState<File | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      
      let filtered = data;
      if (roleFilter !== 'ALL') filtered = filtered.filter((u: any) => u.role.toUpperCase() === roleFilter);
      if (statusFilter !== 'ALL') filtered = filtered.filter((u: any) => u.status.toUpperCase() === statusFilter);
      
      setUsers(filtered);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, search]);

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    try {
      await fetch('/api/admin/update-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus, admin_id: admin.id })
      });
      fetchUsers();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, admin_id: admin.id })
      });
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, role: newUser.role.toLowerCase(), status: newUser.status.toLowerCase() })
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'EMPLOYER', status: 'APPROVED' });
        fetchUsers();
      } else {
        alert("Failed to create user");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.id) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingUser, role: editingUser.role?.toLowerCase(), status: editingUser.status?.toLowerCase() })
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingUser({});
        fetchUsers();
      } else {
        alert("Failed to update user");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...users.map(u => [u.id, u.name, u.email, u.role, u.status, u.created_at].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const usersToImport = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',');
        const user: any = {};
        headers.forEach((header, index) => {
          user[header] = values[index]?.trim();
        });
        // Basic validation
        if (user.name && user.email && user.role) {
          usersToImport.push(user);
        }
      }

      if (usersToImport.length > 0) {
        try {
          const res = await fetch('/api/admin/import-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: usersToImport, admin_id: admin.id })
          });
          const result = await res.json();
          if (result.success) {
            alert(`Successfully imported ${result.imported} users.`);
            fetchUsers();
          } else {
            alert("Import failed.");
          }
        } catch (err) {
          console.error("Import error", err);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="p-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="EMPLOYER">Employer</option>
            <option value="JOB_SEEKER">Job Seeker</option>
            <option value="MODERATOR">Moderator</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="p-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
            <option value="PENDING">Pending</option>
          </select>
          <button onClick={handleExportCSV} className="p-3 bg-zinc-50 border border-zinc-100 rounded-2xl hover:bg-zinc-100 transition-colors" title="Export CSV">
            <Download className="w-5 h-5 text-zinc-400" />
          </button>
          <label className="p-3 bg-zinc-50 border border-zinc-100 rounded-2xl hover:bg-zinc-100 transition-colors cursor-pointer" title="Import CSV">
            <Upload className="w-5 h-5 text-zinc-400" />
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="w-5 h-5" /> Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <th className="px-8 py-5">User Details</th>
                <th className="px-8 py-5">Role & Status</th>
                <th className="px-8 py-5">Subscription</th>
                <th className="px-8 py-5">Joined Date</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-6 h-20 bg-zinc-50/50"></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-zinc-500 font-medium">No users found matching your filters.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center font-bold text-zinc-600 border border-zinc-200">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">{user.name}</div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit",
                          user.role.toUpperCase() === 'ADMIN' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                          user.role.toUpperCase() === 'EMPLOYER' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                          "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        )}>
                          {user.role}
                        </span>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit",
                          user.status.toUpperCase() === 'ACTIVE' || user.status.toUpperCase() === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          user.status.toUpperCase() === 'SUSPENDED' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          "bg-red-50 text-red-600 border border-red-100"
                        )}>
                          {user.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          user.subscription_status === 'active' ? "bg-emerald-500" : "bg-zinc-300"
                        )}></div>
                        <span className="text-xs font-bold text-zinc-700 uppercase tracking-widest">
                          {user.subscription_status || 'NONE'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-zinc-900">{new Date(user.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Joined</div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingUser(user); setIsEditModalOpen(true); }}
                          className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-zinc-400 hover:text-indigo-600 border border-transparent hover:border-zinc-200"
                          title="Edit User"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <div className="relative group/menu">
                          <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-zinc-400 hover:text-zinc-900 border border-transparent hover:border-zinc-200">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-zinc-100 py-2 z-50 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all">
                            {(user.status.toUpperCase() === 'ACTIVE' || user.status.toUpperCase() === 'APPROVED') ? (
                              <button 
                                onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                                className="w-full px-4 py-2 text-left text-sm font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                              >
                                <Ban className="w-4 h-4" /> Suspend Account
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                                className="w-full px-4 py-2 text-left text-sm font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                              >
                                <Unlock className="w-4 h-4" /> Activate Account
                              </button>
                            )}
                            <div className="h-px bg-zinc-100 my-2"></div>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Delete User
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add New User</h3>
              <button onClick={() => setIsAddModalOpen(false)}><X className="w-6 h-6 text-zinc-400" /></button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Full Name</label>
                <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Password</label>
                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <option value="EMPLOYER">Employer</option>
                    <option value="VA">VA</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                  <select value={newUser.status} onChange={e => setNewUser({...newUser, status: e.target.value})} className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <option value="APPROVED">Active</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Create User</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Edit User</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X className="w-6 h-6 text-zinc-400" /></button>
            </div>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Full Name</label>
                <input required type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                <input required type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Role</label>
                  <select value={editingUser.role?.toUpperCase()} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})} className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <option value="EMPLOYER">Employer</option>
                    <option value="VA">VA</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                  <select value={editingUser.status?.toUpperCase()} onChange={e => setEditingUser({...editingUser, status: e.target.value as any})} className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <option value="APPROVED">Active</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Update User</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
