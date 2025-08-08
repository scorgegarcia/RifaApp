import { useState, useEffect } from 'react';
import axios from 'axios';

const usePayPalConfig = () => {
  const [config, setConfig] = useState({
    clientId: 'sb', // valor por defecto para sandbox
    mode: 'sandbox'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get('/api/config/public');
        if (response.data.success) {
          setConfig({
            clientId: response.data.data.paypal_client_id || 'sb',
            mode: response.data.data.paypal_mode || 'sandbox'
          });
        }
      } catch (err) {
        console.error('Error al obtener configuración de PayPal:', err);
        setError(err);
        // Mantener valores por defecto en caso de error
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
};

export default usePayPalConfig;