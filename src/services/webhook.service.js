import { linkUserByEmail } from './participant.service.js';

export const handleClerkEvent = async (event) => {
    if (event.type !== 'user.created') return;
    const emails = event.data.email_addresses
        .filter((address) => address.verification?.status === 'verified')
        .map((address) => address.email_address);
    await Promise.all(emails.map((email) => linkUserByEmail(email, event.data.id)));
};
