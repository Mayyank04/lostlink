import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Compass, ArrowRight, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-20 max-w-md text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto shadow-inner">
        <Compass className="w-8 h-8 text-brandTeal-600 animate-spin-slow" />
      </div>

      <div className="space-y-2">
        <span className="font-mono text-xs font-bold text-slate-400">404 ERROR</span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Page Not Located
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          The campus record or destination you requested appears to have wandered off or been relocated.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Link href="/">
          <Button size="sm" variant="outline" className="text-xs">
            <Home className="w-3.5 h-3.5 mr-1" /> Return Home
          </Button>
        </Link>
        <Link href="/discover">
          <Button size="sm" variant="primary" className="text-xs">
            Browse Directory <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

