import * as React from "react"

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

const buttonVariants = ({ variant = "default", size = "default", className }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 active:scale-95"
  
  const variants = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md shadow-sm",
    destructive: "bg-red-600 text-white hover:bg-red-700 hover:shadow-md shadow-sm",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-900 shadow-sm",
    ghost: "hover:bg-gray-100 hover:shadow-sm text-gray-900",
    link: "text-indigo-600 underline-offset-4 hover:underline hover:text-indigo-700",
  }
  
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  }
  
  return cn(baseStyles, variants[variant], sizes[size], className)
}

const Button = React.forwardRef((props, ref) => {
    if (!props) return null;
    const { className, variant = "default", size = "default", asChild = false, ...otherProps } = props

    const classes = buttonVariants({ variant, size, className })

    if (asChild && props.children && React.isValidElement(props.children)) {
      return React.cloneElement(props.children, { className: classes, ref })
    }

    return <button ref={ref} className={classes} {...otherProps} />
  })

Button.displayName = "Button"

export { Button, buttonVariants }