type GraphQlError = {
  message?: string;
  extensions?: { originalError?: { message?: string | string[] } };
};

export const getErrorMessage = (error: unknown, fallback = 'Please try again.') => {
  if (typeof error !== 'object' || error === null) return fallback;
  const candidate = error as { graphQLErrors?: GraphQlError[]; message?: string };
  const graphQlError = candidate.graphQLErrors?.[0];
  const serverMessage = graphQlError?.extensions?.originalError?.message;
  if (Array.isArray(serverMessage)) return serverMessage.join(', ');
  return serverMessage ?? graphQlError?.message ?? candidate.message ?? fallback;
};
