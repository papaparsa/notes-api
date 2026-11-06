import moment from 'moment';

export const formatDateSmall = (d) => moment(String(d)).format('YYYY-MM-DD HH:mm');
export const formatDateLarge = (d) => moment(String(d)).format('ddd YYYY-MM-DD HH:mm');
export const formatDateShort = (d) => moment(String(d)).format('ddd MMM D');
export const formatYMD = (d) => moment(d).format('YYYY-MM-DD');
export const formatLocale = (d) => (d ? new Date(d).toLocaleString() : '');
