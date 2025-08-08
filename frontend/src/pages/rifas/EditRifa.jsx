import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Calendar, DollarSign, Image, FileText, Users, Save, Upload, X, Lock } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { uploadImageToImgBB, isValidImageFile, formatFileSize } from '../../services/imageService';
import { useAuth } from '../../contexts/AuthContext';

const EditRifa = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRifa, setLoadingRifa] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingData, setPendingData] = useState(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm();

  const watchAllowSingleTickets = watch('allow_single_tickets');

  useEffect(() => {
    fetchRifaData();
  }, [id]);

  const fetchRifaData = async () => {
    try {
      setLoadingRifa(true);
      const response = await axios.get(`/api/rifas/${id}`);
      const rifa = response.data.rifa || response.data;
      
      // Verificar que el usuario es el propietario (convertir a números para comparación)
      const rifaCreatedBy = parseInt(rifa.created_by);
      const currentUserId = parseInt(user.id); // Usar user.id en lugar de user.userId
      
      console.log('EditRifa - Verificación de permisos:');
      console.log('Rifa created_by:', rifa.created_by, 'Type:', typeof rifa.created_by);
      console.log('User ID:', user.id, 'Type:', typeof user.id);
      console.log('User role:', user.role);
      console.log('Converted rifa created_by:', rifaCreatedBy);
      console.log('Converted user ID:', currentUserId);
      console.log('Are equal:', rifaCreatedBy === currentUserId);
      
      if (rifaCreatedBy !== currentUserId && user.role !== 'admin') {
        toast.error('No tienes permisos para editar esta rifa');
        navigate('/my-rifas');
        return;
      }
      
      // Verificar que la rifa esté activa
      if (rifa.status !== 'active') {
        toast.error('Solo se pueden editar rifas activas');
        navigate('/my-rifas');
        return;
      }
      
      // Llenar el formulario con los datos existentes
      setValue('title', rifa.title);
      setValue('description', rifa.description || '');
      setValue('total_tickets', rifa.total_tickets);
      setValue('ticket_price', rifa.ticket_price);
      setValue('allow_single_tickets', rifa.allow_single_tickets);
      setValue('draw_date', format(new Date(rifa.draw_date), 'yyyy-MM-dd'));
      
      if (rifa.image_url) {
        setImagePreview(rifa.image_url);
      }
    } catch (error) {
      console.error('Error al cargar la rifa:', error);
      toast.error('Error al cargar la información de la rifa');
      navigate('/my-rifas');
    } finally {
      setLoadingRifa(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!isValidImageFile(file)) {
        toast.error('Por favor selecciona una imagen válida (JPG, PNG, GIF, WebP) menor a 32MB');
        return;
      }
      
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    document.getElementById('image').value = '';
  };

  const verifyPassword = async () => {
    if (!password.trim()) {
      toast.error('Por favor ingresa tu contraseña');
      return;
    }

    setVerifyingPassword(true);
    try {
      await axios.post('/api/auth/verify-password', { password });
      setShowPasswordModal(false);
      
      // Proceder con la actualización, incluyendo la contraseña
      await updateRifa(pendingData, password);
      setPassword('');
    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      toast.error('Contraseña incorrecta');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const updateRifa = async (data, userPassword) => {
    setIsLoading(true);
    try {
      let imageUrl = imagePreview;
      
      // Subir nueva imagen si se seleccionó una
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToImgBB(selectedImage);
        } catch (error) {
          console.error('Error al subir imagen:', error);
          toast.error('Error al subir la imagen. Se guardará la rifa sin imagen.');
          imageUrl = null;
        }
      }

      const rifaData = {
        ...data,
        image_url: imageUrl,
        password: userPassword
      };

      await axios.put(`/api/rifas/${id}`, rifaData);
      toast.success('Rifa actualizada exitosamente');
      navigate('/my-rifas');
    } catch (error) {
      console.error('Error al actualizar rifa:', error);
      const message = error.response?.data?.message || 'Error al actualizar la rifa';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (data) => {
    setPendingData(data);
    setShowPasswordModal(true);
  };

  // Fecha mínima (mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = format(tomorrow, 'yyyy-MM-dd');

  if (loadingRifa) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">
              Editar Rifa
            </h1>
            <p className="text-primary-100 mt-2">
              Modifica la información de tu rifa
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
            {/* Información básica */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Información Básica
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Título */}
                <div className="lg:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Título de la Rifa *
                  </label>
                  <input
                    {...register('title', {
                      required: 'El título es requerido',
                      minLength: {
                        value: 3,
                        message: 'El título debe tener al menos 3 caracteres'
                      },
                      maxLength: {
                        value: 255,
                        message: 'El título no puede exceder 255 caracteres'
                      }
                    })}
                    type="text"
                    className={`input-field ${
                      errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    placeholder="Ej: Rifa de iPhone 15 Pro"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                {/* Imagen */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagen del Premio
                  </label>
                  
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="image" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Seleccionar imagen
                          </span>
                          <span className="mt-1 block text-sm text-gray-500">
                            PNG, JPG, GIF hasta 32MB
                          </span>
                        </label>
                        <input
                          id="image"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </div>
                    </div>
                  )}
                  
                  {selectedImage && (
                    <p className="mt-2 text-sm text-gray-600">
                      Archivo seleccionado: {selectedImage.name} ({formatFileSize(selectedImage.size)})
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div className="lg:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Descripción
                  </label>
                  <textarea
                    {...register('description', {
                      maxLength: {
                        value: 1000,
                        message: 'La descripción no puede exceder 1000 caracteres'
                      }
                    })}
                    rows={4}
                    className={`input-field ${
                      errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    placeholder="Describe detalladamente el premio, condiciones, etc."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Configuración de boletos */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Configuración de Boletos
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Total de boletos */}
                <div>
                  <label htmlFor="total_tickets" className="block text-sm font-medium text-gray-700">
                    Total de Boletos *
                  </label>
                  <input
                    {...register('total_tickets', {
                      required: 'El total de boletos es requerido',
                      min: {
                        value: 10,
                        message: 'Mínimo 10 boletos'
                      },
                      max: {
                        value: 1000000,
                        message: 'Máximo 1,000,000 boletos'
                      },
                      valueAsNumber: true
                    })}
                    type="number"
                    min="10"
                    max="1000000"
                    className={`input-field ${
                      errors.total_tickets ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    placeholder="100"
                  />
                  {errors.total_tickets && (
                    <p className="mt-1 text-sm text-red-600">{errors.total_tickets.message}</p>
                  )}
                </div>

                {/* Precio por boleto */}
                <div>
                  <label htmlFor="ticket_price" className="block text-sm font-medium text-gray-700">
                    Precio por Boleto ($) *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('ticket_price', {
                        required: 'El precio por boleto es requerido',
                        min: {
                          value: 0.01,
                          message: 'El precio mínimo es $0.01'
                        },
                        max: {
                          value: 1000,
                          message: 'El precio máximo es $1,000'
                        },
                        valueAsNumber: true
                      })}
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000"
                      className={`input-field pl-10 ${
                        errors.ticket_price ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                      placeholder="10.00"
                    />
                  </div>
                  {errors.ticket_price && (
                    <p className="mt-1 text-sm text-red-600">{errors.ticket_price.message}</p>
                  )}
                </div>

                {/* Fecha del sorteo */}
                <div>
                  <label htmlFor="draw_date" className="block text-sm font-medium text-gray-700">
                    Fecha del Sorteo *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('draw_date', {
                        required: 'La fecha del sorteo es requerida'
                      })}
                      type="date"
                      min={minDate}
                      className={`input-field pl-10 ${
                        errors.draw_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                  </div>
                  {errors.draw_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.draw_date.message}</p>
                  )}
                </div>
              </div>

              {/* Permitir boletos individuales */}
              <div className="flex items-center">
                <input
                  {...register('allow_single_tickets')}
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Permitir compra de boletos individuales
                </label>
              </div>
              
              {!watchAllowSingleTickets && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Boletos individuales deshabilitados
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Los usuarios solo podrán comprar boletos a través de los paquetes que configures.
                          Asegúrate de crear al menos un paquete para que los usuarios puedan participar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/my-rifas')}
                className="btn-secondary"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex items-center"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Actualizando...' : 'Actualizar Rifa'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de confirmación de contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <Lock className="h-6 w-6 text-primary-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar Cambios
              </h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Por seguridad, ingresa tu contraseña para confirmar los cambios.
            </p>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                placeholder="Ingresa tu contraseña"
                onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
                className="btn-secondary"
                disabled={verifyingPassword}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={verifyPassword}
                disabled={verifyingPassword}
                className="btn-primary flex items-center"
              >
                {verifyingPassword ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {verifyingPassword ? 'Verificando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRifa;