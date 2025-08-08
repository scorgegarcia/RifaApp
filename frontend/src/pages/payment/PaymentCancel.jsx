import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, Home, CreditCard } from 'lucide-react';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header de cancelación */}
          <div className="bg-red-50 px-6 py-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Pago Cancelado
            </h1>
            <p className="text-gray-600">
              Tu pago ha sido cancelado y no se ha procesado ningún cargo
            </p>
          </div>

          {/* Contenido */}
          <div className="px-6 py-6">
            <div className="space-y-6">
              {/* Información */}
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  No te preocupes, no se ha realizado ningún cargo a tu cuenta. 
                  Puedes intentar realizar la compra nuevamente cuando estés listo.
                </p>
              </div>

              {/* Razones comunes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-3">
                  Razones comunes de cancelación:
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Decidiste no completar la compra</li>
                  <li>• Problemas con el método de pago</li>
                  <li>• Sesión de PayPal expirada</li>
                  <li>• Cambio de opinión sobre la cantidad de boletos</li>
                </ul>
              </div>

              {/* Acciones */}
              <div className="space-y-3">
                <button
                  onClick={() => navigate(-1)}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver e Intentar de Nuevo
                </button>
                
                <Link
                  to="/"
                  className="btn-secondary w-full flex items-center justify-center"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Ir al Inicio
                </Link>
              </div>

              {/* Ayuda */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  ¿Necesitas Ayuda?
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <CreditCard className="w-3 h-3 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Problemas de Pago</p>
                      <p className="text-sm text-gray-600">
                        Verifica que tu método de pago esté activo y tenga fondos suficientes
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-bold text-gray-600">?</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Soporte Técnico</p>
                      <p className="text-sm text-gray-600">
                        Si continúas teniendo problemas, contáctanos en soporte@rifasapp.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consejos */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Consejos para tu próxima compra:
                </h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Asegúrate de tener una conexión estable a internet</li>
                  <li>• Verifica que tu información de pago esté actualizada</li>
                  <li>• No cierres la ventana durante el proceso de pago</li>
                  <li>• Los boletos se reservan temporalmente durante la compra</li>
                </ul>
              </div>

              {/* Información adicional */}
              <div className="text-center text-sm text-gray-500">
                <p>
                  Recuerda que los boletos populares se agotan rápido. 
                  ¡No esperes demasiado para asegurar tu participación!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;