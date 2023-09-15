import { TRPCLink, httpBatchLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import { AppRouter } from '../pages/api/trpc/[trpc]';
import { observable } from '@trpc/server/observable';

export const VIRTUAL_HOST = process.env.VIRTUAL_HOST

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // In the browser, we return a relative URL
    return '';
  }
  // When rendering on the server, we return an absolute URL

  // reference for vercel.com
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // assume localhost
  return `https://${VIRTUAL_HOST}`;
}

export const customLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          const response = value?.context?.response as { headers?: Headers }
          const accessToken = response?.headers?.get?.('Access-Token')
          const sessionToken = response?.headers?.get?.('Session-Token')
          if (sessionToken) {
            localStorage.setItem('Session-Token', sessionToken)
          }
          const localAccessToken = localStorage.getItem('Access-Token')
          if (!localAccessToken && accessToken) {
            localStorage.setItem('Access-Token', accessToken)
          } else if (localAccessToken && accessToken && localAccessToken !== accessToken) {
            localStorage.setItem('Access-Token', accessToken)
          } else if (!accessToken && localAccessToken) {
            localStorage.removeItem('Access-Token')
            window.location.reload()
          }
          observer.next(value);
        },
        error(err) {
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

const getDigitsFromValue = (value = "") =>
  value.replace(/(-(?!\d))|[^0-9|-]/g, "") || ""

const padDigits = (digits: string) => {
  const desiredLength = 3
  const actualLength = digits.length

  if (actualLength >= desiredLength) {
    return digits
  }

  const amountToAdd = desiredLength - actualLength
  const padding = "0".repeat(amountToAdd)

  return padding + digits
}

const removeLeadingZeros = (number: string) =>
  number.replace(/^0+([0-9]+)/, "$1")

const addDecimalToNumber = (number: string, separator = ".") => {
  const centsStartingPosition = number.length - 2
  const dollars = removeLeadingZeros(number.substring(0, centsStartingPosition))
  const cents = number.substring(centsStartingPosition)
  return dollars + separator + cents
}

export const toCurrency = (value: string, separator = ".") => {
  const digits = getDigitsFromValue(value)
  const digitsWithPadding = padDigits(digits)
  return addDecimalToNumber(digitsWithPadding, separator)
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        customLink,
        httpBatchLink({
          url: getBaseUrl() + '/api/trpc',
          headers: () => {
            return ({
              'Authorization': window.localStorage.getItem('Access-Token') || "",
              'Session-Token': window.localStorage.getItem('Session-Token') || ''
            })
          }
        }),
      ],
    };
  },
  ssr: false,
});
