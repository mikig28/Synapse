import React from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';

// Generic Skeleton component
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// SkeletonCard component
export const SkeletonCard: React.FC<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ className, children, ...props }) => {
  if (children) { // If children are provided, wrap them in a Card with pulse
    return (
      <Card className={cn("p-4 md:p-6 animate-pulse", className)} {...props}>
        {children}
      </Card>
    );
  }
  
  return (
    <Card className={cn("p-4 md:p-6", className)} {...props}>
      <div className="flex gap-3">
        <Skeleton className="h-14 w-14 rounded-md" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </Card>
  );
};

// SkeletonList component
export const SkeletonList: React.FC<{ items?: number }> = ({ items = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

// SkeletonText component for paragraph loading states
export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 4 }) => {
  return (
    <div className="animate-pulse">
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i} 
            className={`h-3 bg-muted rounded ${i === lines - 1 ? 'w-4/6' : 'w-full'}`} 
          />
        ))}
      </div>
    </div>
  );
};