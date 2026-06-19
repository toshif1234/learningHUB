import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import PublicRoute from './routes/PublicRoute';
import Layout from './components/Layout';

import LandingPage from './pages/LandingPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import OTPVerifyPage from './pages/auth/OTPVerifyPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseListPage from './pages/admin/CourseListPage';
import CourseBuilder from './pages/admin/CourseBuilder';
import AssignCoursePage from './pages/admin/AssignCoursePage';
import ManageAssignmentsPage from './pages/admin/ManageAssignmentsPage';
import UserManagementPage from './pages/admin/UserManagementPage';

// Associate Pages
import AssociateDashboard from './pages/associate/AssociateDashboard';
import CourseViewerPage from './pages/associate/CourseViewerPage';
import FreeCatalogPage from './pages/associate/FreeCatalogPage';
import AssessmentPage from './pages/associate/AssessmentPage';
import ResultsPage from './pages/associate/ResultsPage';

// Notifications Page
import NotificationsPage from './pages/NotificationsPage';

function DashboardRedirect() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/my/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155'
            }
          }}
        />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/verify-otp" element={<OTPVerifyPage />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          {/* Unified Dashboard redirect */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="courses" element={<CourseListPage />} />
            <Route path="courses/new" element={<CourseBuilder />} />
            <Route path="courses/:id/edit" element={<CourseBuilder />} />
            <Route path="assign" element={<AssignCoursePage />} />
            <Route path="assignments" element={<ManageAssignmentsPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Associate Routes */}
          <Route path="/my" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AssociateDashboard />} />
            <Route path="courses/:id" element={<CourseViewerPage />} />
            <Route path="catalog" element={<FreeCatalogPage />} />
            <Route path="assessments/:id" element={<AssessmentPage />} />
            <Route path="results/:attemptId" element={<ResultsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Fallback Defaults */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
