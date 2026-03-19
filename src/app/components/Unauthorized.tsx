import { Link } from 'react-router';
import { ShieldOff, Home } from 'lucide-react';

export function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <ShieldOff className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-semibold text-slate-900 mb-3">
            Access Denied
          </h1>
          
          <p className="text-slate-600 mb-8">
            You don't have permission to access this resource. Please contact your administrator if you believe this is a mistake.
          </p>
          
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Home className="w-5 h-5" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
