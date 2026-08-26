import React from 'react'
import { cn } from '../lib/utils'
// @ts-ignore
import appIcon from '../../../../assets/icon.png'

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number
  showCircle?: boolean
  glow?: boolean
  strokeWidth?: number
}

export function Logo({
  size = 32,
  showCircle = true,
  className,
  glow = false,
  strokeWidth,
  style,
  ...props
}: LogoProps) {
  return (
    <img
      src={appIcon}
      alt="Keystone Logo"
      className={cn(
        "select-none transition-all duration-300 shrink-0 aspect-square object-contain",
        glow && "drop-shadow-[0_0_8px_rgba(139,92,246,0.35)]",
        className
      )}
      style={{ 
        width: size, 
        height: size, 
        minWidth: size, 
        minHeight: size,
        borderRadius: showCircle ? '50%' : '0%',
        ...style 
      }}
      referrerPolicy="no-referrer"
      {...props}
    />
  )
}

