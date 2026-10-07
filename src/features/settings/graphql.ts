import { gql } from '@apollo/client';

export const MY_SCHOOL_PROFILE_QUERY = gql`
  query MySchoolProfile { mySchoolProfile { name schoolIdNumber region division district address schoolHeadName } }
`;
export const UPDATE_MY_SCHOOL_PROFILE_MUTATION = gql`
  mutation UpdateMySchoolProfile($input: UpdateSchoolProfileInput!) { updateMySchoolProfile(input: $input) { name schoolIdNumber region division district address schoolHeadName } }
`;
