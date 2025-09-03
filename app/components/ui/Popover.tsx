import React from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import { cn } from '~/lib/utils';
import { IoClose } from 'react-icons/io5';

const Popover = ({
  children,
  open,
  onOpenChange,
}: {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) => (
  <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
    {children}
  </RadixPopover.Root>
);

const Content = ({
  children,
  className,
  sideOffset = 2,
  ...props
}: RadixPopover.PopoverContentProps) => {
  return (
    <RadixPopover.Content
    {...props}
    sideOffset={sideOffset}
      className={cn('rounded p-5 w-[260px] bg-white shadow-[0_0_2px_0px_rgba(0,0,0,0.3),0_2px_8px_1px_rgba(0,0,0,0.1)] z-30', className)}
    >
      {children}
    </RadixPopover.Content>
  );
};

const CloseButton = ({ className, ...props }: RadixPopover.PopoverCloseProps) => {
  return (
    <RadixPopover.Close
      className={cn(
        'rounded-full h-[25px] w-[25px] inline-flex items-center justify-center text-grey-600 absolute top-4 right-4 hover:bg-sky-50 focus:shadow-[0_0_1px_1px_rgba(0,0,0,0.1)] outline-none cursor-default',
        className
      )}
      aria-label='Close'
      {...props}
    >
      <IoClose className='w-5 h-5' />
    </RadixPopover.Close>
  );
};

Popover.Trigger = RadixPopover.Trigger;
Popover.Anchor = RadixPopover.Anchor;
Popover.Content = Content;
Popover.CloseButton = CloseButton;
Popover.Close = RadixPopover.Close;

Popover.displayName = 'Popover';
export default Popover;
