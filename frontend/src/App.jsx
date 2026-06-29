import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { PlatformEnvironmentProvider } from './context/PlatformEnvironmentContext';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import WorkflowsList from './pages/WorkflowsList';
import WorkflowBuilder from './pages/WorkflowBuilder';
import WorkflowMonitoring from './pages/WorkflowMonitoring';
import LogsCenter from './pages/LogsCenter';
import Schedules from './pages/Schedules';
import AlertsCenter from './pages/AlertsCenter';
import Connections from './pages/Connections';
import Environments from './pages/Environments';
import WorkflowVersions from './pages/WorkflowVersions';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <PlatformEnvironmentProvider>
        <AppShell>
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workflows" element={<WorkflowsList />} />
          <Route path="/workflows/builder" element={<WorkflowBuilder />} />
          <Route path="/versions" element={<WorkflowVersions />} />
          <Route path="/monitoring" element={<WorkflowMonitoring />} />
          <Route path="/logs" element={<LogsCenter />} />
          <Route path="/history" element={<Navigate to="/logs" replace />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/alerts" element={<AlertsCenter />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/environments" element={<Environments />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/config" element={<Navigate to="/settings" replace />} />
          </Routes>
        </AppShell>
      </PlatformEnvironmentProvider>
    </BrowserRouter>
  );
}

export default App;
