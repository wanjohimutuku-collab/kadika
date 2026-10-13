import { createSeedState, sampleCardToken } from '@harusi/api-client/mock';

// Prints a valid guest-card token from today's deterministic mock seed (used by Lighthouse CI).
console.log(sampleCardToken(createSeedState(), 'delivered'));
