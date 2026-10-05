import { gql } from '@apollo/client';
import { CLASS_FIELDS } from '../fragments/classFields';

export const CREATE_CLASS_MUTATION = gql`
  ${CLASS_FIELDS}
  mutation CreateClass($input: TeacherClassInput!) {
    createClass(input: $input) { ...ClassFields }
  }
`;
