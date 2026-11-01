'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { CategoryStat, MonthlyTrend } from '@/types/analytics';

export const CategoryBreakdownChart: React.FC<{ data: CategoryStat[] }> = ({ data }) => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Bar dataKey="lostCount" name="Lost Items" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="foundCount" name="Found Items" fill="#0f766e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="returnedCount" name="Returned" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MonthlyRecoveryChart: React.FC<{ data: MonthlyTrend[] }> = ({ data }) => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorReported" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Area type="monotone" dataKey="reported" name="Total Reported" stroke="#0f766e" strokeWidth={2} fillOpacity={1} fill="url(#colorReported)" />
          <Area type="monotone" dataKey="returned" name="Returned to Owner" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorReturned)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

