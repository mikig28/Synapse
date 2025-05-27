import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './card';

interface SkeletonListProps {
  items: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ items }) => {
  return (
    <div className="space-y-4 md:space-y-6">
      {[...Array(items)].map((_, i) => (
        <Card key={i} className="p-4 md:p-6 bg-background/80 backdrop-blur-sm border-border/50">
          <div className="animate-pulse">
            <div className="flex justify-between items-start">
              <div className="flex-grow min-w-0">
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                <div className="h-8 w-8 bg-muted rounded"></div>
                <div className="h-8 w-8 bg-muted rounded"></div>
                <div className="h-8 w-8 bg-muted rounded"></div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/20 flex justify-between items-center">
              <div className="h-3 bg-muted rounded w-24"></div>
              <div className="h-5 bg-muted rounded w-16"></div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 4 }) => {
  return (
    <div className="animate-pulse"> {/* Moved animate-pulse to the parent wrapper */}
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-muted rounded mb-2 ${i === lines - 1 ? 'w-5/6' : 'w-full'}`} // Added mb-2 to each line
        ></div>
      ))}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={`animate-pulse rounded-md bg-muted ${className || ''}`} />;
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card className={`p-4 ${className || ''}`}> {/* p-4 for default padding */}
      <div className="animate-pulse">
        {/* Placeholder for a title */}
        <div className="h-5 bg-muted rounded w-3/4 mb-4"></div>
        {/* Placeholder for content lines */}
        <div className="h-4 bg-muted rounded w-full mb-2"></div>
        <div className="h-4 bg-muted rounded w-full mb-2"></div>
        <div className="h-4 bg-muted rounded w-5/6 mb-4"></div> {/* Added mb-4 for spacing before potential footer */}
        {/* Optional: Placeholder for footer/actions */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-muted/20">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-8 bg-muted rounded w-1/5"></div>
        </div>
      </div>
    </Card>
  );
};
