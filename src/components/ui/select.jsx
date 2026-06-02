import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef((props, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
      props.className
    )}
    {...props}
  >
    <span className="flex-1 text-left">{props.children}</span>
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef((props, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-[9999] max-h-96 min-w-[8rem] overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-900 shadow-xl animate-in fade-in-80",
        props.className
      )}
      position={props.position || "popper"}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1 bg-white">
        {props.children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef((props, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", props.className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef((props, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-md py-2.5 pl-8 pr-2 text-sm bg-white text-slate-900 outline-none focus:bg-blue-50 focus:text-blue-900 hover:bg-slate-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors",
      props.className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-blue-600" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{props.children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef((props, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-slate-100", props.className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}