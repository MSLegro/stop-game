import React from 'react';

interface DoodleAvatarProps {
  avatarId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const DoodleAvatar: React.FC<DoodleAvatarProps> = ({ avatarId, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const renderDoodle = () => {
    switch (avatarId) {
      case 'gato-bigotes':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M 25 35 L 35 15 L 48 30 M 75 35 L 65 15 L 52 30" fill="#fef08a" stroke="#18181b" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="50" cy="55" r="35" fill="#fef08a" stroke="#18181b" strokeWidth="4" />
            <ellipse cx="40" cy="50" rx="4" ry="6" fill="#18181b" />
            <ellipse cx="60" cy="50" rx="4" ry="6" fill="#18181b" />
            <path d="M 48 58 L 52 58 L 50 62 Z" fill="#ef4444" />
            <path d="M 45 64 Q 50 68 55 64" fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
            <path d="M 20 52 L 32 54 M 20 60 L 32 58 M 80 52 L 68 54 M 80 60 L 68 58" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );

      case 'monstruo-ojo':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M 25 75 Q 15 35 50 30 Q 85 35 75 75 Z" fill="#bbf7d0" stroke="#18181b" strokeWidth="4" />
            <path d="M 32 30 L 25 18 M 68 30 L 75 18" stroke="#18181b" strokeWidth="4" strokeLinecap="round" />
            <circle cx="25" cy="18" r="4" fill="#ef4444" stroke="#18181b" strokeWidth="2" />
            <circle cx="75" cy="18" r="4" fill="#ef4444" stroke="#18181b" strokeWidth="2" />
            <circle cx="50" cy="48" r="14" fill="#ffffff" stroke="#18181b" strokeWidth="3" />
            <circle cx="52" cy="48" r="6" fill="#18181b" />
            <path d="M 38 68 Q 50 78 62 68" fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );

      case 'alien-divertido':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <ellipse cx="50" cy="55" rx="35" ry="30" fill="#a7f3d0" stroke="#18181b" strokeWidth="4" />
            <path d="M 50 25 L 50 12" stroke="#18181b" strokeWidth="3" />
            <circle cx="50" cy="10" r="5" fill="#facc15" stroke="#18181b" strokeWidth="3" />
            <circle cx="32" cy="48" r="7" fill="#ffffff" stroke="#18181b" strokeWidth="3" />
            <circle cx="32" cy="48" r="3" fill="#18181b" />
            <circle cx="50" cy="45" r="8" fill="#ffffff" stroke="#18181b" strokeWidth="3" />
            <circle cx="50" cy="45" r="4" fill="#18181b" />
            <circle cx="68" cy="48" r="7" fill="#ffffff" stroke="#18181b" strokeWidth="3" />
            <circle cx="68" cy="48" r="3" fill="#18181b" />
            <path d="M 40 68 Q 50 62 60 68" fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );

      case 'robot-carton':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <rect x="25" y="30" width="50" height="48" rx="8" fill="#e2e8f0" stroke="#18181b" strokeWidth="4" />
            <path d="M 50 30 L 50 15" stroke="#18181b" strokeWidth="4" />
            <circle cx="50" cy="15" r="5" fill="#ef4444" stroke="#18181b" strokeWidth="3" />
            <rect x="33" y="44" width="12" height="12" fill="#38bdf8" stroke="#18181b" strokeWidth="3" />
            <rect x="55" y="44" width="12" height="12" fill="#38bdf8" stroke="#18181b" strokeWidth="3" />
            <path d="M 38 66 L 62 66" stroke="#18181b" strokeWidth="4" strokeLinecap="round" strokeDasharray="4 3" />
            <rect x="18" y="48" width="7" height="12" rx="2" fill="#94a3b8" stroke="#18181b" strokeWidth="2" />
            <rect x="75" y="48" width="7" height="12" rx="2" fill="#94a3b8" stroke="#18181b" strokeWidth="2" />
          </svg>
        );

      case 'tostada-kawaii':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M 25 35 Q 25 20 50 20 Q 75 20 75 35 L 72 78 Q 72 82 50 82 Q 28 82 28 78 Z" fill="#fed7aa" stroke="#18181b" strokeWidth="4" />
            <rect x="42" y="38" width="16" height="14" rx="3" fill="#fde047" stroke="#ca8a04" strokeWidth="2" transform="rotate(-6 50 45)" />
            <circle cx="38" cy="56" r="3" fill="#18181b" />
            <circle cx="62" cy="56" r="3" fill="#18181b" />
            <path d="M 46 62 Q 50 66 54 62" fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
            <circle cx="34" cy="62" r="3" fill="#fca5a5" />
            <circle cx="66" cy="62" r="3" fill="#fca5a5" />
          </svg>
        );

      case 'pulpo-tinta':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="42" r="30" fill="#e9d5ff" stroke="#18181b" strokeWidth="4" />
            <path d="M 28 65 Q 22 80 30 84 Q 38 80 34 68 M 42 68 Q 40 82 48 85 Q 54 80 48 68 M 56 68 Q 62 85 68 82 Q 68 76 62 66 M 68 64 Q 78 76 82 72 Q 80 65 72 62" fill="none" stroke="#18181b" strokeWidth="4" strokeLinecap="round" />
            <circle cx="40" cy="40" r="4" fill="#18181b" />
            <circle cx="60" cy="40" r="4" fill="#18181b" />
            <ellipse cx="50" cy="50" rx="3" ry="5" fill="#18181b" />
          </svg>
        );

      case 'estrella-rock':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M 50 12 L 60 36 L 86 38 L 66 54 L 72 80 L 50 66 L 28 80 L 34 54 L 14 38 L 40 36 Z" fill="#fef08a" stroke="#18181b" strokeWidth="4" strokeLinejoin="round" />
            <path d="M 32 44 L 46 44 L 43 54 L 30 52 Z M 54 44 L 68 44 L 70 52 L 57 54 Z" fill="#18181b" stroke="#18181b" strokeWidth="2" />
            <path d="M 46 47 L 54 47" stroke="#18181b" strokeWidth="3" />
            <path d="M 45 60 Q 50 64 55 60" fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );

      case 'garabato-feliz':
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="35" fill="#fbcfe8" stroke="#18181b" strokeWidth="4" />
            <circle cx="38" cy="44" r="5" fill="#18181b" />
            <circle cx="62" cy="44" r="5" fill="#18181b" />
            <path d="M 38 58 Q 50 74 62 58" fill="none" stroke="#18181b" strokeWidth="4" strokeLinecap="round" />
            <path d="M 28 32 Q 38 28 44 32 M 56 32 Q 62 28 72 32" fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center p-1 rounded-2xl bg-white border-2 border-ink-900 shadow-sketch-sm ${sizeClasses[size]} ${className}`}
    >
      {renderDoodle()}
    </div>
  );
};
