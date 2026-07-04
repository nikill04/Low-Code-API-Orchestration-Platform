import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkflowList from './pages/WorkflowList';
import WorkflowDetail from './pages/WorkflowDetail';
import WorkflowEditor from './pages/WorkflowEditor';
import TestConsole from './pages/TestConsole';
import ExecutionLogs from './pages/ExecutionLogs';
import AIAssistant from './pages/AIAssistant';
import ApiKeys from './pages/ApiKeys';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/workflows" element={<WorkflowList />} />
            <Route path="/workflows/:id" element={<WorkflowDetail />} />
            <Route path="/test-console" element={<TestConsole />} />
            <Route path="/logs" element={<ExecutionLogs />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/api-keys" element={<ApiKeys />} />
          </Route>

          {/* The editor gets its own full-height layout without the sidebar chrome */}
          <Route
            path="/workflows/new"
            element={
              <ProtectedRoute>
                <WorkflowEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workflows/:id/edit"
            element={
              <ProtectedRoute>
                <WorkflowEditor />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
