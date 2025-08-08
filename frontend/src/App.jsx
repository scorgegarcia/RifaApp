import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { AppConfigProvider } from './contexts/AppConfigContext';
import PayPalSDKLoader from './components/PayPalSDKLoader';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import RifaDetail from './pages/rifas/RifaDetail';
import CreateRifa from './pages/rifas/CreateRifa';
import EditRifa from './pages/rifas/EditRifa';
import MyRifas from './pages/rifas/MyRifas';
import Dashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRifas from './pages/admin/AdminRifas';
import AdminConfig from './pages/admin/AdminConfig';
import Profile from './pages/Profile';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import PaymentSuccess from './pages/payment/PaymentSuccess';
import PaymentCancel from './pages/payment/PaymentCancel';
import Setup from './pages/Setup';
import NotFound from './pages/NotFound';

function App() {
  return (
    <PayPalSDKLoader>
      <AppConfigProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  {/* Ruta de setup */}
                  <Route path="/setup" element={<Setup />} />
                  
                  {/* Rutas públicas */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/rifas/:id" element={<RifaDetail />} />
                  
                  {/* Rutas de pagos */}
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/cancel" element={<PaymentCancel />} />
                  
                  {/* Rutas protegidas */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/rifas/create" element={
                    <ProtectedRoute>
                      <CreateRifa />
                    </ProtectedRoute>
                  } />
                  <Route path="/rifas/:id/edit" element={
                    <ProtectedRoute>
                      <EditRifa />
                    </ProtectedRoute>
                  } />
                  <Route path="/my-rifas" element={
                    <ProtectedRoute>
                      <MyRifas />
                    </ProtectedRoute>
                  } />
                  
                  {/* Rutas de administrador */}
                  <Route path="/admin" element={
                    <AdminRoute>
                      <Dashboard />
                    </AdminRoute>
                  } />
                  <Route path="/admin/users" element={
                    <AdminRoute>
                      <AdminUsers />
                    </AdminRoute>
                  } />
                  <Route path="/admin/rifas" element={
                    <AdminRoute>
                      <AdminRifas />
                    </AdminRoute>
                  } />
                  <Route path="/admin/config" element={
                    <AdminRoute>
                      <AdminConfig />
                    </AdminRoute>
                  } />
                  
                  {/* Ruta 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              
              {/* Toast notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </AppConfigProvider>
    </PayPalSDKLoader>
  );
}

export default App;