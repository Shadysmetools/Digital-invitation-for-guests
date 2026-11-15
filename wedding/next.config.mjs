import { existsSync } from 'node:fs';

// The couple's own venue photo. Drop it at public/venue.jpg and redeploy; without it nothing is shown.
const venuePhoto = existsSync(new URL('./public/venue.jpg', import.meta.url)) ? '/venue.jpg' : '';

export default { poweredByHeader: false, env: { NEXT_PUBLIC_VENUE_PHOTO: venuePhoto } };
