import * as React from "react"

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

const Table = React.forwardRef((props, ref) => (
  <div className="w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", props.className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef((props, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", props.className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef((props, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", props.className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef((props, ref) => (
  <tfoot
    ref={ref}
    className={cn("bg-gray-900 font-medium text-gray-50", props.className)}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef((props, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-gray-200 transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100",
      props.className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef((props, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0",
      props.className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef((props, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", props.className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef((props, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-gray-500", props.className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}