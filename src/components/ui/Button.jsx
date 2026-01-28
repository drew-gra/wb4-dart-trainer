import React from 'react';

/**
 * Reusable button component with consistent styling
 */
export const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'default',
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseStyles = "font-black rounded-lg transition-all transform shadow-lg border-2";
  
  const variants = {
    default: "text-white border-gray-600 hover:scale-105",
    success: "bg-green-600 text-white border-green-400 hover:scale-105",
    danger: "bg-red-600 text-white border-red-500 hover:scale-105",
    gold: "text-black border-yellow-400",
    ghost: "bg-transparent text-gray-400 border-gray-700 hover:text-gray-200"
  };
  
  const sizes = {
    sm: "py-2 px-3 text-xs",
    md: "py-3 px-4 text-sm",
    lg: "py-4 px-6 text-base"
  };
  
  const disabledStyles = disabled 
    ? "opacity-50 cursor-not-allowed" 
    : "cursor-pointer";
  
  const bgStyle = variant === 'default' || variant === 'ghost'
    ? { background: 'linear-gradient(145deg, #374151, #1f2937)' }
    : variant === 'gold'
    ? { background: 'linear-gradient(45deg, #ffd700, #ffed4a)' }
    : {};

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
      style={bgStyle}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Icon button for action buttons with emoji + label
 */
export const ActionButton = ({ icon, label, onClick, disabled }) => (
  <Button 
    onClick={onClick} 
    disabled={disabled}
    className="flex flex-col items-center justify-center"
  >
    <div className="text-lg mb-1">{icon}</div>
    <div className="text-xs font-bold">{label}</div>
  </Button>
);
