import { gql } from '@apollo/client';
import { STUDENT_FIELDS } from '../fragments/studentFields';

export const SAVE_TEACHER_STUDENT_MUTATION = gql`
  ${STUDENT_FIELDS}
  mutation SaveTeacherStudent($input: TeacherStudentInput!) {
    saveTeacherStudent(input: $input) { ...StudentFields }
  }
`;

export const IMPORT_TEACHER_STUDENTS_MUTATION = gql`
  mutation ImportTeacherStudents($inputs: [TeacherStudentInput!]!) {
    importTeacherStudents(inputs: $inputs) { count }
  }
`;
