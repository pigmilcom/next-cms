'use client';

import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { type DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    captionLayout = 'label',
    buttonVariant = 'ghost',
    formatters,
    components,
    ...props
}: React.ComponentProps<typeof DayPicker> & {
    buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
    const defaultClassNames = getDefaultClassNames();

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn(
                'bg-background group/calendar p-2 sm:p-3 [--cell-size:2rem] sm:[--cell-size:2.5rem] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent',
                String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
                String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
                className
            )}
            captionLayout={captionLayout}
            formatters={{
                formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
                ...formatters
            }}
            classNames={{
                root: cn('w-full sm:w-fit', defaultClassNames.root),
                months: cn('flex gap-2 sm:gap-4 flex-col relative w-full', defaultClassNames.months),
                month: cn('flex flex-col w-full gap-3 sm:gap-4', defaultClassNames.month),
                nav: cn(
                    'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between z-10',
                    defaultClassNames.nav
                ),
                button_previous: cn(
                    buttonVariants({ variant: buttonVariant }),
                    'h-7 w-7 sm:h-8 sm:w-8 aria-disabled:opacity-50 p-0 select-none',
                    defaultClassNames.button_previous
                ),
                button_next: cn(
                    buttonVariants({ variant: buttonVariant }),
                    'h-7 w-7 sm:h-8 sm:w-8 aria-disabled:opacity-50 p-0 select-none',
                    defaultClassNames.button_next
                ),
                month_caption: cn(
                    'flex items-center justify-center h-8 sm:h-10 w-full px-8 sm:px-10',
                    defaultClassNames.month_caption
                ),
                dropdowns: cn(
                    'w-full flex items-center text-xs sm:text-sm font-medium justify-center h-8 sm:h-10 gap-1 sm:gap-1.5',
                    defaultClassNames.dropdowns
                ),
                dropdown_root: cn(
                    'relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md text-xs sm:text-sm',
                    defaultClassNames.dropdown_root
                ),
                dropdown: cn('absolute bg-popover inset-0 opacity-0', defaultClassNames.dropdown),
                caption_label: cn(
                    'select-none font-medium',
                    captionLayout === 'label'
                        ? 'text-xs sm:text-sm'
                        : 'rounded-md pl-1.5 sm:pl-2 pr-1 flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm h-7 sm:h-8 [&>svg]:text-muted-foreground [&>svg]:size-3 sm:[&>svg]:size-3.5',
                    defaultClassNames.caption_label
                ),
                table: 'w-full border-collapse',
                weekdays: cn('flex', defaultClassNames.weekdays),
                weekday: cn(
                    'text-muted-foreground rounded-md flex-1 font-normal text-[0.65rem] sm:text-[0.8rem] select-none',
                    defaultClassNames.weekday
                ),
                week: cn('flex w-full mt-1 sm:mt-2', defaultClassNames.week),
                week_number_header: cn('select-none w-8 sm:w-10', defaultClassNames.week_number_header),
                week_number: cn(
                    'text-[0.65rem] sm:text-[0.8rem] select-none text-muted-foreground',
                    defaultClassNames.week_number
                ),
                day: cn(
                    'relative w-full h-full p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
                    props.showWeekNumber
                        ? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-md'
                        : '[&:first-child[data-selected=true]_button]:rounded-l-md',
                    defaultClassNames.day
                ),
                range_start: cn('rounded-l-md bg-accent', defaultClassNames.range_start),
                range_middle: cn('rounded-none', defaultClassNames.range_middle),
                range_end: cn('rounded-r-md bg-accent', defaultClassNames.range_end),
                today: cn(
                    'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none font-semibold',
                    defaultClassNames.today
                ),
                outside: cn('text-muted-foreground/40 aria-selected:text-muted-foreground', defaultClassNames.outside),
                disabled: cn('text-muted-foreground opacity-30', defaultClassNames.disabled),
                hidden: cn('invisible', defaultClassNames.hidden),
                ...classNames
            }}
            components={{
                Root: ({ className, rootRef, ...props }) => {
                    return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
                },
                Chevron: ({ className, orientation, ...props }) => {
                    if (orientation === 'left') {
                        return <ChevronLeftIcon className={cn('size-4', className)} {...props} />;
                    }

                    if (orientation === 'right') {
                        return <ChevronRightIcon className={cn('size-4', className)} {...props} />;
                    }

                    return <ChevronDownIcon className={cn('size-4', className)} {...props} />;
                },
                DayButton: CalendarDayButton,
                WeekNumber: ({ children, ...props }) => {
                    return (
                        <td {...props}>
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center text-center">
                                {children}
                            </div>
                        </td>
                    );
                },
                ...components
            }}
            {...props}
        />
    );
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
    const defaultClassNames = getDefaultClassNames();

    const ref = React.useRef<HTMLButtonElement>(null);
    React.useEffect(() => {
        if (modifiers.focused) ref.current?.focus();
    }, [modifiers.focused]);

    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            data-day={day.date.toLocaleDateString()}
            data-selected-single={
                modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
            }
            data-range-start={modifiers.range_start}
            data-range-end={modifiers.range_end}
            data-range-middle={modifiers.range_middle}
            className={cn(
                'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-h-8 min-w-8 sm:min-h-10 sm:min-w-10 flex-col gap-0.5 sm:gap-1 leading-none text-xs sm:text-sm font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-[0.65rem] sm:[&>span]:text-xs [&>span]:opacity-70',
                defaultClassNames.day,
                className
            )}
            {...props}
        />
    );
}

export { Calendar, CalendarDayButton };
