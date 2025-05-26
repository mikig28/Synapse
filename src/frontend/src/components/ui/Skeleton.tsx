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
