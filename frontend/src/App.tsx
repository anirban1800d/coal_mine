import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import FloatingBackground from './components/FloatingBackground';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { 
            background: 'var(--color-surface)', 
            color: '#fff', 
            border: '1px solid var(--color-border)',
            borderRadius: '12px'
          },
          success: {
            iconTheme: {
              primary: 'var(--color-safe)',
              secondary: 'var(--color-surface)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-danger)',
              secondary: 'var(--color-surface)',
            },
          }
        }} 
      />

      <div className="relative min-h-screen bg-[var(--color-background)] overflow-x-hidden">
        {/* Faint geological survey grid & contour lines */}
        <div className="fixed inset-0 bg-grid bg-contour opacity-60 pointer-events-none z-0" aria-hidden="true" />

        {/* Sophisticated Floating Animation Layer (particles, orbs, technical accents, parallax) */}
        <FloatingBackground />

        {/* Existing UI Layer */}
        <div className="relative z-10 flex min-h-screen flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
