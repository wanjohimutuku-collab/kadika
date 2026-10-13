/** Triggers a browser download for a Blob (CSV/PDF/ICS exports). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Guests picked on the Wageni page, handed to the Tuma page. */
export const SELECTED_GUESTS_KEY = 'harusi.send.selected';
