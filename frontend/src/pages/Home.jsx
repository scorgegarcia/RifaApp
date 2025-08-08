import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Users, DollarSign, Trophy, Search, Filter } from 'lucide-react';
import { safeFormatDate } from '../utils/dateUtils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { AuthContext } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);
  const [rifas, setRifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRifas, setTotalRifas] = useState(0);

  const fetchRifas = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/rifas', {
        params: {
          page: currentPage,
          limit: 12,
          status: statusFilter,
          search: searchTerm
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

  useEffect(() => {
    fetchRifas();
  }, [currentPage, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRifas();
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

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              ¡Participa y Gana!
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Descubre rifas increíbles y ten la oportunidad de ganar premios fantásticos
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/rifas/create"
                className="btn-secondary btn-lg"
              >
                <Trophy className="h-5 w-5 mr-2" />
                Crear Rifa
              </Link>
              <a
                href="#rifas"
                className="btn-primary btn-lg bg-white text-primary-600 hover:bg-gray-100"
              >
                Ver Rifas
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="rifas">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Filtrar por estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field"
              >
                <option value="active">Activas</option>
                <option value="completed">Finalizadas</option>
                <option value="cancelled">Canceladas</option>
                <option value="">Todas</option>
              </select>
            </div>
            
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar rifas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <button type="submit" className="btn-primary">
                Buscar
              </button>
            </form>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {rifas.length} de {totalRifas} rifas
          </div>
        </div>

        {/* Grid de rifas */}
        {rifas.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No se encontraron rifas
            </h3>
            <p className="text-gray-500 mb-6">
              {statusFilter === 'active' 
                ? 'No hay rifas activas en este momento'
                : 'No hay rifas que coincidan con tu búsqueda'
              }
            </p>
            {user && user.role === 'admin' && (
              <Link to="/rifas/create" className="btn-primary">
                <Trophy className="h-4 w-4 mr-2" />
                Crear la primera rifa
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rifas.map((rifa) => {
                const progress = calculateProgress(rifa.total_tickets, rifa.sold_tickets || 0);
                
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
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-gray-600">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Precio por boleto
                          </span>
                          <span className="font-semibold text-primary-600">
                            ${rifa.ticket_price}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            Boletos vendidos
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
                      <Link
                        to={`/rifas/${rifa.id}`}
                        className="btn-primary w-full"
                      >
                        Ver Detalles
                      </Link>
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

export default Home;