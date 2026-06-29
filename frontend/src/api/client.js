import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

export const getPlatformEnvironment = () => api.get('/platform/environment');

export const getDashboard = () => api.get('/dashboard');
export const getRoutes = () => api.get('/dashboard/routes');
export const getHealth = () => api.get('/dashboard/health');
export const getWorkflowHistory = (workflowDefinitionId, workflowCode) =>
  api.get('/workflow-monitoring/history', {
    params: {
      ...(workflowDefinitionId != null ? { workflowDefinitionId } : {}),
      ...(workflowCode ? { workflowCode } : {}),
    },
  });
export const getWorkflowLogs = (workflowId) =>
  api.get('/workflow-monitoring/logs', { params: workflowId ? { workflowId } : {} });
export const getConfigurations = () => api.get('/config');
export const updateConfiguration = (id, configValue) =>
  api.put(`/config/${id}`, { configValue });
export const startRoute = (routeId) => api.post(`/config/routes/${routeId}/start`);
export const stopRoute = (routeId) => api.post(`/config/routes/${routeId}/stop`);
export const triggerWorkflow = (payload) =>
  axios.post('/integration/trigger', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

export const getWorkflowDefinitions = () => api.get('/workflow-definitions');
export const getWorkflowPlugins = () => api.get('/workflow-definitions/plugins');
export const getWorkflowDefinition = (id) => api.get(`/workflow-definitions/${id}`);
export const createWorkflowDefinition = (data) => api.post('/workflow-definitions', data);
export const updateWorkflowDefinition = (id, data) => api.put(`/workflow-definitions/${id}`, data);
export const deleteWorkflowDefinition = (id) => api.delete(`/workflow-definitions/${id}`);
export const activateWorkflow = (id) => api.post(`/workflow-definitions/${id}/activate`);
export const deactivateWorkflow = (id) => api.post(`/workflow-definitions/${id}/deactivate`);
export const executeWorkflowDefinition = (id, payload) =>
  api.post(`/workflow-definitions/${id}/execute`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
export const runWorkflowDefinition = (id) =>
  api.post(`/workflow-definitions/${id}/run`);
export const getWorkflowNodeExecutions = (executionId) =>
  api.get(`/workflow-definitions/executions/${executionId}/nodes`);

export default api;
