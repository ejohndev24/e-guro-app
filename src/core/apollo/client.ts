/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws  and international treaties, and it
 * or any part thereof, may not be copied,  reproduced, utilized, distributed
 * or an adaptation thereof be made,  without the prior authority and consent
 * of PharmaServ Express.  Any unauthorized use of this program will be dealt
 * with and  prosecuted to the maximum extent possible under  the law and may
 * result in civil and criminal liabilities.
 */
import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const developmentUrl = Platform.select({
  android: "http://10.0.2.2:4000/graphql",
  default: "http://localhost:4000/graphql",
});

export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? developmentUrl;

export const apolloClient = new ApolloClient({
  link: from([
    setContext(async (_, { headers }) => {
      const token = await SecureStore.getItemAsync("teacher-hub-token");
      return {
        headers: { ...headers, authorization: token ? `Bearer ${token}` : "" },
      };
    }),
    new HttpLink({ uri: apiUrl }),
  ]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          dashboard: { merge: false },
          classDetail: { merge: false },
          students: { merge: false },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
    },
    mutate: { errorPolicy: "all" },
  },
});
