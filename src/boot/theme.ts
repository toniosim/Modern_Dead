// src/boot/theme.ts
import { defineBoot } from '#q-app/wrappers';
import { setCssVar } from 'quasar';

export default defineBoot(({ app }) => {
  // Set primary brand colors
  setCssVar('primary', '#222222');
  setCssVar('secondary', '#444444');
  setCssVar('accent', '#999999');

  // Set status colors
  setCssVar('positive', '#21BA45');
  setCssVar('negative', '#C10015');
  setCssVar('info', '#31CCEC');
  setCssVar('warning', '#F2C037');

  // Set dark mode background and text colors
  setCssVar('dark', '#1a1a1a');
  setCssVar('dark-page', '#1a1a1a');
});
