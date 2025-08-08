import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Users, DollarSign, Trophy, ShoppingCart, Clock, User, Package } from 'lucide-react';
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
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [purchaseType, setPurchaseType] = useState('tickets'); // 'tickets', 'individual' or 'package'
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchRifaDetail();
  }, [id]);

  useEffect(() => {
    if (rifa && rifa.min_tickets) {
      setSelectedQuantity(rifa.min_tickets);
    }
  }, [rifa]);

  const fetchRifaDetail = async () => {
    try {
      setLoading(true);
      const [rifaResponse, packagesResponse] = await Promise.all([
        axios.get(`/api/rifas/${id}`),
        axios.get(`/api/rifas/${id}/packages`)
      ]);
      
      setRifa(rifaResponse.data.rifa);
      setPackages(packagesResponse.data);
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

    // Validar selección según el tipo de compra
    if (purchaseType === 'tickets' && selectedTickets.length === 0) {
      toast.error('Debes seleccionar al menos un boleto');
      return;
    }

    if (purchaseType === 'tickets' && selectedTickets.length < (rifa.min_tickets || 1)) {
      toast.error(`Debes seleccionar al menos ${rifa.min_tickets || 1} boleto${(rifa.min_tickets || 1) > 1 ? 's' : ''}`);
      return;
    }

    setPurchasing(true);
    try {
      let purchaseData;

      if (purchaseType === 'tickets') {
        // Nueva lógica para boletos específicos
        purchaseData = {
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
      } else {
        // Lógica existente para compras por cantidad o paquetes
        purchaseData = {
          rifa_id: rifa.id,
          purchase_type: purchaseType,
          customer_info: user ? null : customerInfo
        };

        if (purchaseType === 'individual') {
          purchaseData.quantity = selectedQuantity;
        } else {
          purchaseData.package_id = selectedPackage.id;
        }

        const response = await axios.post('/api/purchases', purchaseData);
        
        // Redirigir a PayPal
        if (response.data.approval_url) {
          window.location.href = response.data.approval_url;
        } else {
          toast.error('Error al procesar el pago');
        }
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
    if (purchaseType === 'tickets') {
      return (selectedTickets.length * rifa.ticket_price).toFixed(2);
    } else if (purchaseType === 'individual') {
      return (selectedQuantity * rifa.ticket_price).toFixed(2);
    } else if (selectedPackage) {
      return selectedPackage.price.toFixed(2);
    }
    return '0.00';
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
                    {/* Tipo de compra */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Tipo de compra
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="purchaseType"
                            value="tickets"
                            checked={purchaseType === 'tickets'}
                            onChange={(e) => setPurchaseType(e.target.value)}
                            className="mr-2"
                          />
                          <span>Seleccionar boletos específicos</span>
                        </label>
                        
                        {rifa.allow_single_ticket && (
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="purchaseType"
                              value="individual"
                              checked={purchaseType === 'individual'}
                              onChange={(e) => setPurchaseType(e.target.value)}
                              className="mr-2"
                            />
                            <span>Boletos aleatorios</span>
                          </label>
                        )}
                        
                        {packages.length > 0 && (
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="purchaseType"
                              value="package"
                              checked={purchaseType === 'package'}
                              onChange={(e) => setPurchaseType(e.target.value)}
                              className="mr-2"
                            />
                            <span>Paquetes</span>
                          </label>
                        )}
                      </div>
                    </div>
                    
                    {/* Selección de boletos específicos */}
                    {purchaseType === 'tickets' ? (
                      <div>
                        <TicketSelector 
                          rifa={rifa}
                          onSelectionChange={handleTicketSelectionChange}
                          minTickets={rifa.min_tickets || 1}
                        />
                      </div>
                    ) : purchaseType === 'individual' && rifa.allow_single_ticket ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cantidad de boletos
                        </label>
                        <select
                          value={selectedQuantity}
                          onChange={(e) => setSelectedQuantity(parseInt(e.target.value))}
                          className="input w-full"
                        >
                          {Array.from({ length: Math.min(availableTickets, 10) }, (_, i) => {
                            const minTickets = rifa.min_tickets || 1;
                            const num = i + minTickets;
                            return num <= Math.min(availableTickets, 10) ? (
                              <option key={num} value={num}>
                                {num} boleto{num > 1 ? 's' : ''}
                              </option>
                            ) : null;
                          }).filter(Boolean)}
                        </select>
                        {rifa.min_tickets > 1 && (
                          <p className="mt-1 text-sm text-gray-500">
                            Mínimo {rifa.min_tickets} boletos por compra
                          </p>
                        )}
                      </div>
                    ) : purchaseType === 'package' && packages.length > 0 ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seleccionar paquete
                        </label>
                        <div className="space-y-2">
                          {packages.map((pkg) => (
                            <label key={pkg.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                              <input
                                type="radio"
                                name="package"
                                value={pkg.id}
                                checked={selectedPackage?.id === pkg.id}
                                onChange={() => setSelectedPackage(pkg)}
                                className="mr-3"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{pkg.name}</span>
                                  <span className="text-primary-600 font-bold">${pkg.price}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  {pkg.tickets} boletos • ${(pkg.price / pkg.tickets).toFixed(2)} c/u
                                </div>
                                {pkg.description && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    {pkg.description}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    
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
                        (purchaseType === 'tickets' && selectedTickets.length < (rifa.min_tickets || 1)) ||
                        (purchaseType === 'package' && !selectedPackage)
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