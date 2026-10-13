import type { Preview } from '@storybook/react';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'ivory',
      values: [
        { name: 'ivory', value: '#FBF8F3' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
    viewport: {
      viewports: {
        phone: { name: 'Phone 360×640', styles: { width: '360px', height: '640px' } },
        phone412: { name: 'Phone 412×915', styles: { width: '412px', height: '915px' } },
        laptop: { name: 'Laptop 1280×800', styles: { width: '1280px', height: '800px' } },
      },
      defaultViewport: 'phone',
    },
    a11y: { test: 'error' },
  },
};

export default preview;
