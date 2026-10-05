import { gql } from '@apollo/client';
import { CLASS_FIELDS } from '@/features/classes/graphql/fragments/classFields';
import { STUDENT_FIELDS } from '@/features/students/graphql/fragments/studentFields';

export const DASHBOARD_QUERY = gql`
  ${CLASS_FIELDS}
  ${STUDENT_FIELDS}
  query Dashboard {
    dashboard {
      teacherName
      stats { classCount studentCount attendanceRate pendingGrades }
      classes { ...ClassFields }
      atRisk { student { ...StudentFields } classroom { ...ClassFields } currentGrade }
    }
  }
`;
