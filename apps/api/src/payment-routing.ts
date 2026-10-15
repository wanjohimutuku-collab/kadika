import type { Country } from '@harusi/schemas/country';
import type { PaymentProvider } from '@harusi/payments';
import type { Deps } from './context';

/**
 * The mobile-money provider for an event's country (ADR 027). Tanzania uses `deps.payments` as before;
 * any other country needs its own entry in `deps.paymentsByCountry` and has no payments without it.
 */
export function paymentsFor(
  deps: Pick<Deps, 'payments' | 'paymentsByCountry'>,
  country: Country,
): PaymentProvider | undefined {
  if (country === 'TZ') return deps.paymentsByCountry?.TZ ?? deps.payments;
  return deps.paymentsByCountry?.[country];
}

/** Every configured provider, to find one by the name stored on a payment row. */
export function allPaymentProviders(
  deps: Pick<Deps, 'payments' | 'paymentsByCountry'>,
): PaymentProvider[] {
  return [deps.payments, ...Object.values(deps.paymentsByCountry ?? {})].filter(
    (p): p is PaymentProvider => !!p,
  );
}
