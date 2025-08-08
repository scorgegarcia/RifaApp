import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Calendar, DollarSign, Image, FileText, Users, Save, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { uploadImageToImgBB, isValidImageFile, formatFileSize } from '../../services/imageService';

const CreateRifa = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      min_tickets: 1
    }
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar archivo usando el servicio
      if (!isValidImageFile(file)) {
        toast.error('Por favor selecciona una imagen válida (JPG, PNG, GIF, WebP) menor a 32MB');
        return;
      }
      
      setSelectedImage(file);
      
      // Crear preview
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
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      let imageUrl = null;
      
      // Subir imagen a IMGBB si existe
      if (selectedImage) {
        toast.loading('Subiendo imagen...');
        try {
          imageUrl = await uploadImageToImgBB(selectedImage);
          toast.dismiss();
          toast.success('Imagen subida exitosamente');
        } catch (imageError) {
          toast.dismiss();
          toast.error(imageError.message);
          setIsLoading(false);
          return;
        }
      }
      
      // Preparar datos para enviar
      const rifaData = {
        ...data,
        image_url: imageUrl
      };
      
      const response = await axios.post('/api/rifas', rifaData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      toast.success('Rifa creada exitosamente');
      navigate(`/rifas/${response.data.rifa.id}`);
    } catch (error) {
      console.error('Error al crear rifa:', error);
      const message = error.response?.data?.message || 'Error al crear la rifa';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fecha mínima (mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = format(tomorrow, 'yyyy-MM-dd');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">
              Crear Nueva Rifa
            </h1>
            <p className="text-primary-100 mt-2">
              Completa la información para crear tu rifa
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
                        value: 5,
                        message: 'El título debe tener al menos 5 caracteres'
                      },
                      maxLength: {
                        value: 200,
                        message: 'El título no puede exceder 200 caracteres'
                      }
                    })}
                    type="text"
                    className={`input-field ${
                      errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    placeholder="Ej: Rifa de un iPhone 15 Pro Max"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                {/* Descripción */}
                <div className="lg:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Descripción *
                  </label>
                  <textarea
                    {...register('description', {
                      required: 'La descripción es requerida',
                      minLength: {
                        value: 20,
                        message: 'La descripción debe tener al menos 20 caracteres'
                      },
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

                {/* Cantidad mínima de boletos */}
                <div>
                  <label htmlFor="min_tickets" className="block text-sm font-medium text-gray-700">
                    Cantidad Mínima de Boletos *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('min_tickets', {
                        required: 'La cantidad mínima de boletos es requerida',
                        min: {
                          value: 1,
                          message: 'La cantidad mínima debe ser al menos 1'
                        },
                        max: {
                          value: 100,
                          message: 'La cantidad máxima es 100 boletos'
                        },
                        valueAsNumber: true
                      })}
                      type="number"
                      min="1"
                      max="100"
                      className={`input-field pl-10 ${
                        errors.min_tickets ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                      placeholder="1"
                    />
                  </div>
                  {errors.min_tickets && (
                    <p className="mt-1 text-sm text-red-600">{errors.min_tickets.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Cantidad mínima de boletos que puede comprar un usuario
                  </p>
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


            </div>

            {/* Imagen */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Image className="h-5 w-5 mr-2" />
                Imagen del Premio
              </h2>
              
              <div className="space-y-4">
                {!imagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="image" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Subir imagen del premio
                          </span>
                          <span className="mt-1 block text-sm text-gray-500">
                            PNG, JPG, GIF, WebP hasta 5MB
                          </span>
                        </label>
                        <input
                          id="image"
                          name="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => document.getElementById('image').click()}
                          className="btn-secondary"
                        >
                          Seleccionar Imagen
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex items-center"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Crear Rifa
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRifa;