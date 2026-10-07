import { gql } from '@apollo/client';
import { STUDENT_FIELDS } from '../fragments/studentFields';
import { CLASS_FIELDS } from '@/features/classes/graphql/fragments/classFields';

export const CREATE_STUDENT_GROUP_MUTATION = gql`
  ${STUDENT_FIELDS}
  ${CLASS_FIELDS}
  mutation CreateStudentGroup($input: CreateStudentGroupInput!) {
    createStudentGroup(input: $input) {
      id gradeLevel section schoolYear term educationLevel displayName studentCount isAdvisory
      classes { ...ClassFields }
      students { ...StudentFields }
    }
  }
`;
