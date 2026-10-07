import { gql } from '@apollo/client';
import { CLASS_FIELDS } from '@/features/classes/graphql/fragments/classFields';
import { STUDENT_FIELDS } from '../fragments/studentFields';

export const STUDENT_QUERY = gql`
  ${CLASS_FIELDS}
  ${STUDENT_FIELDS}
  query Student($id: ID!) {
    student(id: $id) {
      student { ...StudentFields }
      overallGrade attendanceRate
      classes { classroom { ...ClassFields } averageGrade attendanceRate }
      recentAttendance { id date checkedAt status scope }
      grades { id quarter quiz activity exam finalGrade }
    }
  }
`;
