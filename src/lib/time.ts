export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const readableDuration = (milliseconds: number) => {
	if (milliseconds < MINUTE) {
		return 'less than a minute';
	}
	if (milliseconds < HOUR) {
		const count = Math.round(milliseconds / MINUTE);
		return count + (count === 1 ? ' minute' : ' minutes');
	}
	if (milliseconds < DAY) {
		const count = Math.round(milliseconds / HOUR);
		return count + (count === 1 ? ' hour' : ' hours');
	}
	const count = Math.round(milliseconds / DAY);
	return count + (count === 1 ? ' day' : ' days');
};
