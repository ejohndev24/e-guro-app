import { gql } from '@apollo/client';
import { CLASS_FIELDS } from '@/features/classes/graphql/fragments/classFields';
import { STUDENT_FIELDS } from '@/features/students/graphql/fragments/studentFields';

export const GRADE_ROSTER_QUERY = gql`
  ${CLASS_FIELDS}
  ${STUDENT_FIELDS}
  query Gradebook($classroomId: ID!, $quarter: Int!) {
    gradebook(classroomId: $classroomId, quarter: $quarter) {
      classroom { ...ClassFields }
      schemeName
      categories {
        id name weight
        assessments { id title maxScore scores { studentId score } }
      }
      students { student { ...StudentFields } finalGrade }
    }
  }
`;
