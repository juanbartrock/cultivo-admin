'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, UserPlus, Edit, Trash2, Shield, Crown, Star, 
  Loader2, ArrowLeft, Check, X, AlertCircle, RefreshCw,
  Home, Tent, Cpu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  subscriptionTier: 'BASIC' | 'PRO' | 'PREMIUM';
  isActive: boolean;
  createdAt: string;
  _count?: {
    rooms: number;
    devices: number;
    cycles: number;
  };
}

const TIER_COLORS = {
  BASIC: 'bg-zinc-700/50 text-zinc-400',
  PRO: 'bg-blue-500/20 text-blue-400',
  PREMIUM: 'bg-yellow-500/20 text-yellow-400',
};

const TIER_ICONS = {
  BASIC: Star,
  PRO: Crown,
  PREMIUM: Shield,
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin, isLoading: authLoading, getAccessToken } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal de edición
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'USER' as 'ADMIN' | 'USER',
    subscriptionTier: 'BASIC' as 'BASIC' | 'PRO' | 'PREMIUM',
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal de nuevo usuario
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER',
    subscriptionTier: 'BASIC' as 'BASIC' | 'PRO' | 'PREMIUM',
  });
  
  // Confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null,
  });

  // Verificar acceso
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  // Cargar usuarios
  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await getAccessToken();
      const localToken = localStorage.getItem('access_token');
      const authToken = token || localToken;
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/users?stats=true`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // Guardar cambios de usuario
  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    setIsSaving(true);
    try {
      const token = await getAccessToken();
      const localToken = localStorage.getItem('access_token');
      const authToken = token || localToken;
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar usuario');
      }

      toast.success('Usuario actualizado correctamente');
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Crear nuevo usuario
  const handleCreateUser = async () => {
    setIsSaving(true);
    try {
      const token = await getAccessToken();
      const localToken = localStorage.getItem('access_token');
      const authToken = token || localToken;
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newUserForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear usuario');
      }

      toast.success('Usuario creado correctamente');
      setShowNewUserModal(false);
      setNewUserForm({ name: '', email: '', password: '', role: 'USER', subscriptionTier: 'BASIC' });
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Desactivar usuario
  const handleDeactivateUser = async () => {
    if (!deleteConfirm.user) return;
    
    try {
      const token = await getAccessToken();
      const localToken = localStorage.getItem('access_token');
      const authToken = token || localToken;
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/users/${deleteConfirm.user.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al desactivar usuario');
      }

      toast.success('Usuario desactivado');
      setDeleteConfirm({ isOpen: false, user: null });
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Reactivar usuario
  const handleReactivateUser = async (userId: string) => {
    try {
      const token = await getAccessToken();
      const localToken = localStorage.getItem('access_token');
      const authToken = token || localToken;
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/users/${userId}/reactivate`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al reactivar usuario');
      }

      toast.success('Usuario reactivado');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cultivo-darker flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cultivo-green-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cultivo-darker">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-cultivo-dark/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-cultivo-green-500" />
                Administración de Usuarios
              </h1>
              <p className="text-sm text-zinc-400">{users.length} usuarios registrados</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNewUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white rounded-lg transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Nuevo Usuario
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-cultivo-green-500 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map((user, index) => {
              const TierIcon = TIER_ICONS[user.subscriptionTier];
              const isCurrentUser = user.id === currentUser?.id;
              
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 bg-zinc-800/50 border rounded-xl ${
                    user.isActive ? 'border-zinc-700/50' : 'border-red-500/30 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        user.role === 'ADMIN' ? 'bg-cultivo-green-600/20' : 'bg-zinc-700/50'
                      }`}>
                        {user.role === 'ADMIN' ? (
                          <Shield className="w-6 h-6 text-cultivo-green-400" />
                        ) : (
                          <span className="text-lg font-bold text-zinc-400">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{user.name}</h3>
                          {isCurrentUser && (
                            <span className="text-xs px-2 py-0.5 bg-cultivo-green-600/20 text-cultivo-green-400 rounded">
                              Tú
                            </span>
                          )}
                          {!user.isActive && (
                            <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400">{user.email}</p>
                        
                        {/* Stats */}
                        {user._count && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Home className="w-3 h-3" />
                              {user._count.rooms} salas
                            </span>
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3" />
                              {user._count.devices} dispositivos
                            </span>
                            <span className="flex items-center gap-1">
                              <Tent className="w-3 h-3" />
                              {user._count.cycles} ciclos
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Tier y acciones */}
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${TIER_COLORS[user.subscriptionTier]}`}>
                        <TierIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{user.subscriptionTier}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditForm({
                              name: user.name,
                              email: user.email,
                              role: user.role,
                              subscriptionTier: user.subscriptionTier,
                              isActive: user.isActive,
                            });
                          }}
                          className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {!isCurrentUser && (
                          user.isActive ? (
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, user })}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateUser(user.id)}
                              className="p-2 hover:bg-green-500/20 rounded-lg transition-colors text-zinc-400 hover:text-green-400"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Editar Usuario */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">Editar Usuario</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'ADMIN' | 'USER' })}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="USER">Usuario</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Suscripción</label>
                <select
                  value={editForm.subscriptionTier}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionTier: e.target.value as 'BASIC' | 'PRO' | 'PREMIUM' })}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="BASIC">Básica</option>
                  <option value="PRO">Pro</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={isSaving}
                className="px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 text-white rounded-lg flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Nuevo Usuario */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewUserModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">Nuevo Usuario</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="Nombre del usuario"
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Suscripción Inicial</label>
                <select
                  value={newUserForm.subscriptionTier}
                  onChange={(e) => setNewUserForm({ ...newUserForm, subscriptionTier: e.target.value as 'BASIC' | 'PRO' | 'PREMIUM' })}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="BASIC">Básica</option>
                  <option value="PRO">Pro</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>
            </div>
            
            <p className="text-xs text-zinc-500 mt-4">
              El usuario podrá iniciar sesión con su email y contraseña.
            </p>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewUserModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isSaving || !newUserForm.name || !newUserForm.email || newUserForm.password.length < 6}
                className="px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 text-white rounded-lg flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear Usuario
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmación de desactivación */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Desactivar Usuario"
        message={`¿Estás seguro de que deseas desactivar a ${deleteConfirm.user?.name}? El usuario no podrá acceder al sistema.`}
        confirmText="Desactivar"
        onConfirm={handleDeactivateUser}
        onCancel={() => setDeleteConfirm({ isOpen: false, user: null })}
        variant="danger"
      />
    </div>
  );
}
