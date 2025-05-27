import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './card';
import { cn } from '@/lib/utils'; // Assuming cn is in lib/utils

// Generic Skeleton component
function BaseSkeleton({ // Renamed to BaseSkeleton to avoid conflict if user has a different Skeleton in mind
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

export { BaseSkeleton as Skeleton }; // Exporting as Skeleton as used in NotesPage

// SkeletonCard component
export const SkeletonCard: React.FC<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ className, children, ...props }) => {
  if (children) { // If children are provided, wrap them in a Card with pulse
    return (
      <Card className={cn("p-4 md:p-6 animate-pulse", className)} {...props}>
        {children}
      </Card>
    );
  }
  // Default SkeletonCard structure if no children
  return (
    <Card className={cn("p-4 md:p-6", className)} {...props}>
      <div className="animate-pulse">
        <div className="flex justify-between items-start">
          <div className="flex-grow min-w-0">
            <BaseSkeleton className="h-6 w-3/4 mb-2" />
            <BaseSkeleton className="h-4 w-1/2 mb-3" />
            <BaseSkeleton className="h-3 w-full mb-2" />
            <BaseSkeleton className="h-3 w-2/3" />
          </div>
          <div className="flex flex-col space-y-2 ml-4">
            <BaseSkeleton className="h-8 w-8 rounded" />
            <BaseSkeleton className="h-8 w-8 rounded" />
            <BaseSkeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border/20 flex justify-between items-center">
          <BaseSkeleton className="h-3 w-24" />
          <BaseSkeleton className="h-5 w-16" />
        </div>
      </div>
    </Card>
  );
};

// SkeletonText component
export const SkeletonText: React.FC<{ lines?: number; className?: string; lineClassName?: string }> = ({ lines = 1, className, lineClassName }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {[...Array(lines)].map((_, i) => (
        <BaseSkeleton 
          key={i} 
          className={cn(
            "h-4", // Default height for a line of text
            i === lines - 1 && lines > 1 ? "w-5/6" : "w-full", // Last line is shorter if multiple lines
            lineClassName
          )} 
        />
      ))}
    </div>
  );
};


// Existing SkeletonList component
interface SkeletonListProps {
  items: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ items }) => {
  return (
    <div className="space-y-4 md:space-y-6">
      {[...Array(items)].map((_, i) => (
        // Using the new SkeletonCard component for consistency, or keep original if preferred
        // For now, keeping original to minimize changes to existing working component
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
