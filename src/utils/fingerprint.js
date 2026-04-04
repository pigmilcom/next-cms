// utils/fingerprint.js
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export default async function Fingerprint() {
    const fp = await FingerprintJS.load();

    const { visitorId } = await fp.get();

    return visitorId;
}
