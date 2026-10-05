import { gql } from '@apollo/client';
import { CLASS_FIELDS } from '@/features/classes/graphql/fragments/classFields';
import { STUDENT_FIELDS } from '@/features/students/graphql/fragments/studentFields';

export const REPORTS_QUERY = gql`
  ${CLASS_FIELDS}
  ${STUDENT_FIELDS}
  query Reports {
    dashboard {
      stats { classCount studentCount attendanceRate pendingGrades }
      atRisk { student { ...StudentFields } classroom { ...ClassFields } currentGrade }
    }
  }
`;
