import { HTMLMotionProps, motion } from 'motion/react'

interface SkeletonProps extends HTMLMotionProps<'div'> {
  variant?: 'text' | 'card' | 'list-item'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  let defaultClasses = 'rounded-lg bg-zinc-800/60 animate-pulse'

  if (variant === 'text') {
    defaultClasses += ' h-4 w-3/4'
  } else if (variant === 'card') {
    defaultClasses += ' h-32 w-full'
  } else if (variant === 'list-item') {
    defaultClasses += ' h-12 w-full'
  }

  const customStyle: any = {
    ...style,
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  }

  return (
    <motion.div
      className={`${defaultClasses} ${className || ''}`}
      style={customStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      {...props}
    />
  )
}
