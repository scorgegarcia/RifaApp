import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Crear una instancia separada de axios para configuración pública
const publicAxios = axios.create({
  baseURL: window.location.origin
});

const AppConfigContext = createContext();

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig debe ser usado dentro de AppConfigProvider');
  }
  return context;
};

export const AppConfigProvider = ({ children }) => {
  const [appConfig, setAppConfig] = useState({
    app_title: 'RifasApp',
    logo_url: null
  });
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const fetchAppConfig = async (attempt = 1) => {
    try {
      const response = await publicAxios.get('/api/config/public');
      if (response.data && response.data.data) {
        const newConfig = {
          app_title: response.data.data.app_title || 'RifasApp',
          logo_url: response.data.data.app_logo_url
        };
        setAppConfig(newConfig);
        setRetryCount(0); // Reset retry count on success
      } else if (response.data && response.data.app_title) {
        // Handle direct response format
        const newConfig = {
          app_title: response.data.app_title || 'RifasApp',
          logo_url: response.data.app_logo_url
        };
        setAppConfig(newConfig);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error(`Error al cargar configuración (intento ${attempt}):`, error);
      
      // Retry up to 3 times with exponential backoff
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        setTimeout(() => {
          setRetryCount(attempt);
          fetchAppConfig(attempt + 1);
        }, delay);
        return;
      }
      
      // After 3 failed attempts, keep default values
      console.warn('Failed to load app config after 3 attempts, using defaults');
    } finally {
      if (attempt >= 3 || retryCount === 0) {
        setLoading(false);
      }
    }
  };

  const updateAppConfig = (newConfig) => {
    setAppConfig(prevConfig => ({
      ...prevConfig,
      ...newConfig
    }));
  };

  const refreshAppConfig = () => {
    fetchAppConfig();
  };

  useEffect(() => {
    // Intentar cargar inmediatamente
    fetchAppConfig();
    
    // También intentar después de un pequeño delay por si la API no está lista
    const timer = setTimeout(() => {
      fetchAppConfig();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const value = {
    appConfig,
    loading,
    updateAppConfig,
    refreshAppConfig
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
};

export default AppConfigContext;