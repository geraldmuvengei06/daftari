'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn('group/tabs flex gap-2 data-horizontal:flex-col', className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  'rounded-xl p-1 group-data-horizontal/tabs:h-11 data-[variant=line]:rounded-none group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col',
  {
    variants: {
      variant: {
        default: 'bg-muted/60 backdrop-blur-sm',
        line: 'gap-1 bg-transparent',
        pills: 'gap-2 bg-transparent p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Base styles
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring relative inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200',
        // Touch-friendly sizing
        'min-w-[80px] active:scale-[0.98]',
        // Vertical tabs
        'group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start',
        // Focus states
        'focus-visible:ring-[3px] focus-visible:outline-1',
        // Disabled state
        'disabled:pointer-events-none disabled:opacity-50',
        // Icon styles
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        // Default inactive state
        'text-muted-foreground hover:text-foreground hover:bg-muted/50',
        // Default variant active state
        'group-data-[variant=default]/tabs-list:data-active:bg-background group-data-[variant=default]/tabs-list:data-active:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm',
        // Dark mode for default variant
        'dark:group-data-[variant=default]/tabs-list:data-active:border-input dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30',
        // Line variant styles
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent',
        'after:bg-primary after:absolute after:opacity-0 after:transition-all after:duration-200',
        'group-data-horizontal/tabs:after:inset-x-2 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-horizontal/tabs:after:rounded-full',
        'group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5',
        'group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
        // Pills variant styles
        'group-data-[variant=pills]/tabs-list:rounded-full group-data-[variant=pills]/tabs-list:border group-data-[variant=pills]/tabs-list:border-border group-data-[variant=pills]/tabs-list:bg-transparent group-data-[variant=pills]/tabs-list:px-5',
        'group-data-[variant=pills]/tabs-list:data-active:bg-primary group-data-[variant=pills]/tabs-list:data-active:text-primary-foreground group-data-[variant=pills]/tabs-list:data-active:border-primary group-data-[variant=pills]/tabs-list:data-active:shadow-md',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
