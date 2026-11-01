import React from 'react';
import Link from 'next/link';
import { ItemReport } from '@/types/report';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CATEGORY_LABELS, formatDate } from '@/lib/utils';
import { MapPin, Calendar, Building, ShieldCheck, ArrowRight } from 'lucide-react';
import { MOCK_COLLEGES } from '@/data/colleges';

interface ItemCardProps {
  item: ItemReport;
  layout?: 'grid' | 'list';
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, layout = 'grid' }) => {
  const college = MOCK_COLLEGES.find((c) => c.id === item.collegeId);
  const campus = college?.campuses.find((camp) => camp.id === item.campusId);
  const categoryInfo = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.other;

  if (layout === 'list') {
    return (
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-card transition-all">
        {/* Thumbnail */}
        <div className="relative w-full sm:w-44 h-36 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
          {item.images && item.images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.images[0]}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
              No Image Provided
            </div>
          )}
          <div className="absolute top-2 left-2">
            <StatusBadge status={item.status} type={item.type} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{categoryInfo.label}</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-400">{item.referenceNumber}</span>
            </div>

            <Link href={`/items/${item.id}`} className="group">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brandTeal-600 dark:group-hover:text-brandTeal-400 transition-colors line-clamp-1">
                {item.title}
              </h3>
            </Link>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {item.publicDescription}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-[11px]">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[140px]">{college?.shortName || item.collegeId}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[120px]">{item.locationBuilding}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(item.dateOccurred)}</span>
              </span>
            </div>

            <Link
              href={`/items/${item.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:text-brandTeal-800"
            >
              View Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Grid Layout
  return (
    <div className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-subtle hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Image Container */}
        <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {item.images && item.images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.images[0]}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
              No Image Provided
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <StatusBadge status={item.status} type={item.type} />
            {item.finderDepositedWithOffice && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600 text-white shadow-xs flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" /> Campus Safe
              </span>
            )}
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-mono text-white">
            {item.referenceNumber}
          </div>
        </div>

        {/* Content Details */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold text-brandTeal-700 dark:text-brandTeal-400">{categoryInfo.label}</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {formatDate(item.dateOccurred)}
            </span>
          </div>

          <Link href={`/items/${item.id}`} className="block">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brandTeal-600 dark:group-hover:text-brandTeal-400 transition-colors line-clamp-1">
              {item.title}
            </h3>
          </Link>

          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {item.publicDescription}
          </p>

          <div className="pt-2 flex flex-col gap-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Building className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="font-medium truncate">{college?.name || item.collegeId}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{item.locationBuilding}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Color: <span className="font-medium text-slate-700 dark:text-slate-300">{item.color}</span>
        </span>
        <Link
          href={`/items/${item.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:text-brandTeal-800"
        >
          View Details <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

