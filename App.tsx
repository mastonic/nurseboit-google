
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import BillingView from './components/BillingView';
import PatientsView from './components/PatientsView';
import PatientDossier from './components/PatientDossier';
import PlanningView from './components/PlanningView';
import PrescriptionView from './components/PrescriptionView';
import MeetingView from './components/MeetingView';
import LogsView from './components/LogsView';
import SettingsView from './components/SettingsView';
import MessagesView from './components/MessagesView';
import TransmissionsView from './components/TransmissionsView';
import TasksView from './components/TasksView';
import AlertsView from './components/AlertsView';
import HelpView from './components/HelpView';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><Layout><PatientsView /></Layout></ProtectedRoute>} />
        <Route path="/patients/:id" element={<ProtectedRoute><Layout><PatientDossier /></Layout></ProtectedRoute>} />
        <Route path="/transmissions" element={<ProtectedRoute><Layout><TransmissionsView /></Layout></ProtectedRoute>} />
        <Route path="/planning" element={<ProtectedRoute><Layout><PlanningView /></Layout></ProtectedRoute>} />
        <Route path="/prescriptions" element={<ProtectedRoute><Layout><PrescriptionView /></Layout></ProtectedRoute>} />

        <Route path="/billing" element={
          <ProtectedRoute allowedRoles={['admin', 'infirmiereAdmin']}>
            <Layout><BillingView /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/meetings" element={<ProtectedRoute><Layout><MeetingView /></Layout></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Layout><MessagesView /></Layout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Layout><TasksView /></Layout></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Layout><AlertsView /></Layout></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Layout><ChatInterface /></Layout></ProtectedRoute>} />

        <Route path="/logs" element={
          <ProtectedRoute allowedRoles={['admin', 'infirmiereAdmin']}>
            <Layout><LogsView /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['admin', 'infirmiereAdmin']}>
            <Layout><SettingsView /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/help" element={<ProtectedRoute><Layout><HelpView /></Layout></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
