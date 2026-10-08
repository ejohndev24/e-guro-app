/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws  and international treaties, and it
 * or any part thereof, may not be copied,  reproduced, utilized, distributed
 * or an adaptation thereof be made,  without the prior authority and consent
 * of PharmaServ Express.  Any unauthorized use of this program will be dealt
 * with and  prosecuted to the maximum extent possible under  the law and may
 * result in civil and criminal liabilities.
 */
type GraphQlError = {
  message?: string;
  extensions?: { originalError?: { message?: string | string[] } };
};

export const getErrorMessage = (
  error: unknown,
  fallback = "Please try again.",
) => {
  if (typeof error !== "object" || error === null) return fallback;
  const candidate = error as {
    graphQLErrors?: GraphQlError[];
    message?: string;
  };
  const graphQlError = candidate.graphQLErrors?.[0];
  const serverMessage = graphQlError?.extensions?.originalError?.message;
  if (Array.isArray(serverMessage)) return serverMessage.join(", ");
  return (
    serverMessage ?? graphQlError?.message ?? candidate.message ?? fallback
  );
};
