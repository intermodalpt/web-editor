export const apiServer = 'https://api.intermodal.pt';

export const osrmServer = 'https://router.intermodal.pt';

export const tileStyle = 'https://tiles2.intermodal.pt/styles/iml/style.json';

const minute = 1000 * 60;
export const cacheRefreshTime = minute * 60; // 1 hour
export const cacheInvalidationTime = minute * 60 * 6; // 6 hours