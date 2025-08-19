import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"

interface MobileDialogContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MobileDialogContext = React.createContext<MobileDialogContextType | undefined>(undefined)

const useMobileDialog = () => {
  const context = React.useContext(MobileDialogContext)
  if (!context) {
    throw new Error("useMobileDialog must be used within a MobileDialog")
  }
  return context
}

interface MobileDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const MobileDialog: React.FC<MobileDialogProps> = ({ open = false, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = React.useState(open)
  
  const isControlled = onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  // Prevent body scroll when dialog is open
  React.useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  return (
    <MobileDialogContext.Provider value={{ open: isOpen, onOpenChange: setOpen }}>
      {children}
    </MobileDialogContext.Provider>
  )
}

const MobileDialogTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({ 
  children, 
  asChild = false 
}) => {
  const { onOpenChange } = useMobileDialog()
  
  const handleClick = () => onOpenChange(true)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick
    })
  }
  
  return (
    <button onClick={handleClick}>
      {children}
    </button>
  )
}

interface MobileDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  fullScreen?: boolean
  showCloseButton?: boolean
}

const MobileDialogContent = React.forwardRef<
  HTMLDivElement,
  MobileDialogContentProps
>(({ className, children, fullScreen = false, showCloseButton = true, ...props }, ref) => {
  const { open, onOpenChange } = useMobileDialog()
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!open) return null

  const dialogContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black"
            onClick={() => !fullScreen && onOpenChange(false)}
          />
          
          {/* Content Container */}
          <motion.div
            ref={ref}
            initial={isMobile || fullScreen ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
            animate={isMobile || fullScreen ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isMobile || fullScreen ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 200,
            }}
            className={cn(
              "fixed bg-background",
              isMobile || fullScreen ? [
                "inset-0",
                "w-full h-full",
                "rounded-none",
              ] : [
                "left-[50%] top-[50%]",
                "translate-x-[-50%] translate-y-[-50%]",
                "w-full max-w-4xl",
                "max-h-[90vh]",
                "rounded-2xl",
                "shadow-2xl",
                "border",
              ],
              "overflow-hidden",
              "flex flex-col",
              className
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {children}
            
            {showCloseButton && (
              <button
                className={cn(
                  "absolute z-50 rounded-full bg-background/80 backdrop-blur-sm",
                  "opacity-70 transition-opacity hover:opacity-100",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isMobile || fullScreen ? [
                    "right-4 top-4",
                    "p-2",
                  ] : [
                    "right-6 top-6",
                    "p-2",
                  ]
                )}
                onClick={() => onOpenChange(false)}
              >
                <X className={cn(
                  isMobile || fullScreen ? "h-5 w-5" : "h-4 w-4"
                )} />
                <span className="sr-only">Close</span>
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(dialogContent, document.body)
})
MobileDialogContent.displayName = "MobileDialogContent"

const MobileDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      "px-4 sm:px-6 pt-4 sm:pt-6",
      className
    )}
    {...props}
  />
)
MobileDialogHeader.displayName = "MobileDialogHeader"

const MobileDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      "px-4 sm:px-6 pb-4 sm:pb-6",
      className
    )}
    {...props}
  />
)
MobileDialogFooter.displayName = "MobileDialogFooter"

const MobileDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg sm:text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
MobileDialogTitle.displayName = "MobileDialogTitle"

const MobileDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
MobileDialogDescription.displayName = "MobileDialogDescription"

export {
  MobileDialog,
  MobileDialogTrigger,
  MobileDialogContent,
  MobileDialogHeader,
  MobileDialogFooter,
  MobileDialogTitle,
  MobileDialogDescription,
}