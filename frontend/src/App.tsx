import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Spaces } from './pages/Spaces';
import { SpaceDashboard } from './pages/SpaceDashboard';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { Materials } from './pages/Materials';
import { Tutor } from './pages/Tutor';
import { Quiz } from './pages/Quiz';
import { Growth } from './pages/Growth';
import { Analytics } from './pages/Analytics';
import { Admin } from './pages/Admin';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="spaces" element={<Spaces />} />
            <Route path="spaces/:spaceId" element={<SpaceDashboard />} />
            
            {/* Project Scoped Learning Loop */}
            <Route path="projects/:projectId" element={<ProjectDashboard />} />
            <Route path="projects/:projectId/materials" element={<Materials />} />
            <Route path="projects/:projectId/tutor" element={<Tutor />} />
            <Route path="projects/:projectId/quiz" element={<Quiz />} />
            <Route path="projects/:projectId/growth" element={<Growth />} />
            <Route path="projects/:projectId/analytics" element={<Analytics />} />

            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
