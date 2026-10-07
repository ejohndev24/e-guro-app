import { gql } from '@apollo/client';
import { STUDENT_FIELDS } from '@/features/students/graphql/fragments/studentFields';
import { CLASS_FIELDS } from '../fragments/classFields';

export const CLASS_DETAIL_QUERY = gql`
  ${CLASS_FIELDS}
  ${STUDENT_FIELDS}
  query ClassDetail($id: ID!, $date: String, $quarter: Int!, $attendanceScope: AttendanceScope!) {
    classDetail(id: $id, date: $date, quarter: $quarter, attendanceScope: $attendanceScope) {
      classroom { ...ClassFields }
      roster {
        student { ...StudentFields }
        attendance { id date checkedAt status reason scope }
        grade { id quarter quiz activity exam finalGrade }
      }
    }
  }
`;
