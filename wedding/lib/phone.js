/** Returns digits in international form, assuming Egypt for local 01x numbers, or null. */
export function normalizePhone(value) {
  let digits = String(value ?? '').replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^01\d{9}$/.test(digits)) digits = `2${digits}`;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

export const isPhone = (contact) => /^\d{8,15}$/.test(contact);

export const whatsappUrl = (digits, text) => `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
