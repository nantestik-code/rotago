import React from 'react';
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
  showIcon?: boolean;
  showText?: boolean;
  interactive?: boolean;
  to?: string;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'default',
  showIcon = true,
  showText = true,
  interactive = true,
  to = '/app',
  className = ''
}) => {
  const sizeClasses = {
    sm: {
      icon: 'h-6 w-6',
      text: 'text-lg',
      container: 'gap-2'
    },
    md: {
      icon: 'h-8 w-8',
      text: 'text-xl',
      container: 'gap-2'
    },
    lg: {
      icon: 'h-10 w-10',
      text: 'text-3xl',
      container: 'gap-3'
    },
    xl: {
      icon: 'h-12 w-12',
      text: 'text-4xl',
      container: 'gap-4'
    }
  };

  const variantClasses = {
    default: {
      icon: 'text-primary',
      text: 'text-primary'
    },
    white: {
      icon: 'text-white',
      text: 'text-white'
    },
    dark: {
      icon: 'text-gray-800',
      text: 'text-gray-800'
    }
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  const logoContent = (
    <div className={`
      flex items-center ${currentSize.container} 
      ${interactive ? 'transition-all duration-300 hover:scale-105 hover:brightness-110 cursor-pointer' : ''}
      ${className}
    `}>
      {showIcon && (
        <div className={`
          ${interactive ? 'transition-transform duration-300 hover:rotate-12' : ''}
        `}>
          <div className="relative">
            <div className={`${size === 'lg' ? 'w-10 h-10' : size === 'xl' ? 'w-12 h-12' : size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg`}>
              <div className={`${size === 'lg' ? 'w-6 h-6' : size === 'xl' ? 'w-7 h-7' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} bg-brand-600 rounded-full flex items-center justify-center`}>
                <div className={`${size === 'lg' ? 'w-2 h-2' : size === 'xl' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'} bg-white rounded-full`}></div>
              </div>
            </div>
            <div className={`absolute -bottom-1 -right-1 ${size === 'lg' ? 'w-4 h-4' : size === 'xl' ? 'w-5 h-5' : size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} bg-yellow-400 rounded transform rotate-45`}></div>
          </div>
        </div>
      )}
      {showText && (
        <span className={`
          font-bold tracking-tight ${currentSize.text}
          ${variant === 'white' ? 'text-white' : 'bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent'}
        `}>
          RotaGo
        </span>
      )}
    </div>
  );

  if (interactive && to) {
    return (
      <Link 
        to={to} 
        className="inline-block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};

export default Logo;
