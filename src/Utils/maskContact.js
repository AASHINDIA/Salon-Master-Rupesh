/**
 * Masks contact info for public listing views.
 * Pattern: first 2 chars visible, rest replaced with '*', original length preserved.
 *   Phone: 9876543210 -> 98********
 *   Email: kumar@gmail.com -> ku*****@gmail.com (domain kept readable)
 */

export const maskPhone = (phone = '') => {
    if (!phone) return '';
    const str = String(phone);
    if (str.length <= 2) return '*'.repeat(str.length);
    return str.slice(0, 2) + '*'.repeat(str.length - 2);
};

export const maskEmail = (email = '') => {
    if (!email || !email.includes('@')) return email || '';
    const [local, domain] = email.split('@');
    if (!local) return email;
    // show first 2 chars, rest as stars, preserve original local length
    // short locals (<=2 chars) still get at least 1 star after the first char
    const visible = local.slice(0, 2);
    const stars = local.length <= 2 ? '*' : '*'.repeat(local.length - 2);
    return `${visible}${stars}@${domain}`;
};
