import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Database, Server, User, Check, AlertCircle, Loader2 } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Setup = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    host: 'localhost',
    port: '3306',
    rootUser: 'root',
    rootPassword: 'root123',
    databaseName: 'rifa_system',
    dbUser: 'rifa_user',
    dbPassword: 'rifa_password_2024',
    useExistingDb: false,
    setupType: 'new',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: ''
  });

  const [connectionStatus, setConnectionStatus] = useState(null);
  const [databaseExists, setDatabaseExists] = useState(false);

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await axios.get('/api/setup/status');
        if (response.data.setupCompleted) {
          navigate('/');
        }
      } catch (error) {
        console.log('Setup pendiente');
      } finally {
        setInitialLoading(false);
      }
    };

    checkSetupStatus();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const testConnection = async () => {
    console.log('=== INICIANDO TEST CONNECTION ===');
    console.log('formData.setupType:', formData.setupType);
    console.log('formData completo:', formData);
    
    setLoading(true);
    setConnectionStatus(null);
    
    try {
      const connectionData = {
        host: formData.host,
        port: formData.port,
        setupType: formData.setupType || 'new'
      };
      
      console.log('connectionData inicial:', connectionData);

      if (formData.setupType === 'new') {
        connectionData.rootUser = formData.rootUser;
        connectionData.rootPassword = formData.rootPassword;
      } else {
        connectionData.dbUser = formData.dbUser;
        connectionData.dbPassword = formData.dbPassword;
        connectionData.databaseName = formData.databaseName;
      }

      connectionData.setupType = formData.setupType;



      const response = await axios.post('/api/setup/test-connection', connectionData);
      
      if (response.data.success) {
        setConnectionStatus('success');
        
        if (formData.setupType === 'new') {
          const dbResponse = await axios.post('/api/setup/check-database', {
            host: formData.host,
            port: formData.port,
            rootUser: formData.rootUser,
            rootPassword: formData.rootPassword,
            databaseName: formData.databaseName
          });
          
          setDatabaseExists(dbResponse.data.exists);
          setCurrentStep(2);
        } else {
          setCurrentStep(4);
        }
      }
    } catch (error) {
      console.error('Error en test connection:', error);
      setConnectionStatus('error');
      toast.error(error.response?.data?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const createDatabase = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/setup/create-database', {
        host: formData.host,
        port: formData.port,
        rootUser: formData.rootUser,
        rootPassword: formData.rootPassword,
        databaseName: formData.databaseName,
        dbUser: formData.dbUser,
        dbPassword: formData.dbPassword,
        useExistingDb: formData.useExistingDb
      });
      
      if (response.data.success) {
        toast.success('Base de datos creada exitosamente');
        setCurrentStep(3);
      }
    } catch (error) {
      console.error('Error creando base de datos:', error);
      toast.error(error.response?.data?.message || 'Error creando la base de datos');
    } finally {
      setLoading(false);
    }
  };

  const validateAdminData = () => {
    if (!formData.adminName.trim()) {
      toast.error('El nombre del administrador es requerido');
      return false;
    }
    if (!formData.adminEmail.trim()) {
      toast.error('El email del administrador es requerido');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      toast.error('El email no tiene un formato válido');
      return false;
    }
    if (!formData.adminPassword.trim()) {
      toast.error('La contraseña del administrador es requerida');
      return false;
    }
    if (formData.adminPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  };

  const proceedToFinalStep = () => {
    if (validateAdminData()) {
      setCurrentStep(4);
    }
  };

  const completeSetup = async () => {
    setLoading(true);
    try {
      const setupData = {
        host: formData.host,
        port: formData.port,
        databaseName: formData.databaseName,
        dbUser: formData.dbUser,
        dbPassword: formData.dbPassword,
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminPhone: formData.adminPhone
      };
      
      if (formData.setupType === 'existing') {
        setupData.setupType = 'existing';
      }
      
      const response = await axios.post('/api/setup/complete', setupData);
      
      if (response.data.success) {
        toast.success('¡Configuración completada! Redirigiendo...');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (error) {
      console.error('Error completando setup:', error);
      toast.error(error.response?.data?.message || 'Error completando la configuración');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const steps = [
    { number: 0, title: 'Tipo de Configuración', icon: Database },
    { number: 1, title: 'Conexión al Servidor', icon: Server },
    { number: 2, title: 'Configuración de Base de Datos', icon: Database },
    { number: 3, title: 'Usuario Administrador', icon: User },
    { number: 4, title: 'Finalización', icon: Check }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configuración Inicial
          </h1>
          <p className="text-gray-600">
            Configura tu aplicación de rifas paso a paso
          </p>
        </div>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:justify-center sm:space-x-8 space-y-4 sm:space-y-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center flex-col sm:flex-row text-center sm:text-left w-full sm:w-auto">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                    isCompleted ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? 'bg-primary-500 border-primary-500 text-white' :
                    'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-primary-600' :
                      isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      Paso {step.number + 1}
                    </p>
                    <p className={`text-xs ${
                      isActive ? 'text-primary-600' :
                      isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-1 h-8 sm:w-16 sm:h-1 mx-auto sm:mx-4 my-2 sm:my-0 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {currentStep === 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Database className="w-5 h-5 mr-2 text-primary-500" />
                Tipo de Configuración
              </h2>
              <p className="text-gray-600 mb-6">
                Selecciona cómo quieres configurar tu base de datos
              </p>
              
              <div className="space-y-4 mb-6">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="setupType"
                      value="new"
                      checked={formData.setupType === 'new'}
                      onChange={handleInputChange}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Crear Nueva Base de Datos</h3>
                      <p className="text-sm text-gray-600">
                        Se creará una nueva base de datos y usuario específico para la aplicación.
                        Necesitarás las credenciales de administrador de MariaDB.
                      </p>
                    </div>
                  </label>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="setupType"
                      value="existing"
                      checked={formData.setupType === 'existing'}
                      onChange={handleInputChange}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Conectar a Base de Datos Existente</h3>
                      <p className="text-sm text-gray-600">
                        Conectar a una base de datos que ya existe con las tablas de la aplicación.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={!formData.setupType}
                  className="btn btn-primary w-full"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Server className="w-5 h-5 mr-2 text-primary-500" />
                {formData.setupType === 'new' ? 'Conexión al Servidor MariaDB' : 'Conexión a Base de Datos Existente'}
              </h2>
              <p className="text-gray-600 mb-6">
                {formData.setupType === 'new'
                  ? 'Ingresa las credenciales de administrador de tu servidor MariaDB. Estas credenciales solo se usarán para crear la base de datos y el usuario, no se guardarán.'
                  : 'Ingresa las credenciales de conexión a tu base de datos existente.'
                }
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Servidor (IP/Host)
                  </label>
                  <input
                    type="text"
                    name="host"
                    value={formData.host}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Puerto
                  </label>
                  <input
                    type="text"
                    name="port"
                    value={formData.port}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="3306"
                  />
                </div>
                
                {formData.setupType === 'existing' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Base de Datos
                    </label>
                    <input
                      type="text"
                      name="databaseName"
                      value={formData.databaseName}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="nombre_base_datos"
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.setupType === 'new' ? 'Usuario Root' : 'Usuario de Base de Datos'}
                  </label>
                  <input
                    type="text"
                    name={formData.setupType === 'new' ? 'rootUser' : 'dbUser'}
                    value={formData.setupType === 'new' ? formData.rootUser : formData.dbUser}
                    onChange={handleInputChange}
                    className="input"
                    placeholder={formData.setupType === 'new' ? 'root' : 'usuario_bd'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.setupType === 'new' ? 'Contraseña Root' : 'Contraseña de Base de Datos'}
                  </label>
                  <input
                    type="password"
                    name={formData.setupType === 'new' ? 'rootPassword' : 'dbPassword'}
                    value={formData.setupType === 'new' ? formData.rootPassword : formData.dbPassword}
                    onChange={handleInputChange}
                    className="input"
                    placeholder={formData.setupType === 'new' ? 'Contraseña del usuario root' : 'Contraseña de la base de datos'}
                  />
                </div>
              </div>
              
              {connectionStatus === 'error' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700 text-sm">
                    Error de conexión. Verifica las credenciales y que el servidor esté ejecutándose.
                  </span>
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  onClick={testConnection}
                  disabled={loading || (formData.setupType === 'new' ? !formData.rootPassword : (!formData.dbPassword || !formData.databaseName))}
                  className="btn btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Probando conexión...
                    </>
                  ) : (
                    'Probar Conexión'
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              {formData.setupType === 'existing' ? (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Check className="w-5 h-5 mr-2 text-green-500" />
                    Conexión Exitosa
                  </h2>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-6">
                    <div className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-green-700 font-medium">
                        Conexión establecida correctamente
                      </span>
                    </div>
                    <p className="text-green-600 text-sm mt-1">
                      La aplicación puede conectarse a tu base de datos existente.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="btn btn-primary w-full"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Database className="w-5 h-5 mr-2 text-primary-500" />
                    Configuración de Base de Datos
                  </h2>
                  
                  {databaseExists && (
                    <div className="mb-6">
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                          <span className="text-yellow-700 font-medium">
                            La base de datos "{formData.databaseName}" ya existe
                          </span>
                        </div>
                        <p className="text-yellow-600 text-sm mt-1">
                          Selecciona qué hacer con la base de datos existente.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="useExistingDb"
                            value={true}
                            checked={formData.useExistingDb === true}
                            onChange={(e) => setFormData(prev => ({ ...prev, useExistingDb: true }))}
                            className="mr-2"
                          />
                          <span>Usar base de datos existente</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="useExistingDb"
                            value={false}
                            checked={formData.useExistingDb === false}
                            onChange={(e) => setFormData(prev => ({ ...prev, useExistingDb: false }))}
                            className="mr-2"
                          />
                          <span>Crear nueva base de datos (se eliminará la existente)</span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-gray-600 mb-6">
                    Configura los detalles de la nueva base de datos y usuario.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la Base de Datos
                      </label>
                      <input
                        type="text"
                        name="databaseName"
                        value={formData.databaseName}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="rifa_system"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Usuario de la Aplicación
                      </label>
                      <input
                        type="text"
                        name="dbUser"
                        value={formData.dbUser}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="rifa_user"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña del Usuario
                      </label>
                      <input
                        type="password"
                        name="dbPassword"
                        value={formData.dbPassword}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Contraseña segura"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="btn btn-secondary"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={createDatabase}
                      disabled={loading}
                      className="btn btn-primary flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        'Crear Base de Datos y Usuario'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-primary-500" />
                Usuario Administrador
              </h2>
              <p className="text-gray-600 mb-6">
                Crea el usuario administrador que tendrá acceso completo al sistema
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="admin@ejemplo.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    name="adminPassword"
                    value={formData.adminPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    name="adminPhone"
                    value={formData.adminPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ej: +1234567890"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 mb-1">Información importante</h3>
                    <p className="text-sm text-blue-700">
                      Este usuario tendrá permisos de administrador y podrá crear rifas, gestionar usuarios y acceder a todas las funciones del sistema.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="btn btn-secondary"
                >
                  Anterior
                </button>
                <button
                  onClick={proceedToFinalStep}
                  className="btn btn-primary flex-1"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Check className="w-5 h-5 mr-2 text-green-500" />
                Configuración Completada
              </h2>
              
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-green-700 font-medium">
                    ¡Todo está listo!
                  </span>
                </div>
                <p className="text-green-600 text-sm mt-1">
                  La configuración se ha completado exitosamente.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-md p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Resumen de la configuración:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>Servidor:</strong> {formData.host}:{formData.port}</li>
                  <li><strong>Base de datos:</strong> {formData.databaseName}</li>
                  <li><strong>Usuario BD:</strong> {formData.dbUser}</li>
                  <li><strong>Administrador:</strong> {formData.adminName} ({formData.adminEmail})</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-secondary"
                >
                  Anterior
                </button>
                <button
                  onClick={completeSetup}
                  disabled={loading}
                  className="btn btn-success flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finalizando configuración...
                    </>
                  ) : (
                    'Completar Configuración'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setup;