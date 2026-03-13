import * as React from "react"

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

const Card = React.forwardRef((props, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300", props.className)}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef((props, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", props.className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef((props, ref) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight", props.className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef((props, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500", props.className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef((props, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", props.className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef((props, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", props.className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }