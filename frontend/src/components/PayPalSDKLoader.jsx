import { useEffect } from 'react';
import usePayPalConfig from '../hooks/usePayPalConfig';

const PayPalSDKLoader = ({ children }) => {
  const { config, loading } = usePayPalConfig();

  useEffect(() => {
    if (loading || window.paypal) return;

    const loadPayPalSDK = () => {
      // Verificar si el script ya existe
      const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${config.clientId}&components=buttons`;
      script.async = true;
      script.onload = () => {
        console.log('PayPal SDK cargado exitosamente');
      };
      script.onerror = () => {
        console.error('Error al cargar el SDK de PayPal');
      };
      
      document.head.appendChild(script);
    };

    loadPayPalSDK();
  }, [config, loading]);

  return children;
};

export default PayPalSDKLoader;