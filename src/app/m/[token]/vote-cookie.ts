/** Cookie remembering which player voted from this device. */
export const voteCookie = (matchId: number) => `kf_vote_${matchId}`;
/** Cookie remembering who answered "are you playing?" from this device. */
export const rsvpCookie = (matchId: number) => `kf_rsvp_${matchId}`;
/** Cookie remembering who uses this device, so next week's reply is one tap. */
export const ME_COOKIE = "kf_me";
