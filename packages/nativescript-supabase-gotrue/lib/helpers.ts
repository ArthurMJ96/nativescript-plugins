import { SupportedStorage } from './types';

export function expiresAt(expiresIn: number) {
	const timeNow = Math.round(Date.now() / 1000);
	return timeNow + expiresIn;
}

export function uuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export const isBrowser = () => true;

export function getParameterByName(name: string, url?: string) {
	if (!url) url = window?.location?.href ?? '';
	// eslint-disable-next-line no-useless-escape
	name = name.replace(/[\[\]]/g, '\\$&');
	const regex = new RegExp('[?&#]' + name + '(=([^&#]*)|&|#|$)'),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

type Fetch = typeof fetch;

export const resolveFetch = (customFetch?: Fetch): Fetch => {
	let _fetch: Fetch;
	if (customFetch) {
		_fetch = customFetch;
	} else {
		_fetch = fetch;
	}
	return _fetch;
};

export const looksLikeFetchResponse = (maybeResponse: unknown): maybeResponse is Response => {
	return typeof maybeResponse === 'object' && maybeResponse !== null && 'status' in maybeResponse && 'ok' in maybeResponse && 'json' in maybeResponse && typeof (maybeResponse as any).json === 'function';
};

// Storage helpers
export const setItemAsync = async (storage: SupportedStorage, key: string, data: any): Promise<void> => {
	await storage.setItem(key, JSON.stringify(data));
};

export const getItemAsync = async (storage: SupportedStorage, key: string): Promise<unknown> => {
	const value = await storage.getItem(key);

	if (!value) {
		return null;
	}

	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
};

export const removeItemAsync = async (storage: SupportedStorage, key: string): Promise<void> => {
	await storage.removeItem(key);
};

export function decodeBase64URL(value: string): string {
	const key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
	let base64 = '';
	let chr1, chr2, chr3;
	let enc1, enc2, enc3, enc4;
	let i = 0;
	value = value.replace('-', '+').replace('_', '/');

	while (i < value.length) {
		enc1 = key.indexOf(value.charAt(i++));
		enc2 = key.indexOf(value.charAt(i++));
		enc3 = key.indexOf(value.charAt(i++));
		enc4 = key.indexOf(value.charAt(i++));
		chr1 = (enc1 << 2) | (enc2 >> 4);
		chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		chr3 = ((enc3 & 3) << 6) | enc4;
		base64 = base64 + String.fromCharCode(chr1);

		if (enc3 != 64 && chr2 != 0) {
			base64 = base64 + String.fromCharCode(chr2);
		}
		if (enc4 != 64 && chr3 != 0) {
			base64 = base64 + String.fromCharCode(chr3);
		}
	}
	return base64;
}

/**
 * A deferred represents some asynchronous work that is not yet finished, which
 * may or may not culminate in a value.
 * Taken from: https://github.com/mike-north/types/blob/master/src/async.ts
 */
export class Deferred<T = any> {
	public static promiseConstructor: PromiseConstructor = Promise;

	public readonly promise!: PromiseLike<T>;

	public readonly resolve!: (value?: T | PromiseLike<T>) => void;

	public readonly reject!: (reason?: any) => any;

	public constructor() {
		// eslint-disable-next-line @typescript-eslint/no-extra-semi
		(this as any).promise = new Deferred.promiseConstructor((res, rej) => {
			// eslint-disable-next-line @typescript-eslint/no-extra-semi
			(this as any).resolve = res;
			// eslint-disable-next-line @typescript-eslint/no-extra-semi
			(this as any).reject = rej;
		});
	}
}

// Taken from: https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library
export function decodeJWTPayload(token: string) {
	// Regex checks for base64url format
	const base64UrlRegex = /^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}=?$|[a-z0-9_-]{2}(==)?$)$/i;

	const parts = token.split('.');

	if (parts.length !== 3) {
		throw new Error('JWT is not valid: not a JWT structure');
	}

	if (!base64UrlRegex.test(parts[1])) {
		throw new Error('JWT is not valid: payload is not in base64url format');
	}

	const base64Url = parts[1];
	return JSON.parse(decodeBase64URL(base64Url));
}

/**
 * Creates a promise that resolves to null after some time.
 */
export function sleep(time: number): Promise<null> {
	return new Promise((accept) => {
		setTimeout(() => accept(null), time);
	});
}

/**
 * Converts the provided async function into a retryable function. Each result
 * or thrown error is sent to the isRetryable function which should return true
 * if the function should run again.
 */
export function retryable<T>(fn: (attempt: number) => Promise<T>, isRetryable: (attempt: number, error: any | null, result?: T) => boolean): Promise<T> {
	const promise = new Promise<T>((accept, reject) => {
		// eslint-disable-next-line @typescript-eslint/no-extra-semi
		(async () => {
			for (let attempt = 0; attempt < Infinity; attempt++) {
				try {
					const result = await fn(attempt);

					if (!isRetryable(attempt, null, result)) {
						accept(result);
						return;
					}
				} catch (e: any) {
					if (!isRetryable(attempt, e)) {
						reject(e);
						return;
					}
				}
			}
		})();
	});

	return promise;
}

function dec2hex(dec: number) {
	return ('0' + dec.toString(16)).substr(-2);
}

// Functions below taken from: https://stackoverflow.com/questions/63309409/creating-a-code-verifier-and-challenge-for-pkce-auth-on-spotify-api-in-reactjs
export function generatePKCEVerifier() {
	const verifierLength = 56;
	const array = new Uint32Array(verifierLength);
	if (typeof crypto === 'undefined') {
		throw new Error('PKCE is not supported on devices without WebCrypto API support, please add polyfills');
	}
	crypto.getRandomValues(array);
	return Array.from(array, dec2hex).join('');
}

async function sha256(randomString: string) {
	const encoder = new TextEncoder();
	const encodedData = encoder.encode(randomString);
	if (typeof crypto === 'undefined') {
		throw new Error('PKCE is not supported on devices without WebCrypto API support, please add polyfills');
	}
	const hash = await crypto.subtle.digest('SHA-256', encodedData);
	const bytes = new Uint8Array(hash);

	return Array.from(bytes)
		.map((c) => String.fromCharCode(c))
		.join('');
}

function base64urlencode(str: string) {
	return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function generatePKCEChallenge(verifier: string) {
	const hashed = await sha256(verifier);
	return base64urlencode(hashed);
}
