import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const NotFound = () => {
  const { user } = useContext(AuthContext);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* 404 Number */}
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-primary-600 opacity-50">
              404
            </h1>
          </div>
          
          {/* Error Message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Página no encontrada
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Lo sentimos, la página que buscas no existe.
            </p>
            <p className="text-sm text-gray-500">
              Es posible que la URL sea incorrecta o que la página haya sido movida.
            </p>
          </div>

          {/* Search Icon */}
          <div className="mb-8">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link
              to="/"
              className="btn-primary flex items-center justify-center w-full sm:w-auto"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al Inicio
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="btn-secondary flex items-center justify-center w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver Atrás
            </button>
          </div>

          {/* Help Links */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">
              ¿Necesitas ayuda? Prueba estos enlaces:
            </p>
            <div className="space-y-2">
              <Link
                to="/"
                className="block text-sm text-primary-600 hover:text-primary-500 transition-colors"
              >
                Ver todas las rifas
              </Link>
              {user && user.role === 'admin' && (
                <Link
                  to="/rifas/create"
                  className="block text-sm text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Crear una nueva rifa
                </Link>
              )}
              <a
                href="#"
                className="block text-sm text-primary-600 hover:text-primary-500 transition-colors"
              >
                Contactar soporte
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;