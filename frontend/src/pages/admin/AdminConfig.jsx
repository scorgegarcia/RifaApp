import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, RefreshCw, Image, Type, Lock, Unlock, Eye, EyeOff, Database, CreditCard, Shield, Server, Key } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAppConfig } from '../../contexts/AppConfigContext';

const AdminConfig = () => {
  const { refreshAppConfig } = useAppConfig();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [envVars, setEnvVars] = useState({});
  const [envLoading, setEnvLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEnvPasswords, setShowEnvPasswords] = useState({});
  const [formData, setFormData] = useState({
    app_title: '',
    app_logo_url: ''
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get('/api/config');
      if (response.data.success) {
        const configsData = response.data.data;
        setConfigs(configsData);
        
        // Convertir array de configs a objeto para el formulario
        const configObj = {};
        configsData.forEach(config => {
          configObj[config.config_key] = config.config_value || '';
        });
        setFormData(configObj);
      }
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
      toast.error('Error al cargar las configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Actualizar cada configuración
      const updatePromises = Object.entries(formData).map(([key, value]) => {
        return axios.put(`/api/config/${key}`, { value });
      });
      
      await Promise.all(updatePromises);
      
      toast.success('Configuraciones actualizadas exitosamente');
      
      // Refrescar la configuración global
      refreshAppConfig();
    } catch (error) {
      console.error('Error al actualizar configuraciones:', error);
      toast.error('Error al actualizar las configuraciones');
    } finally {
      setSaving(false);
    }
  };

  const unlockEnvVars = async () => {
    if (!password) {
      toast.error('Por favor ingresa tu contraseña');
      return;
    }

    setEnvLoading(true);
    try {
      const response = await axios.post('/api/config/env', { password });
      if (response.data.success) {
        setEnvVars(response.data.data);
        setIsUnlocked(true);
        setPassword('');
        toast.success('Variables de entorno desbloqueadas');
      }
    } catch (error) {
      console.error('Error al desbloquear variables:', error);
      if (error.response?.status === 401) {
        toast.error('Contraseña incorrecta');
      } else {
        toast.error('Error al desbloquear las variables de entorno');
      }
    } finally {
      setEnvLoading(false);
    }
  };

  const handleEnvVarChange = (key, value) => {
    setEnvVars(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveEnvVars = async () => {
    if (!password) {
      toast.error('Por favor ingresa tu contraseña para confirmar los cambios');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put('/api/config/env', {
        password,
        envVars
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        setPassword('');
      }
    } catch (error) {
      console.error('Error al guardar variables:', error);
      if (error.response?.status === 401) {
        toast.error('Contraseña incorrecta');
      } else {
        toast.error('Error al guardar las variables de entorno');
      }
    } finally {
      setSaving(false);
    }
  };

  const lockEnvVars = () => {
    setIsUnlocked(false);
    setEnvVars({});
    setPassword('');
    setShowEnvPasswords({});
  };

  const toggleEnvPasswordVisibility = (key) => {
    setShowEnvPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const resetToDefaults = async () => {
    if (!window.confirm('¿Estás seguro de que quieres restaurar los valores por defecto?')) {
      return;
    }
    
    setSaving(true);
    
    try {
      await axios.put('/api/config/app_title', { value: 'RifasApp' });
      await axios.put('/api/config/app_logo_url', { value: '' });
      
      setFormData({
        app_title: 'RifasApp',
        app_logo_url: ''
      });
      
      toast.success('Configuraciones restauradas a valores por defecto');
      
      // Refrescar la configuración global
      refreshAppConfig();
    } catch (error) {
      console.error('Error al restaurar configuraciones:', error);
      toast.error('Error al restaurar las configuraciones');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-primary-600" />
          Configuración de la Aplicación
        </h1>
        <p className="text-gray-600">
          Personaliza la apariencia y configuración general de tu aplicación de rifas.
        </p>
      </div>

      {/* Pestañas */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Type className="w-4 h-4 inline mr-2" />
              General
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'advanced'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Avanzado
            </button>
          </nav>
        </div>

        {/* Contenido de la pestaña General */}
        {activeTab === 'general' && (
          <>
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Configuración General</h2>
              <p className="text-sm text-gray-600 mt-1">
                Estos cambios se aplicarán inmediatamente en toda la aplicación.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Título de la aplicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Type className="w-4 h-4 mr-2 text-gray-500" />
                  Título de la Aplicación
                </label>
                <input
                  type="text"
                  name="app_title"
                  value={formData.app_title}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Ej: RifasApp, Mi Sistema de Rifas"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este título aparecerá en la barra de navegación y en el título de la página.
                </p>
              </div>

              {/* URL del logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Image className="w-4 h-4 mr-2 text-gray-500" />
                  URL del Logo
                </label>
                <input
                  type="url"
                  name="app_logo_url"
                  value={formData.app_logo_url}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="https://ejemplo.com/mi-logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL de la imagen del logo que aparecerá junto al título. Deja vacío para usar el icono por defecto.
                </p>
                
                {/* Vista previa del logo */}
                {formData.app_logo_url && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-600 mb-2">Vista previa:</p>
                    <div className="flex items-center space-x-2">
                      <img 
                        src={formData.app_logo_url} 
                        alt="Logo preview" 
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <span 
                        className="text-red-500 text-xs hidden"
                      >
                        Error al cargar la imagen
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formData.app_title || 'RifasApp'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary flex items-center justify-center flex-1"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={resetToDefaults}
                  disabled={saving}
                  className="btn btn-secondary flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restaurar por Defecto
                </button>
              </div>
            </form>

            {/* Información adicional */}
            <div className="mx-6 mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <Settings className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">
                    Información sobre la configuración
                  </h3>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Los cambios se aplicarán inmediatamente en toda la aplicación</li>
                    <li>• El logo debe ser una URL pública accesible desde internet</li>
                    <li>• Se recomienda usar imágenes cuadradas para el logo (ej: 64x64px)</li>
                    <li>• Formatos soportados: PNG, JPG, SVG, WebP</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Contenido de la pestaña Avanzado */}
        {activeTab === 'advanced' && (
          <>
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Configuración Avanzada
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Variables de entorno del sistema. Requiere autenticación adicional.
              </p>
            </div>

            <div className="p-6">
              {!isUnlocked ? (
                <div className="text-center py-12">
                  <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Variables de Entorno Bloqueadas
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Ingresa tu contraseña para acceder a la configuración avanzada del sistema.
                  </p>
                  
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña de administrador"
                        className="input pr-10"
                        onKeyPress={(e) => e.key === 'Enter' && unlockEnvVars()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <button
                      onClick={unlockEnvVars}
                      disabled={envLoading || !password}
                      className="btn btn-primary w-full flex items-center justify-center"
                    >
                      {envLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Desbloqueando...
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          Desbloquear
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Header con botón de bloquear */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Unlock className="w-5 h-5 mr-2 text-green-500" />
                        Variables de Entorno Desbloqueadas
                      </h3>
                      <p className="text-sm text-gray-600">
                        Puedes editar las variables del sistema. Los cambios requieren reiniciar el servidor.
                      </p>
                    </div>
                    <button
                      onClick={lockEnvVars}
                      className="btn btn-secondary flex items-center"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Bloquear
                    </button>
                  </div>

                  {/* Secciones de variables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* PayPal */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-gray-900 flex items-center border-b pb-2">
                        <CreditCard className="w-4 h-4 mr-2 text-blue-500" />
                        Configuración PayPal
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={envVars.PAYPAL_CLIENT_ID || ''}
                          onChange={(e) => handleEnvVarChange('PAYPAL_CLIENT_ID', e.target.value)}
                          className="input"
                          placeholder="PayPal Client ID"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client Secret
                        </label>
                        <div className="relative">
                          <input
                            type={showEnvPasswords.PAYPAL_CLIENT_SECRET ? 'text' : 'password'}
                            value={envVars.PAYPAL_CLIENT_SECRET || ''}
                            onChange={(e) => handleEnvVarChange('PAYPAL_CLIENT_SECRET', e.target.value)}
                            className="input pr-10"
                            placeholder="PayPal Client Secret"
                          />
                          <button
                            type="button"
                            onClick={() => toggleEnvPasswordVisibility('PAYPAL_CLIENT_SECRET')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showEnvPasswords.PAYPAL_CLIENT_SECRET ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Modo
                        </label>
                        <select
                          value={envVars.PAYPAL_MODE || 'sandbox'}
                          onChange={(e) => handleEnvVarChange('PAYPAL_MODE', e.target.value)}
                          className="input"
                        >
                          <option value="sandbox">Sandbox (Pruebas)</option>
                          <option value="live">Live (Producción)</option>
                        </select>
                      </div>
                    </div>

                    {/* Base de Datos */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-gray-900 flex items-center border-b pb-2">
                        <Database className="w-4 h-4 mr-2 text-green-500" />
                        Base de Datos
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Host
                        </label>
                        <input
                          type="text"
                          value={envVars.DB_HOST || ''}
                          onChange={(e) => handleEnvVarChange('DB_HOST', e.target.value)}
                          className="input"
                          placeholder="localhost"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Puerto
                        </label>
                        <input
                          type="number"
                          value={envVars.DB_PORT || ''}
                          onChange={(e) => handleEnvVarChange('DB_PORT', e.target.value)}
                          className="input"
                          placeholder="3306"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Usuario
                        </label>
                        <input
                          type="text"
                          value={envVars.DB_USER || ''}
                          onChange={(e) => handleEnvVarChange('DB_USER', e.target.value)}
                          className="input"
                          placeholder="Usuario de la base de datos"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={showEnvPasswords.DB_PASSWORD ? 'text' : 'password'}
                            value={envVars.DB_PASSWORD || ''}
                            onChange={(e) => handleEnvVarChange('DB_PASSWORD', e.target.value)}
                            className="input pr-10"
                            placeholder="Contraseña de la base de datos"
                          />
                          <button
                            type="button"
                            onClick={() => toggleEnvPasswordVisibility('DB_PASSWORD')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showEnvPasswords.DB_PASSWORD ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre de la Base de Datos
                        </label>
                        <input
                          type="text"
                          value={envVars.DB_NAME || ''}
                          onChange={(e) => handleEnvVarChange('DB_NAME', e.target.value)}
                          className="input"
                          placeholder="Nombre de la base de datos"
                        />
                      </div>
                    </div>

                    {/* Seguridad */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-gray-900 flex items-center border-b pb-2">
                        <Key className="w-4 h-4 mr-2 text-red-500" />
                        Seguridad
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          JWT Secret
                        </label>
                        <div className="relative">
                          <input
                            type={showEnvPasswords.JWT_SECRET ? 'text' : 'password'}
                            value={envVars.JWT_SECRET || ''}
                            onChange={(e) => handleEnvVarChange('JWT_SECRET', e.target.value)}
                            className="input pr-10"
                            placeholder="Clave secreta para JWT"
                          />
                          <button
                            type="button"
                            onClick={() => toggleEnvPasswordVisibility('JWT_SECRET')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showEnvPasswords.JWT_SECRET ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          JWT Expiración
                        </label>
                        <input
                          type="text"
                          value={envVars.JWT_EXPIRES_IN || ''}
                          onChange={(e) => handleEnvVarChange('JWT_EXPIRES_IN', e.target.value)}
                          className="input"
                          placeholder="24h, 7d, etc."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          IMGBB API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showEnvPasswords.IMGBB_API_KEY ? 'text' : 'password'}
                            value={envVars.IMGBB_API_KEY || ''}
                            onChange={(e) => handleEnvVarChange('IMGBB_API_KEY', e.target.value)}
                            className="input pr-10"
                            placeholder="Clave API de IMGBB"
                          />
                          <button
                            type="button"
                            onClick={() => toggleEnvPasswordVisibility('IMGBB_API_KEY')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showEnvPasswords.IMGBB_API_KEY ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Servidor */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-gray-900 flex items-center border-b pb-2">
                        <Server className="w-4 h-4 mr-2 text-purple-500" />
                        Servidor
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Puerto
                        </label>
                        <input
                          type="number"
                          value={envVars.PORT || ''}
                          onChange={(e) => handleEnvVarChange('PORT', e.target.value)}
                          className="input"
                          placeholder="3000"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Entorno
                        </label>
                        <select
                          value={envVars.NODE_ENV || 'development'}
                          onChange={(e) => handleEnvVarChange('NODE_ENV', e.target.value)}
                          className="input"
                        >
                          <option value="development">Development</option>
                          <option value="production">Production</option>
                          <option value="test">Test</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="border-t pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirma tu contraseña para guardar los cambios
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña de administrador"
                            className="input pr-10"
                            onKeyPress={(e) => e.key === 'Enter' && saveEnvVars()}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 sm:items-end">
                        <button
                          onClick={saveEnvVars}
                          disabled={saving || !password}
                          className="btn btn-primary flex items-center justify-center"
                        >
                          {saving ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Guardar Variables
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Advertencia */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-yellow-900 mb-1">
                          ⚠️ Configuración Avanzada
                        </h3>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          <li>• Los cambios en estas variables requieren reiniciar el servidor</li>
                          <li>• Configuraciones incorrectas pueden hacer que la aplicación no funcione</li>
                          <li>• Mantén una copia de seguridad del archivo .env antes de hacer cambios</li>
                          <li>• Las contraseñas y claves secretas se muestran ocultas por seguridad</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminConfig;