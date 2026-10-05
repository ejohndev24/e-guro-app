import { gql } from '@apollo/client';

export const MOBILE_ME_QUERY = gql`
  query MobileMe {
    me { id role isIndependent }
  }
`;
