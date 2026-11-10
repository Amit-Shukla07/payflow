import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-fintech-bg flex items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full bg-white rounded-xl p-8 border border-fintech-border shadow-card space-y-4">
        <div className="font-mono text-3xl font-semibold text-fintech-dark">404</div>
        <div className="space-y-1">
          <h1 className="text-sm font-semibold text-fintech-dark">Page not found</h1>
          <p className="text-xs text-fintech-textSubtle">
            The requested page does not exist or has been moved.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-lg text-xs font-medium text-white bg-fintech-dark hover:bg-slate-800 transition-colors shadow-subtle"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
      </div>
    </div>
  );
};
