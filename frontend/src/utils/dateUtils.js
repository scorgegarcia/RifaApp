import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha de forma segura, manejando valores inválidos
 * @param {string|Date} dateValue - La fecha a formatear
 * @param {string} formatString - El formato deseado
 * @param {object} options - Opciones adicionales para date-fns
 * @returns {string} - La fecha formateada o un texto por defecto
 */
export const safeFormatDate = (dateValue, formatString = 'dd MMM yyyy', options = { locale: es }) => {
  try {
    if (!dateValue) {
      return 'Fecha no disponible';
    }
    
    const date = new Date(dateValue);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    
    return format(date, formatString, options);
  } catch (error) {
    console.error('Error al formatear fecha:', error, 'Valor:', dateValue);
    return 'Error en fecha';
  }
};

/**
 * Verifica si una fecha es válida
 * @param {string|Date} dateValue - La fecha a verificar
 * @returns {boolean} - true si la fecha es válida
 */
export const isValidDate = (dateValue) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return !isNaN(date.getTime());
};