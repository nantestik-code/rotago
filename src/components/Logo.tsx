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
          <Truck className={`${currentSize.icon} ${currentVariant.icon}`} />
        </div>
      )}
      {showText && (
        <span className={`
          font-bold ${currentSize.text} ${currentVariant.text}
          ${interactive ? 'transition-all duration-300' : ''}
        `}>
          RotaFácil
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
