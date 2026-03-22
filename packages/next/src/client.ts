// Client-side NextDog component — injects browser console capture
// Usage: import { NextDogScript } from '@nextdog/next/client'
// Then add <NextDogScript /> to your root layout

import { getBrowserPatchScript } from './browser-patch.js';

export function getNextDogScriptHtml(): string {
  if (process.env.NODE_ENV !== 'development') return '';
  const url = process.env.NEXTDOG_URL ?? 'http://localhost:6789';
  const serviceName = process.env.NEXTDOG_SERVICE_NAME ?? 'nextdog-app';
  return `<script>${getBrowserPatchScript(url, serviceName)}</script>`;
}

// For use with dangerouslySetInnerHTML in a React/Next component
export function getNextDogScript(): { __html: string } | null {
  if (process.env.NODE_ENV !== 'development') return null;
  const url = process.env.NEXTDOG_URL ?? 'http://localhost:6789';
  const serviceName = process.env.NEXTDOG_SERVICE_NAME ?? 'nextdog-app';
  return { __html: getBrowserPatchScript(url, serviceName) };
}
