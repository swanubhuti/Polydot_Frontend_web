import { Switch } from '@headlessui/react'

type Props = {
  enabled: boolean,
  setEnabled: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const SwitchToggle = ({enabled, setEnabled, label, disabled}: Props) => {

  return (
    <Switch
      disabled={disabled}
      checked={enabled}
      onChange={setEnabled}
      className={`${
        enabled ? 'bg-primary-500' : 'bg-gray-300'
      } ${disabled ? 'opacity-50' : ''} relative inline-flex h-6 w-11 items-center rounded-full`}
    >
      <span className="sr-only">{label}</span>
      <span
        className={`${
          enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
        } inline-block h-5 w-5 transform rounded-full bg-white transition`}
      />
    </Switch>
  )
}