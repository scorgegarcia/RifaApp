import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Formulario de perfil
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors }
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    }
  });

  // Formulario de contraseña
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors }
  } = useForm();

  const newPassword = watch('newPassword');

  const onSubmitProfile = async (data) => {
    setIsLoadingProfile(true);
    try {
      const result = await updateProfile(data);
      if (result.success) {
        toast.success('Perfil actualizado correctamente');
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const onSubmitPassword = async (data) => {
    setIsLoadingPassword(true);
    try {
      const result = await changePassword(data.currentPassword, data.newPassword);
      if (result.success) {
        resetPasswordForm();
        toast.success('Contraseña cambiada correctamente');
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Información Personal', icon: User },
    { id: 'password', label: 'Cambiar Contraseña', icon: Lock }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-8">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-full">
                <User className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user?.name}
                </h1>
                <p className="text-primary-100">
                  {user?.email}
                </p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user?.role === 'admin' 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="max-w-2xl">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Información Personal
                </h2>
                
                <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
                  {/* Nombre */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nombre Completo
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...registerProfile('name', {
                          required: 'El nombre es requerido',
                          minLength: {
                            value: 2,
                            message: 'El nombre debe tener al menos 2 caracteres'
                          }
                        })}
                        type="text"
                        className={`input-field pl-10 ${
                          profileErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    {profileErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Correo Electrónico
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...registerProfile('email', {
                          required: 'El correo electrónico es requerido',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Correo electrónico inválido'
                          }
                        })}
                        type="email"
                        className={`input-field pl-10 ${
                          profileErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="tu@email.com"
                      />
                    </div>
                    {profileErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.email.message}</p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Teléfono (Opcional)
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...registerProfile('phone', {
                          pattern: {
                            value: /^[+]?[0-9\s\-\(\)]{10,}$/,
                            message: 'Formato de teléfono inválido'
                          }
                        })}
                        type="tel"
                        className={`input-field pl-10 ${
                          profileErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    {profileErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.phone.message}</p>
                    )}
                  </div>

                  {/* Botón de guardar */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoadingProfile}
                      className="btn-primary flex items-center"
                    >
                      {isLoadingProfile ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="max-w-2xl">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Cambiar Contraseña
                </h2>
                
                <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-6">
                  {/* Contraseña actual */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Contraseña Actual
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...registerPassword('currentPassword', {
                          required: 'La contraseña actual es requerida'
                        })}
                        type={showCurrentPassword ? 'text' : 'password'}
                        className={`input-field pl-10 pr-10 ${
                          passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                    )}
                  </div>

                  {/* Nueva contraseña */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      Nueva Contraseña
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...registerPassword('newPassword', {
                          required: 'La nueva contraseña es requerida',
                          minLength: {
                            value: 6,
                            message: 'La contraseña debe tener al menos 6 caracteres'
                          },
                          pattern: {
                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                            message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
                          }
                        })}
                        type={showNewPassword ? 'text' : 'password'}
                        className={`input-field pl-10 pr-10 ${
                          passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                    )}
                  </div>

                  {/* Confirmar nueva contraseña */}
                  <div>
                    <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...registerPassword('confirmNewPassword', {
                          required: 'Confirma tu nueva contraseña',
                          validate: value => value === newPassword || 'Las contraseñas no coinciden'
                        })}
                        type={showConfirmPassword ? 'text' : 'password'}
                        className={`input-field pl-10 pr-10 ${
                          passwordErrors.confirmNewPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmNewPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmNewPassword.message}</p>
                    )}
                  </div>

                  {/* Botón de cambiar contraseña */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoadingPassword}
                      className="btn-primary flex items-center"
                    >
                      {isLoadingPassword ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Cambiando...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Cambiar Contraseña
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;