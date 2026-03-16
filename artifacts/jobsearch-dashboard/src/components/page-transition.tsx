import { motion } from "framer-motion";
import { ReactNode } from "react";

export function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  );
}
