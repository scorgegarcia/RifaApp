import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, ShoppingCart, X, Plus, Minus } from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';
import axios from 'axios';
import toast from 'react-hot-toast';
import './TicketSelector.css';

const TicketSelector = ({ rifa, onSelectionChange, minTickets = 1 }) => {
  const [availableTickets, setAvailableTickets] = useState([]);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [searchNumber, setSearchNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [soldTickets, setSoldTickets] = useState([]);
  const [scrollTop, setScrollTop] = useState(0);
  const ticketGridRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // Configuración para virtualización
  const ITEM_HEIGHT = 40; // Altura de cada ticket en px
  const CONTAINER_HEIGHT = 384; // 24rem en px
  const ITEMS_PER_ROW = 5; // Número de columnas por fila
  const BUFFER_SIZE = 5; // Filas extra para renderizar fuera del viewport
  
  // Función para formatear números con padding de ceros
  const formatTicketNumber = (number) => {
    const totalDigits = rifa.total_tickets.toString().length;
    return number.toString().padStart(totalDigits, '0');
  };

  useEffect(() => {
    if (rifa?.id) {
      fetchAvailableTickets();
    }
  }, [rifa?.id]);

  useEffect(() => {
    onSelectionChange(selectedTickets);
  }, [selectedTickets, onSelectionChange]);

  // Cálculos para virtualización
  const totalRows = useMemo(() => {
    return Math.ceil(rifa.total_tickets / ITEMS_PER_ROW);
  }, [rifa.total_tickets]);

  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT) + BUFFER_SIZE);
    return { startRow, endRow };
  }, [scrollTop, totalRows]);

  const visibleTickets = useMemo(() => {
    const { startRow, endRow } = visibleRange;
    const tickets = [];
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < ITEMS_PER_ROW; col++) {
        const ticketNumber = row * ITEMS_PER_ROW + col + 1;
        if (ticketNumber <= rifa.total_tickets) {
          tickets.push({
            number: ticketNumber,
            row,
            col,
            top: row * ITEM_HEIGHT
          });
        }
      }
    }
    return tickets;
  }, [visibleRange, rifa.total_tickets]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const fetchAvailableTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tickets/available/${rifa.id}`);
      const { availableTickets: available, soldTickets: sold } = response.data;
      
      setAvailableTickets(available || []);
      setSoldTickets(sold || []);
    } catch (error) {
      console.error('Error al cargar boletos:', error);
      toast.error('Error al cargar los boletos disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticketNumber) => {
    if (soldTickets.includes(ticketNumber)) return;
    
    setSelectedTickets(prev => {
      if (prev.includes(ticketNumber)) {
        return prev.filter(num => num !== ticketNumber);
      } else {
        return [...prev, ticketNumber].sort((a, b) => a - b);
      }
    });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchNumber(value);
    
    if (value && !isNaN(value)) {
      const ticketNumber = parseInt(value);
      if (ticketNumber >= 1 && ticketNumber <= rifa.total_tickets) {
        scrollToTicket(ticketNumber);
      }
    }
  };

  const scrollToTicket = (ticketNumber) => {
    if (!ticketGridRef.current) return;
    
    const row = Math.floor((ticketNumber - 1) / ITEMS_PER_ROW);
    const targetScrollTop = row * ITEM_HEIGHT - CONTAINER_HEIGHT / 2;
    
    ticketGridRef.current.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
    
    // Highlight effect después del scroll
    setTimeout(() => {
      const ticketElement = ticketGridRef.current.querySelector(`[data-ticket="${ticketNumber}"]`);
      if (ticketElement) {
        ticketElement.classList.add('ticket-highlight');
        setTimeout(() => {
          ticketElement.classList.remove('ticket-highlight');
        }, 2000);
      }
    }, 500);
  };

  const clearSelection = () => {
    setSelectedTickets([]);
  };

  const selectRandomTickets = (count) => {
    const available = availableTickets.filter(num => !selectedTickets.includes(num));
    if (available.length === 0) return;
    
    const randomSelection = [];
    const maxCount = Math.min(count, available.length);
    
    while (randomSelection.length < maxCount) {
      const randomIndex = Math.floor(Math.random() * available.length);
      const randomTicket = available[randomIndex];
      
      if (!randomSelection.includes(randomTicket)) {
        randomSelection.push(randomTicket);
      }
    }
    
    setSelectedTickets(prev => [...prev, ...randomSelection].sort((a, b) => a - b));
  };

  const getTicketStatus = (ticketNumber) => {
    if (soldTickets.includes(ticketNumber)) return 'sold';
    if (selectedTickets.includes(ticketNumber)) return 'selected';
    return 'available';
  };

  const getTicketClassName = (ticketNumber) => {
    const status = getTicketStatus(ticketNumber);
    const baseClasses = 'ticket-item';
    
    switch (status) {
      case 'sold':
        return `${baseClasses} ticket-sold`;
      case 'selected':
        return `${baseClasses} ticket-selected`;
      case 'available':
      default:
        return `${baseClasses} ticket-available`;
    }
  };

  const canPurchase = selectedTickets.length >= minTickets;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con información */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{rifa.total_tickets}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{soldTickets.length}</div>
            <div className="text-sm text-gray-600">Vendidos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{availableTickets.length}</div>
            <div className="text-sm text-gray-600">Disponibles</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{selectedTickets.length}</div>
            <div className="text-sm text-gray-600">Selectos</div>
          </div>
        </div>
      </div>

      {/* Buscador y controles */}
      <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="number"
            placeholder="Buscar número de boleto..."
            value={searchNumber}
            onChange={handleSearchChange}
            min="1"
            max={rifa.total_tickets}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      <div className="flex flex-col sm:flex-row gap-4">
        
        
        <div className="flex gap-2">
          <button
            onClick={() => selectRandomTickets(5)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            5 Aleatorios
          </button>
          <button
            onClick={() => selectRandomTickets(10)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            10 Aleatorios
          </button>
          <button
            onClick={clearSelection}
            disabled={selectedTickets.length === 0}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 border-2 border-green-600 rounded"></div>
          <span>Seleccionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
          <span>Vendido</span>
        </div>
      </div>

      {/* Grid de boletos virtualizado */}
      <div>
        <div 
          ref={ticketGridRef}
          className="ticket-grid-virtual"
          onScroll={handleScroll}
          style={{ height: CONTAINER_HEIGHT }}
        >
          <div 
            className="ticket-grid-content"
            style={{ height: totalRows * ITEM_HEIGHT, position: 'relative' }}
          >
            {visibleTickets.map((ticket) => (
              <div
                key={ticket.number}
                data-ticket={ticket.number}
                className={getTicketClassName(ticket.number)}
                onClick={() => handleTicketClick(ticket.number)}
                title={`Boleto #${formatTicketNumber(ticket.number)} - ${getTicketStatus(ticket.number) === 'sold' ? 'Vendido' : getTicketStatus(ticket.number) === 'selected' ? 'Seleccionado' : 'Disponible'}`}
                style={{
                  position: 'absolute',
                  top: ticket.top,
                  left: `${(ticket.col / ITEMS_PER_ROW) * 100}%`,
                  width: `${100 / ITEMS_PER_ROW}%`,
                  height: ITEM_HEIGHT - 8, // 8px para gap
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {formatTicketNumber(ticket.number)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Carrito de selección */}
      {selectedTickets.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-800 flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Boletos Seleccionados ({selectedTickets.length})
            </h3>
            <button
              onClick={clearSelection}
              className="text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedTickets.map(ticketNumber => (
              <span
                key={ticketNumber}
                className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md"
              >
                #{formatTicketNumber(ticketNumber)}
                <button
                  onClick={() => handleTicketClick(ticketNumber)}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-green-700">
              Total: ${(selectedTickets.length * rifa.ticket_price).toFixed(2)}
            </span>
            {!canPurchase && (
              <span className="text-red-600">
                Mínimo {minTickets} boleto{minTickets > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketSelector;