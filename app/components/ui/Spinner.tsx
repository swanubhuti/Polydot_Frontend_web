import { useNavigation } from '@remix-run/react';
import { NavIcons } from './Navbar';

const spinnerSize = "w-16 h-16";
const iconCycle = ["herd","calendar","bulls","drugs","herd"];

const Spinner = (props: {active?: boolean, inline?: boolean}) => {
  const navigation = useNavigation()
  const active = navigation.state !== "idle" || props.active
  if (!active) return <></>
  return (
    <div role="progressbar" className={`${props.inline ? 'absolute inset-0' : 'w-screen h-screen fixed top-0 left-0'}  backdrop-blur-sm bg-white/50 z-50 flex justify-center items-center`}>
      <div className={`${spinnerSize} rounded-full bg-primary-500 overflow-hidden`}>
        <div className="flex flex-nowrap spinner">
        {iconCycle.map((ic, idx) => (
          <div key={`iconcycle-${idx}`} className={`flex flex-shrink-0 ${spinnerSize} justify-center items-center`}>
            <NavIcons type={ic} classes="fill-secondary-500" />
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

export default Spinner;
