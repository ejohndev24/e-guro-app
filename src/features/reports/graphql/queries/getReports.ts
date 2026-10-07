import { gql } from '@apollo/client';
import { CLASS_FIELDS } from '@/features/classes/graphql/fragments/classFields';
import { STUDENT_FIELDS } from '@/features/students/graphql/fragments/studentFields';

export const REPORTS_QUERY = gql`
  ${CLASS_FIELDS}
  ${STUDENT_FIELDS}
  query Reports($quarter: Int!) {
    dashboard(quarter: $quarter) {
      stats { classCount studentCount attendanceRate pendingGrades averageGrade }
      atRisk { student { ...StudentFields } classroom { ...ClassFields } currentGrade }
      gradeReports { classroom { ...ClassFields } averageGrade gradedStudents studentCount passingStudents }
    }
  }
`;
