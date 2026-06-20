import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

const Tabs = TabsPrimitive.Root

// Segmented-control styling: a clearly-bordered slate track holds the triggers,
// so each inactive trigger reads as a distinct, clickable segment (rather than
// bare text) and the active one lifts out as a white pill with navy text.
const TabsList = React.forwardRef((props, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-slate-500 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]",
      props.className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef((props, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 ring-offset-white transition-all hover:bg-white/70 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-navy-800 data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-900/5",
      props.className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef((props, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
      props.className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }