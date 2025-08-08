import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Package, DollarSign, TrendingUp, Calendar, Eye, Settings } from 'lucide-react';
import { safeFormatDate } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentRifas, setRecentRifas] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, rifasResponse, purchasesResponse] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/rifas/recent'),
        axios.get('/api/admin/purchases/recent')
      ]);
      
      setStats(statsResponse.data);
      setRecentRifas(rifasResponse.data);
      setRecentPurchases(purchasesResponse.data);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
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

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600 mt-2">Resumen general del sistema de rifas</p>
        </div>

        {/* Estadísticas principales */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-600">
                    +{stats.newUsersThisMonth} este mes
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Rifas</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalRifas}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-600">
                    {stats.activeRifas} activas
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                    <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-600">
                    ${stats.revenueThisMonth} este mes
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Boletos Vendidos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalTicketsSold}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-600">
                    {stats.ticketsSoldThisMonth} este mes
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rifas recientes */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h2 className="card-title">Rifas Recientes</h2>
                <Link to="/admin/rifas" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Ver todas
                </Link>
              </div>
            </div>
            <div className="card-content">
              {recentRifas.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay rifas recientes</p>
              ) : (
                <div className="space-y-4">
                  {recentRifas.map((rifa) => (
                    <div key={rifa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 truncate">{rifa.title}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">
                            Por: {rifa.creator_name}
                          </span>
                          <span className="text-sm text-gray-600">
                            ${rifa.ticket_price}/boleto
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(rifa.status)}
                        <Link
                          to={`/rifas/${rifa.id}`}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Compras recientes */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h2 className="card-title">Compras Recientes</h2>
                <Link to="/admin/purchases" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Ver todas
                </Link>
              </div>
            </div>
            <div className="card-content">
              {recentPurchases.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay compras recientes</p>
              ) : (
                <div className="space-y-4">
                  {recentPurchases.map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 truncate">{purchase.rifa_title}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">
                            {purchase.customer_name || purchase.user_name}
                          </span>
                          <span className="text-sm text-gray-600">
                            {purchase.quantity} boleto{purchase.quantity > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">${purchase.total_amount}</div>
                        <div className="text-xs text-gray-500">
                          {safeFormatDate(purchase.created_at, 'dd MMM')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/users"
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="card-content text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2 mt-2" />
                <h3 className="font-medium text-gray-900">Gestionar Usuarios</h3>
                <p className="text-sm text-gray-600 mt-1">Ver y administrar usuarios del sistema</p>
              </div>
            </Link>

            <Link
              to="/admin/rifas"
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="card-content text-center">
                <Package className="h-8 w-8 text-green-600 mx-auto mb-2 mt-2" />
                <h3 className="font-medium text-gray-900">Gestionar Rifas</h3>
                <p className="text-sm text-gray-600 mt-1">Supervisar y moderar rifas</p>
              </div>
            </Link>

            <Link
              to="/admin/config"
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="card-content text-center">
                <Settings className="h-8 w-8 text-orange-600 mx-auto mb-2 mt-2" />
                <h3 className="font-medium text-gray-900">Configuración</h3>
                <p className="text-sm text-gray-600 mt-1">Configurar la aplicación</p>
              </div>
            </Link>

            <Link
              to="/rifas/create"
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="card-content text-center">
                <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2 mt-2" />
                <h3 className="font-medium text-gray-900">Crear Rifa</h3>
                <p className="text-sm text-gray-600 mt-1">Crear una nueva rifa en el sistema</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;