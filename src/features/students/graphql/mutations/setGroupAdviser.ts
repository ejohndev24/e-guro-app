import { gql } from '@apollo/client';

export const SET_GROUP_ADVISER_MUTATION = gql`
  mutation SetGroupAdviser($input: SetGroupAdviserInput!) {
    setGroupAdviser(input: $input) {
      id
      isAdvisory
    }
  }
`;
