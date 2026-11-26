'use client';

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';

/** Captures campaign UTMs and referral codes from URL query params into sessionStorage (cookie-free). */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
