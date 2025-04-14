// src/boot/theme.ts
import { defineBoot } from '#q-app/wrappers';
import { setCssVar } from 'quasar';

export default defineBoot(({ app }) => {
  // Set primary brand colors with dark green as primary
  setCssVar('primary', '#223322');    // Dark green
  setCssVar('secondary', '#334433');  // Slightly lighter green
  setCssVar('accent', '#97b897');     // Muted green accent

  // Set status colors
  setCssVar('positive', '#21BA45');
  setCssVar('negative', '#C10015');
  setCssVar('info', '#31CCEC');
  setCssVar('warning', '#F2C037');

  // Set dark mode background and text colors
  setCssVar('dark', '#223322');      // Dark green
  setCssVar('dark-page', '#223322'); // Dark green
});
