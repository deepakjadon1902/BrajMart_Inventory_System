import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button.js';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load inventory.',
  message = 'The database is currently unavailable or a connection error occurred.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-rose-200/80 shadow-sm my-6">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-4 border border-rose-100">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1.5 text-sm text-neutral-600 max-w-sm">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button
            variant="outline"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Retry Connection
          </Button>
        </div>
      )}
    </div>
  );
};
