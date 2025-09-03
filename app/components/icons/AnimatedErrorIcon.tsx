export const AnimatedErrorIcon = () => {
  return (
    <svg className='w-6 h-6' xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 24 24'>
      <g fill='none' stroke='currentColor' strokeLinecap='round' strokeWidth={2}>
        <path
          strokeDasharray={60}
          strokeDashoffset={60}
          d='M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z'
        >
          <animate fill='freeze' attributeName='stroke-dashoffset' dur='0.5s' values='60;0'></animate>
        </path>
        <path strokeDasharray={8} strokeDashoffset={8} d='M12 12L16 16M12 12L8 8M12 12L8 16M12 12L16 8'>
          <animate fill='freeze' attributeName='stroke-dashoffset' begin='0.6s' dur='0.2s' values='8;0'></animate>
        </path>
      </g>
    </svg>
  );
};
