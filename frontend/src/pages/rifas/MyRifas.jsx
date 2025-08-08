import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Calendar, Users, DollarSign, Trophy, Edit, Trash2, Eye } from 'lucide-react';
import { safeFormatDate } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const MyRifas = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [rifas, setRifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRifas, setTotalRifas] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMyRifas = async () => {
    // Verificar autenticación antes de hacer la petición
    if (!isAuthenticated()) {
      toast.error('Debes iniciar sesión para ver tus rifas');
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      console.log('Haciendo petición a /api/rifas/my-rifas');
      const response = await axios.get('/api/rifas/my-rifas', {
        params: {
          page: currentPage,
          limit: 12
        }
      });
      
      console.log('Respuesta recibida:', response.data);
      setRifas(response.data.rifas);
      setTotalPages(response.data.totalPages);
      setTotalRifas(response.data.total);
    } catch (error) {
      console.error('Error al cargar mis rifas:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Error al cargar tus rifas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRifas();
  }, [currentPage]);

  const handleDeleteRifa = async (rifaId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta rifa? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingId(rifaId);
    try {
      await axios.delete(`/api/rifas/${rifaId}`);
      toast.success('Rifa eliminada exitosamente');
      fetchMyRifas(); // Recargar la lista
    } catch (error) {
      console.error('Error al eliminar rifa:', error);
      const message = error.response?.data?.message || 'Error al eliminar la rifa';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      completed: 'badge-primary',
      cancelled: 'badge-danger'
    };
    
    const labels = {
      active: 'Activa',
      completed: 'Finalizada',
      cancelled: 'Cancelada'
    };
    
    return (
      <span className={`badge ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const calculateProgress = (totalTickets, soldTickets) => {
    return Math.round((soldTickets / totalTickets) * 100);
  };

  const calculateRevenue = (soldTickets, ticketPrice) => {
    return (soldTickets * ticketPrice).toFixed(2);
  };

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Mis Rifas
              </h1>
              <p className="text-gray-600">
                Administra y monitorea tus rifas creadas
              </p>
            </div>
            {user && user.role === 'admin' && (
              <Link
                to="/rifas/create"
                className="btn-primary flex items-center mt-4 sm:mt-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Rifa
              </Link>
            )}
          </div>
          
          {totalRifas > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Total: {totalRifas} rifa{totalRifas !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Lista de rifas */}
        {rifas.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No tienes rifas creadas
            </h3>
            <p className="text-gray-500 mb-6">
              {user && user.role === 'admin' 
                ? 'Crea tu primera rifa y comienza a vender boletos'
                : 'Solo los administradores pueden crear rifas'
              }
            </p>
            {user && user.role === 'admin' && (
              <Link to="/rifas/create" className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Crear mi primera rifa
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rifas.map((rifa) => {
                const progress = calculateProgress(rifa.total_tickets, rifa.sold_tickets || 0);
                const revenue = calculateRevenue(rifa.sold_tickets || 0, rifa.ticket_price);
                
                return (
                  <div key={rifa.id} className="card hover:shadow-lg transition-shadow">
                    {rifa.image_url && (
                      <div className="aspect-w-16 aspect-h-9 mb-4">
                        <img
                          src={rifa.image_url}
                          alt={rifa.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="card-header">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="card-title text-lg">{rifa.title}</h3>
                        {getStatusBadge(rifa.status)}
                      </div>
                      
                      <p className="card-description line-clamp-2">
                        {rifa.description}
                      </p>
                    </div>
                    
                    <div className="card-content">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Precio/boleto:</span>
                            <div className="font-semibold text-primary-600">
                              ${rifa.ticket_price}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Ingresos:</span>
                            <div className="font-semibold text-green-600">
                              ${revenue}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            Vendidos
                          </span>
                          <span className="font-semibold">
                            {rifa.sold_tickets || 0} / {rifa.total_tickets}
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-gray-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            Sorteo
                          </span>
                          <span className="font-semibold">
                            {safeFormatDate(rifa.draw_date, 'dd MMM yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-footer">
                      <div className="flex space-x-2">
                        <Link
                          to={`/rifas/${rifa.id}`}
                          className="btn-secondary flex-1 flex items-center justify-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Link>
                        
                        {rifa.status === 'active' && (
                          <>
                            <Link
                              to={`/rifas/${rifa.id}/edit`}
                              className="btn-primary flex items-center justify-center px-3"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            
                            <button
                              onClick={() => handleDeleteRifa(rifa.id)}
                              disabled={deletingId === rifa.id}
                              className="btn-danger flex items-center justify-center px-3"
                            >
                              {deletingId === rifa.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <nav className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-md ${
                        currentPage === page
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyRifas;