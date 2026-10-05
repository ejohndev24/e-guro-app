import { gql } from '@apollo/client';
import { STUDENT_FIELDS } from '../fragments/studentFields';

export const STUDENTS_QUERY = gql`
  ${STUDENT_FIELDS}
  query Students($search: String) { students(search: $search) { ...StudentFields } }
`;
