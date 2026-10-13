import { writeFileSync } from 'node:fs';
import { tokensCss } from './src/css';

writeFileSync(new URL('./tokens.css', import.meta.url), tokensCss());
console.log('tokens.css written');
