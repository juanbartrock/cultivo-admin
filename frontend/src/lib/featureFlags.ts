type FlagValue = 'true' | 'false' | undefined;

function parseFlag(value: FlagValue, defaultValue: boolean) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
}

export const uiFlags = {
  shell: parseFlag(process.env.NEXT_PUBLIC_UI_REBRAND_SHELL as FlagValue, true),
  sala: parseFlag(process.env.NEXT_PUBLIC_UI_REBRAND_SALA as FlagValue, true),
  carpa: parseFlag(process.env.NEXT_PUBLIC_UI_REBRAND_CARPA as FlagValue, true),
  automations: parseFlag(process.env.NEXT_PUBLIC_UI_REBRAND_AUTOMATIONS as FlagValue, true),
};

