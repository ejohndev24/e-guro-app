import { gql } from '@apollo/client';

export const STUDENT_FIELDS = gql`
  fragment StudentFields on Student { id studentNo firstName lastName fullName email lrn birthDate sex }
`;
