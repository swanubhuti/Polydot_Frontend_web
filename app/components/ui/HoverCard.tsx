import * as RadixHoverCard from '@radix-ui/react-hover-card';
import { cn } from '~/lib/utils';

function Content({ className, children, ...props }: RadixHoverCard.HoverCardContentProps) {
  return (
    <RadixHoverCard.Portal>
      <RadixHoverCard.Content
        className={cn(
          'data-[side=bottom]:animate-slideUpAndFade data-[side=right]:animate-slideLeftAndFade data-[side=left]:animate-slideRightAndFade data-[side=top]:animate-slideDownAndFade bg-white shadow-[hsl(206_22%_7%_/_20%)_0px_0px_4px_0px,hsl(206_22%_7%_/_30%)_0px_8px_25px_-10px] data-[state=open]:transition-all',
          className
        )}
        {...props}
      >
        {children}
        <RadixHoverCard.Arrow className='fill-white' />
      </RadixHoverCard.Content>
    </RadixHoverCard.Portal>
  );
}

export const HoverCard = ({ children, ...props }: RadixHoverCard.HoverCardProps) => (
  <RadixHoverCard.Root {...props}>{children}</RadixHoverCard.Root>
);

HoverCard.Trigger = RadixHoverCard.Trigger;
HoverCard.Content = Content;

export default HoverCard;
