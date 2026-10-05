import { gql } from '@apollo/client';
import { STUDENT_FIELDS } from '@/features/students/graphql/fragments/studentFields';
import { CLASS_FIELDS } from '../fragments/classFields';

export const CLASS_DETAIL_QUERY = gql`
  ${CLASS_FIELDS}
  ${STUDENT_FIELDS}
  query ClassDetail($id: ID!, $date: String, $quarter: Int!) {
    classDetail(id: $id, date: $date, quarter: $quarter) {
      classroom { ...ClassFields }
      roster {
        student { ...StudentFields }
        attendance { id date checkedAt status }
        grade { id quarter quiz activity exam finalGrade }
      }
    }
  }
`;
