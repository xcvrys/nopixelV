export type InputMode = 'keyboard' | 'touch';

export function detectInputMode(): InputMode {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return 'keyboard';
	}
	return window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
}
