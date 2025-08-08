import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Trophy, Ticket, Eye, Clock, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const MyParticipations = () => {
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchParticipations();
  }, []);

  const fetchParticipations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/tickets/my-participations');
      setParticipations(response.data);
    } catch (error) {
      console.error('Error al obtener participaciones:', error);
      const message = error.response?.data?.message || 'Error al cargar las participaciones';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (drawDate) => {
    const now = new Date();
    const draw = new Date(drawDate);
    
    if (draw > now) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Finalizada
        </span>
      );
    }
  };

  const TicketDisplay = ({ tickets }) => {
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {tickets.map((ticketNumber, index) => (
          <div
            key={index}
            className="relative bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm transform hover:scale-105 transition-transform"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)'
            }}
          >
            <div className="flex items-center space-x-1">
              <Ticket className="w-3 h-3" />
              <span>{ticketNumber}</span>
            </div>
            {/* Perforación decorativa */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-white rounded-full opacity-30"></div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-white rounded-full opacity-30"></div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Cargando tus participaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchParticipations}
            className="btn-primary"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mis Participaciones
          </h1>
          <p className="text-gray-600">
            Aquí puedes ver todas las rifas en las que has participado y el estado de tus tickets.
          </p>
        </div>

        {participations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes participaciones aún
            </h3>
            <p className="text-gray-600 mb-6">
              Cuando compres tickets para una rifa, aparecerán aquí.
            </p>
            <Link to="/" className="btn-primary">
              Explorar Rifas
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {participations.map((participation) => (
              <div
                key={participation.rifa_id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Imagen del premio */}
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={participation.image_url || '/placeholder-rifa.jpg'}
                    alt={participation.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.src = '/placeholder-rifa.jpg';
                    }}
                  />
                </div>

                {/* Contenido */}
                <div className="p-6">
                  {/* Título y estado */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {participation.title}
                    </h3>
                    {getStatusBadge(participation.draw_date)}
                  </div>

                  {/* Descripción */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {participation.description}
                  </p>

                  {/* Información de tickets */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Mis tickets:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {participation.ticket_count} tickets
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <span className="text-sm text-gray-600 block mb-1">Mis números:</span>
                      <TicketDisplay tickets={participation.ticket_numbers} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total pagado:</span>
                      <span className="text-sm font-medium text-green-600">
                        ${participation.total_amount}
                      </span>
                    </div>
                  </div>

                  {/* Fecha del sorteo */}
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Sorteo: {formatDate(participation.draw_date)}</span>
                  </div>

                  {/* Botón de ver detalles */}
                  <Link
                    to={`/rifas/${participation.rifa_id}`}
                    className="w-full btn-secondary flex items-center justify-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estadísticas */}
        {participations.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Resumen de Participaciones
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {participations.length}
                </div>
                <div className="text-sm text-gray-600">Rifas participadas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {participations.reduce((sum, p) => sum + p.ticket_count, 0)}
                </div>
                <div className="text-sm text-gray-600">Total de tickets</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  ${participations.reduce((sum, p) => sum + parseFloat(p.total_amount), 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total invertido</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyParticipations;