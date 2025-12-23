
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentSession } from '../services/store';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const session = getCurrentSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center text-3xl mb-6">
           <i className="fa-solid fa-lock"></i>
        </div>
        <h1 className="text-2xl font-black text-slate-900">Accès restreint</h1>
        <p className="text-slate-500 mt-2 max-w-sm">Votre rôle ({session.role}) ne vous permet pas d'accéder à cette section.</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
        >
           Retour
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
