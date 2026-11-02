/** Cookie remembering which player voted from this device. */
export const voteCookie = (matchId: number) => `kf_vote_${matchId}`;
