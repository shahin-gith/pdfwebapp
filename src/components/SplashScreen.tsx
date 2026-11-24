import React from 'react';
import { motion } from 'motion/react';
import { RedLeafLogo } from './ToolIcon';

interface SplashScreenProps {
  appName: string;
  tagline: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ appName, tagline }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-[#111214] px-6"
      data-testid="splash-screen"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center"
      >
        <RedLeafLogo className="w-20 h-20 shadow-lg shadow-red-600/20 rounded-2xl" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {appName}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {tagline}
        </p>
      </motion.div>
    </motion.div>
  );
};
