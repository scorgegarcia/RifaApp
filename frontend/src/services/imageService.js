import axios from 'axios';

/**
 * Sube una imagen a IMGBB a través del backend
 * @param {File} imageFile - El archivo de imagen a subir
 * @returns {Promise<string>} - URL de la imagen subida
 */
export const uploadImageToImgBB = async (imageFile) => {
  try {
    if (!imageFile) {
      throw new Error('No se proporcionó archivo de imagen');
    }

    // Verificar que el archivo sea una imagen
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    // Verificar tamaño (máximo 32MB para IMGBB)
    const maxSize = 32 * 1024 * 1024; // 32MB
    if (imageFile.size > maxSize) {
      throw new Error('La imagen es demasiado grande (máximo 32MB)');
    }

    // Crear FormData para la subida
    const formData = new FormData();
    formData.append('image', imageFile);

    // Realizar la subida a través del backend
    const response = await axios.post('/api/rifas/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 segundos de timeout
    });

    if (response.data && response.data.imageUrl) {
      return response.data.imageUrl;
    } else {
      throw new Error('Respuesta inválida del servidor de imágenes');
    }
  } catch (error) {
    console.error('Error al subir imagen:', error);
    
    if (error.response) {
      // Error de respuesta del servidor
      const message = error.response.data?.message || 'Error del servidor de imágenes';
      throw new Error(`Error al subir imagen: ${message}`);
    } else if (error.request) {
      // Error de red
      throw new Error('Error de conexión al subir imagen. Verifica tu conexión a internet.');
    } else {
      // Otros errores
      throw new Error(error.message || 'Error desconocido al subir imagen');
    }
  }
};

/**
 * Valida si un archivo es una imagen válida
 * @param {File} file - El archivo a validar
 * @returns {boolean} - true si es una imagen válida
 */
export const isValidImageFile = (file) => {
  if (!file) return false;
  
  // Verificar tipo MIME
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return false;
  }
  
  // Verificar tamaño (máximo 32MB)
  const maxSize = 32 * 1024 * 1024;
  if (file.size > maxSize) {
    return false;
  }
  
  return true;
};

/**
 * Obtiene el tamaño de archivo en formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};