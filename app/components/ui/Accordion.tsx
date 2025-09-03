import { useEffect, useState, useRef, type ForwardRefRenderFunction, forwardRef, type PropsWithChildren, useImperativeHandle } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";

type Props = {
  children: string | JSX.Element | JSX.Element[],
  title: string | JSX.Element,
  expanded: boolean,
  setExpand: () => void
}

export type AccordionRef = {
  recalcHeight: () => void
}

const Accordion: ForwardRefRenderFunction<
AccordionRef,
PropsWithChildren<Props>
> = ((props, ref) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  useEffect(() => {
    setHeight(panelRef.current?.scrollHeight ?? 0)
  }, [])
  useImperativeHandle(ref, () => ({
    recalcHeight() {
      setHeight(panelRef.current?.scrollHeight ?? 0)
    }
  }))
  return (
    <>
      <div className="bg-gray-100 border-b border-b-gray-300">
        <button type="button" className="px-4 py-5 flex justify-between w-full items-center" onClick={props.setExpand}>
          <h2 className="text-2xl text-left">{props.title}</h2>
          <span className="text-gray-800">{props.expanded ? <FaChevronUp /> : <FaChevronDown />}</span>
        </button>
      </div>
      <div ref={panelRef} className="transition-all duration-500 overflow-hidden" style={{maxHeight: props.expanded ? height : 0}}>
        {props.children}
      </div>
    </>
  );
})
// Accordion.displayName = "Accordion"

export default forwardRef(Accordion);
