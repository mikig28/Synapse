import React from 'react';
import { motion } from 'framer-motion';
import { Construction, Wrench, HardHat, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface UnderConstructionPageProps {
  featureName?: string;
  estimatedCompletion?: string;
  description?: string;
}

const UnderConstructionPage: React.FC<UnderConstructionPageProps> = ({
  featureName = "This Feature",
  estimatedCompletion,
  description = "We're working hard to bring you this feature. Stay tuned!"
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        {/* Animated Construction Icon */}
        <motion.div
          animate={{
            rotate: [0, -10, 10, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="flex justify-center"
        >
          <div className="relative">
            <Construction className="h-32 w-32 text-yellow-500" strokeWidth={1.5} />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl"
            />
          </div>
        </motion.div>

        {/* Title */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Under Construction
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <h2 className="text-xl md:text-2xl font-semibold text-foreground/90">
              {featureName}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto">
              {description}
            </p>
          </motion.div>
        </div>

        {/* Decorative Icons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-8 py-4"
        >
          {[Wrench, HardHat, Construction].map((Icon, index) => (
            <motion.div
              key={index}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.2,
              }}
            >
              <Icon className="h-8 w-8 text-muted-foreground/40" />
            </motion.div>
          ))}
        </motion.div>

        {/* Estimated Completion */}
        {estimatedCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-4 bg-card/50 backdrop-blur-sm border border-border rounded-lg"
          >
            <p className="text-sm text-muted-foreground">
              Estimated Completion:{" "}
              <span className="text-foreground font-semibold">{estimatedCompletion}</span>
            </p>
          </motion.div>
        )}

        {/* Progress Bar Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-2"
        >
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
              initial={{ width: "0%" }}
              animate={{ width: "65%" }}
              transition={{ duration: 1.5, delay: 0.7, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Development in progress...</p>
        </motion.div>

        {/* Back to Dashboard Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Link to="/dashboard">
            <Button
              variant="outline"
              size="lg"
              className="group gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Button>
          </Link>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="pt-8"
        >
          <p className="text-xs text-muted-foreground/60">
            Have suggestions for this feature?{" "}
            <Link to="/settings" className="text-primary hover:underline">
              Contact us
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UnderConstructionPage;
