export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

export function sanitizeLaundromatName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-&'.\(\)]/g, '').trim().slice(0, 50);
}

export function sanitizeAddress(address: string): string {
  return sanitizeText(address).slice(0, 200);
}

export function sanitizeNotes(notes: string): string {
  return sanitizeText(notes).slice(0, 500);
}

export function sanitizeMachineLabel(label: string): string {
  return sanitizeText(label).slice(0, 20);
}

export function sanitizeCustomerName(name: string): string {
  return sanitizeText(name).slice(0, 60);
}
