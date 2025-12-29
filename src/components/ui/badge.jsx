import * as React from "react"

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

const Badge = React.forwardRef((props, ref) => {
  const { className, variant = "default", ...otherProps } = props
  
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "text-gray-900 border border-gray-300",
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...otherProps}
    />
  )
})

Badge.displayName = "Badge"

export { Badge }