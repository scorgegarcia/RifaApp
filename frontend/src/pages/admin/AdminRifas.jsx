import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Eye, Edit, Trash2, Calendar, Users, DollarSign, Package } from 'lucide-react';
import { safeFormatDate } from '../../utils/dateUtils';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminRifas = () => {
  const [rifas, setRifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRifas, setTotalRifas] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [showRifaModal, setShowRifaModal] = useState(false);
  const [selectedRifa, setSelectedRifa] = useState(null);

  useEffect(() => {
    fetchRifas();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchRifas = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/rifas', {
        params: {
          page: currentPage,
          limit: 20,
          search: searchTerm,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }
      });
      
      setRifas(response.data.rifas);
      setTotalPages(response.data.totalPages);
      setTotalRifas(response.data.total);
    } catch (error) {
      console.error('Error al cargar rifas:', error);
      toast.error('Error al cargar las rifas');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRifa = async (rifaId, rifaTitle) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la rifa "${rifaTitle}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setActionLoading(rifaId);
    try {
      await axios.delete(`/api/admin/rifas/${rifaId}`);
      toast.success('Rifa eliminada exitosamente');
      fetchRifas();
    } catch (error) {
      console.error('Error al eliminar rifa:', error);
      const message = error.response?.data?.message || 'Error al eliminar la rifa';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeStatus = async (rifaId, newStatus) => {
    const statusLabels = {
      active: 'activar',
      completed: 'finalizar',
      cancelled: 'cancelar'
    };

    if (!window.confirm(`¿Estás seguro de que quieres ${statusLabels[newStatus]} esta rifa?`)) {
      return;
    }

    setActionLoading(rifaId);
    try {
      await axios.put(`/api/admin/rifas/${rifaId}/status`, { status: newStatus });
      toast.success(`Rifa ${statusLabels[newStatus]}da exitosamente`);
      fetchRifas();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      const message = error.response?.data?.message || 'Error al cambiar el estado de la rifa';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewRifa = (rifa) => {
    setSelectedRifa(rifa);
    setShowRifaModal(true);
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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Rifas</h1>
          <p className="text-gray-600 mt-2">Administra todas las rifas del sistema</p>
        </div>

        {/* Filtros y búsqueda */}
        <div className="card mb-6">
          <div className="card-content">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por título o creador..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="input pl-10 w-full"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={handleStatusFilter}
                  className="input w-full"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activas</option>
                  <option value="completed">Finalizadas</option>
                  <option value="cancelled">Canceladas</option>
                </select>
              </div>
            </div>
            
            {totalRifas > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                Mostrando {rifas.length} de {totalRifas} rifa{totalRifas !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Lista de rifas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rifas.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron rifas</p>
            </div>
          ) : (
            rifas.map((rifa) => {
              const progress = calculateProgress(rifa.total_tickets, rifa.sold_tickets || 0);
              const revenue = (rifa.sold_tickets || 0) * rifa.ticket_price;
              
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
                      <h3 className="card-title text-lg line-clamp-2">{rifa.title}</h3>
                      {getStatusBadge(rifa.status)}
                    </div>
                    
                    <p className="card-description line-clamp-2">
                      {rifa.description}
                    </p>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      Por: <span className="font-medium">{rifa.creator_name}</span>
                    </div>
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
                            ${revenue.toFixed(2)}
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
                      <button
                        onClick={() => handleViewRifa(rifa)}
                        className="btn-secondary flex-1 flex items-center justify-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </button>
                      
                      <Link
                        to={`/rifas/${rifa.id}`}
                        className="btn-primary flex items-center justify-center px-3"
                        title="Ver en frontend"
                      >
                        <Package className="h-4 w-4" />
                      </Link>
                      
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            if (e.target.value === 'delete') {
                              handleDeleteRifa(rifa.id, rifa.title);
                            } else if (e.target.value !== rifa.status) {
                              handleChangeStatus(rifa.id, e.target.value);
                            }
                            e.target.value = rifa.status; // Reset select
                          }}
                          disabled={actionLoading === rifa.id}
                          className="btn-secondary px-2 py-1 text-xs"
                          defaultValue={rifa.status}
                        >
                          <option value={rifa.status}>Acciones</option>
                          {rifa.status !== 'active' && <option value="active">Activar</option>}
                          {rifa.status !== 'completed' && <option value="completed">Finalizar</option>}
                          {rifa.status !== 'cancelled' && <option value="cancelled">Cancelar</option>}
                          <option value="delete">Eliminar</option>
                        </select>
                        {actionLoading === rifa.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
      </div>

      {/* Modal de detalles de la rifa */}
      {showRifaModal && selectedRifa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detalles de la Rifa</h3>
                <button
                  onClick={() => setShowRifaModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {selectedRifa.image_url && (
                  <div className="w-full h-48 rounded-lg overflow-hidden">
                    <img
                      src={selectedRifa.image_url}
                      alt={selectedRifa.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 text-lg">{selectedRifa.title}</h4>
                    {getStatusBadge(selectedRifa.status)}
                  </div>
                  <p className="text-gray-600">{selectedRifa.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Creador:</span>
                    <div className="font-medium">{selectedRifa.creator_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Precio por boleto:</span>
                    <div className="font-medium">${selectedRifa.ticket_price}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total boletos:</span>
                    <div className="font-medium">{selectedRifa.total_tickets}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Boletos vendidos:</span>
                    <div className="font-medium">{selectedRifa.sold_tickets || 0}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Fecha de sorteo:</span>
                    <div className="font-medium">
                      {safeFormatDate(selectedRifa.draw_date, 'dd MMM yyyy')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Ingresos:</span>
                    <div className="font-medium text-green-600">
                      ${((selectedRifa.sold_tickets || 0) * selectedRifa.ticket_price).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-500 text-sm">Progreso de venta:</span>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                    <div
                      className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${calculateProgress(selectedRifa.total_tickets, selectedRifa.sold_tickets || 0)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {calculateProgress(selectedRifa.total_tickets, selectedRifa.sold_tickets || 0)}% completado
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRifaModal(false)}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
                <Link
                  to={`/rifas/${selectedRifa.id}`}
                  className="btn-primary"
                  onClick={() => setShowRifaModal(false)}
                >
                  Ver en Frontend
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRifas;