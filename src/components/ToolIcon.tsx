import React from 'react';
import {
  Eye,
  GitMerge,
  Scissors,
  ImagePlus,
  Images,
  Minimize2,
  LayoutGrid,
  Lock,
  ScanLine,
} from 'lucide-react';
import type { ToolId } from '../types/pdf';

export const RedLeafLogo: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <rect width="64" height="64" rx="16" fill="#D32F2F" />
    <path
      d="M19 13C19 11.3431 20.3431 10 22 10H36.5L47 20.5V51C47 52.6569 45.6569 54 44 54H22C20.3431 54 19 52.6569 19 51V13Z"
      fill="#FFFFFF"
    />
    <path d="M36.5 10L47 20.5H39.5C37.8431 20.5 36.5 19.1569 36.5 17.5V10Z" fill="#FFCDD2" />
    <rect x="24" y="27" width="18" height="3" rx="1.5" fill="#D32F2F" />
    <rect x="24" y="33" width="18" height="3" rx="1.5" fill="#E57373" />
    <rect x="24" y="39" width="12" height="3" rx="1.5" fill="#EF9A9A" />
  </svg>
);

export const ToolIcon: React.FC<{ id: ToolId; className?: string }> = ({
  id,
  className = 'w-6 h-6',
}) => {
  switch (id) {
    case 'viewer':
      return <Eye className={className} aria-hidden="true" />;
    case 'merge':
      return <GitMerge className={className} aria-hidden="true" />;
    case 'split':
      return <Scissors className={className} aria-hidden="true" />;
    case 'image-to-pdf':
      return <ImagePlus className={className} aria-hidden="true" />;
    case 'pdf-to-image':
      return <Images className={className} aria-hidden="true" />;
    case 'compress':
      return <Minimize2 className={className} aria-hidden="true" />;
    case 'organize':
      return <LayoutGrid className={className} aria-hidden="true" />;
    case 'lock-unlock':
      return <Lock className={className} aria-hidden="true" />;
    case 'scan':
      return <ScanLine className={className} aria-hidden="true" />;
  }
};
