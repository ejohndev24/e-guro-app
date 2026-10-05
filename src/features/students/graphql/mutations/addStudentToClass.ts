import { gql } from '@apollo/client';
import { STUDENT_FIELDS } from '../fragments/studentFields';

export const ADD_STUDENT_TO_CLASS_MUTATION = gql`
  ${STUDENT_FIELDS}
  mutation AddStudentToClass($input: AddStudentToClassInput!) {
    addStudentToClass(input: $input) { ...StudentFields }
  }
`;
