import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Users, DollarSign, Trophy, ShoppingCart, Clock, User } from 'lucide-react';
import { safeFormatDate } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import TicketSelector from '../../components/TicketSelector';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const RifaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rifa, setRifa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchRifaDetail();
  }, [id]);



  const fetchRifaDetail = async () => {
    try {
      setLoading(true);
      const rifaResponse = await axios.get(`/api/rifas/${id}`);
      
      setRifa(rifaResponse.data.rifa);
    } catch (error) {
      console.error('Error al cargar la rifa:', error);
      if (error.response?.status === 404) {
        navigate('/404');
      } else {
        toast.error('Error al cargar la información de la rifa');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSelectionChange = (tickets) => {
    setSelectedTickets(tickets);
  };

  const handlePurchase = async () => {
    if (!rifa) return;

    // Validar información del cliente si no está autenticado
    if (!user) {
      if (!customerInfo.name || !customerInfo.email) {
        toast.error('Por favor completa tu nombre y email');
        return;
      }
    }

    // Validar selección de boletos
    if (selectedTickets.length === 0) {
      toast.error('Debes seleccionar al menos un boleto');
      return;
    }

    if (selectedTickets.length < (rifa.min_tickets || 1)) {
      toast.error(`Debes seleccionar al menos ${rifa.min_tickets || 1} boleto${(rifa.min_tickets || 1) > 1 ? 's' : ''}`);
      return;
    }

    setPurchasing(true);
    try {
      const purchaseData = {
        rifaId: rifa.id,
        buyerName: user ? user.name : customerInfo.name,
        buyerEmail: user ? user.email : customerInfo.email,
        buyerPhone: user ? user.phone : customerInfo.phone,
        ticketNumbers: selectedTickets
      };

      const response = await axios.post('/api/tickets/reserve', purchaseData);
      
      // Redirigir a PayPal
      if (response.data.approval_url) {
        window.location.href = response.data.approval_url;
      } else {
        toast.error('Error al procesar el pago');
      }
    } catch (error) {
      console.error('Error al procesar la compra:', error);
      const message = error.response?.data?.message || 'Error al procesar la compra';
      toast.error(message);
    } finally {
      setPurchasing(false);
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

  const calculateProgress = () => {
    if (!rifa) return 0;
    return Math.round((rifa.sold_tickets / rifa.total_tickets) * 100);
  };

  const calculateTotal = () => {
    return (selectedTickets.length * rifa.ticket_price).toFixed(2);
  };

  const getAvailableTickets = () => {
    if (!rifa) return 0;
    return rifa.total_tickets - rifa.sold_tickets;
  };

  const isRifaActive = () => {
    if (!rifa || rifa.status !== 'active') return false;
    
    const drawDate = new Date(rifa.draw_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    drawDate.setHours(0, 0, 0, 0);
    
    return drawDate >= today;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!rifa) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rifa no encontrada</h2>
          <p className="text-gray-600">La rifa que buscas no existe o ha sido eliminada.</p>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();
  const availableTickets = getAvailableTickets();
  const canPurchase = isRifaActive() && availableTickets > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información principal */}
          <div className="lg:col-span-2">
            <div className="card">
              {rifa.image_url && (
                <div className="mb-6">
                  <img
                    src={rifa.image_url}
                    alt={rifa.title}
                    className="w-full h-64 sm:h-80 object-cover rounded-lg"
                  />
                </div>
              )}
              
              <div className="card-header">
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-3xl font-bold text-gray-900">{rifa.title}</h1>
                  {getStatusBadge(rifa.status)}
                </div>
                
                <p className="text-gray-600 text-lg leading-relaxed">
                  {rifa.description}
                </p>
              </div>
              
              <div className="card-content">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <DollarSign className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">${rifa.ticket_price}</div>
                    <div className="text-sm text-gray-600">Por boleto</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {rifa.sold_tickets} / {rifa.total_tickets}
                    </div>
                    <div className="text-sm text-gray-600">Boletos vendidos</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-gray-900">
                      {safeFormatDate(rifa.draw_date, 'dd MMM')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {safeFormatDate(rifa.draw_date, 'yyyy')}
                    </div>
                  </div>
                </div>
                
                {/* Barra de progreso */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Progreso de venta</span>
                    <span className="text-sm font-medium text-gray-700">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Información del creador */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Organizador
                  </h3>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{rifa.creator_name}</div>
                      <div className="text-sm text-gray-600">
                        Creado el {safeFormatDate(rifa.created_at, 'dd MMM yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Panel de compra */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <div className="card-header">
                <h2 className="card-title flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Comprar Boletos
                </h2>
              </div>
              
              <div className="card-content">
                {!canPurchase ? (
                  <div className="text-center py-6">
                    {rifa.status === 'completed' ? (
                      <>
                        <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                        <p className="text-gray-600">Esta rifa ya ha finalizado</p>
                      </>
                    ) : rifa.status === 'cancelled' ? (
                      <>
                        <Clock className="h-12 w-12 text-red-500 mx-auto mb-3" />
                        <p className="text-gray-600">Esta rifa ha sido cancelada</p>
                      </>
                    ) : availableTickets === 0 ? (
                      <>
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">Todos los boletos han sido vendidos</p>
                      </>
                    ) : (
                      <>
                        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">La fecha de sorteo ha pasado</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Selección de boletos */}
                    <div>
                      <TicketSelector 
                        rifa={rifa}
                        onSelectionChange={handleTicketSelectionChange}
                        minTickets={rifa.min_tickets || 1}
                      />
                    </div>
                    
                    {/* Información del cliente (si no está autenticado) */}
                    {!user && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">Información de contacto</h3>
                        <input
                          type="text"
                          placeholder="Nombre completo *"
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                          className="input w-full"
                        />
                        <input
                          type="email"
                          placeholder="Email *"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                          className="input w-full"
                        />
                        <input
                          type="tel"
                          placeholder="Teléfono (opcional)"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                          className="input w-full"
                        />
                      </div>
                    )}
                    
                    {/* Total */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-primary-600">${calculateTotal()}</span>
                      </div>
                    </div>
                    
                    {/* Botón de compra */}
                    <button
                      onClick={handlePurchase}
                      disabled={
                        purchasing || 
                        selectedTickets.length < (rifa.min_tickets || 1)
                      }
                      className="btn-primary w-full"
                    >
                      {purchasing ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        'Comprar con PayPal'
                      )}
                    </button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      Serás redirigido a PayPal para completar el pago de forma segura
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RifaDetail;