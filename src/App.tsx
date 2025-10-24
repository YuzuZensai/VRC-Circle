import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './components/theme-provider';
import { ToasterComponent } from './components/toaster';
import { MainLayout } from './layouts/MainLayout';
import { Login } from './pages/Login';
import { Verify2FA } from './pages/Verify2FA';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Worlds } from './pages/Worlds';
import { Avatars } from './pages/Avatars';
import { Settings } from './pages/Settings';
import { Loader2 } from 'lucide-react';
import './App.css';

function AppRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vrc-circle-theme">
      <BrowserRouter>
        <AuthProvider>
          <ToasterComponent />
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/verify-2fa"
              element={<Verify2FA />}
            />
            <Route
              path="/"
              element={
                <AppRoute>
                  <Home />
                </AppRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <AppRoute>
                  <Profile />
                </AppRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <AppRoute>
                  <Profile />
                </AppRoute>
              }
            />
            <Route
              path="/worlds"
              element={
                <AppRoute>
                  <Worlds />
                </AppRoute>
              }
            />
            <Route
              path="/avatars"
              element={
                <AppRoute>
                  <Avatars />
                </AppRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AppRoute>
                  <Settings />
                </AppRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
