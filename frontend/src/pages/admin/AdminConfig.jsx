import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, RefreshCw, Image, Type } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAppConfig } from '../../contexts/AppConfigContext';

const AdminConfig = () => {
  const { refreshAppConfig } = useAppConfig();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-primary-600" />
          Configuración de la Aplicación
        </h1>
        <p className="text-gray-600">
          Personaliza la apariencia y configuración general de tu aplicación de rifas.
        </p>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
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
      </div>

      {/* Información adicional */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
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
    </div>
  );
};

export default AdminConfig;