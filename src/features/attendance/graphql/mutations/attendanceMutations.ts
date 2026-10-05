import { gql } from '@apollo/client';

export const SET_ATTENDANCE_MUTATION = gql`
  mutation SetAttendance($classroomId: ID!, $studentId: ID!, $date: String!, $status: AttendanceStatus!) {
    setAttendance(classroomId: $classroomId, studentId: $studentId, date: $date, status: $status) {
      id date checkedAt status
    }
  }
`;
