export const NAV_ITEMS = [
  { name: 'Herd', type: 'herd', path: '/herd', id: 'herduuid' },
  { name: 'Cows', type: 'cows', path: '', hideMobile: true },
  { name: 'Events', type: 'events', path: '/events', id: 'herduuid' },
  { name: 'Calendar', type: 'calendar', path: '/calendar', id: 'herduuid' },
  { name: 'Bulls', type: 'bulls', path: '/bulls' },
  { name: 'Production', type: 'production', hideMobile: true },
  { name: 'Drugs', type: 'drugs', path: '/drugs', id: 'herduuid' },
  { name: 'Summary', type: 'summary', path: `/summary/personal/view`, hideTablet: true },
  { name: 'Enterprise', type: 'enterprise', path: '/enterprise', id: 'herduuid', hideTablet: true, enterprise: true },
  { name: 'Draft', type: 'drafts', path: '/drafts', easyDraft: true }
];
