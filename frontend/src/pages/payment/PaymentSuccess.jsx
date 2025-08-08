import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Download, Eye, Home, ArrowRight } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState(null);
  const [error, setError] = useState(null);

  const paymentId = searchParams.get('paymentId');
  const payerId = searchParams.get('PayerID');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!paymentId || !payerId) {
      setError('Parámetros de pago inválidos');
      setLoading(false);
      return;
    }

    executePayment();
  }, [paymentId, payerId]);

  const executePayment = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/payments/execute-payment', {
        paymentId,
        payerId
      });

      setPurchase(response.data);
      toast.success('¡Pago procesado exitosamente!');
    } catch (error) {
      console.error('Error al ejecutar el pago:', error);
      const message = error.response?.data?.message || 'Error al procesar el pago';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTickets = async () => {
    try {
      const response = await axios.get(`/api/purchases/${purchase.id}/tickets/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `boletos-rifa-${purchase.rifa_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Boletos descargados exitosamente');
    } catch (error) {
      console.error('Error al descargar boletos:', error);
      toast.error('Error al descargar los boletos');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Procesando tu pago...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error en el Pago</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Link to="/" className="btn-primary w-full">
                <Home className="h-4 w-4 mr-2" />
                Volver al Inicio
              </Link>
              <button
                onClick={() => navigate(-1)}
                className="btn-secondary w-full"
              >
                Intentar de Nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No se encontró información de la compra</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header de éxito */}
          <div className="bg-green-50 px-6 py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Pago Exitoso!
            </h1>
            <p className="text-gray-600">
              Tu compra ha sido procesada correctamente
            </p>
          </div>

          {/* Detalles de la compra */}
          <div className="px-6 py-6">
            <div className="space-y-6">
              {/* Información de la rifa */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Detalles de la Compra
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID de Compra:</span>
                    <span className="font-medium">#{purchase.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rifa:</span>
                    <span className="font-medium">{purchase.rifa_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Boletos Comprados:</span>
                    <span className="font-medium">{purchase.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Pagado:</span>
                    <span className="font-medium text-green-600">${purchase.total_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Método de Pago:</span>
                    <span className="font-medium">PayPal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className="badge badge-success">Confirmado</span>
                  </div>
                </div>
              </div>

              {/* Números de boletos */}
              {purchase.ticket_numbers && purchase.ticket_numbers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Tus Números de la Suerte
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {purchase.ticket_numbers.map((number, index) => (
                        <div
                          key={index}
                          className="bg-white border-2 border-blue-200 rounded-lg p-2 text-center font-bold text-blue-600"
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Información importante */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Información Importante
                </h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Guarda este comprobante como evidencia de tu compra</li>
                  <li>• Recibirás un email de confirmación con todos los detalles</li>
                  <li>• Los números ganadores se anunciarán en la fecha del sorteo</li>
                  <li>• Puedes descargar tus boletos en formato PDF</li>
                </ul>
              </div>

              {/* Acciones */}
              <div className="space-y-3">
                <button
                  onClick={downloadTickets}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Boletos (PDF)
                </button>
                
                <Link
                  to={`/rifas/${purchase.rifa_id}`}
                  className="btn-secondary w-full flex items-center justify-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Rifa
                </Link>
                
                <Link
                  to="/"
                  className="btn-secondary w-full flex items-center justify-center"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Volver al Inicio
                </Link>
              </div>

              {/* Próximos pasos */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  ¿Qué sigue?
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Confirmación por Email</p>
                      <p className="text-sm text-gray-600">Recibirás un email con todos los detalles de tu compra</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Espera el Sorteo</p>
                      <p className="text-sm text-gray-600">El sorteo se realizará en la fecha programada</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Resultados</p>
                      <p className="text-sm text-gray-600">Te notificaremos si eres uno de los ganadores</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;