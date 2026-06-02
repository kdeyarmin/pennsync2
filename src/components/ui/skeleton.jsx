import * as React from "react"

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

const Skeleton = React.forwardRef((props, ref) => {
  const { className, ...otherProps } = props
  
  return (
    <div
      ref={ref}
      className={cn("animate-pulse rounded-md bg-slate-200", className)}
      {...otherProps}
    />
  )
})

Skeleton.displayName = "Skeleton"

export { Skeleton }