import { gql } from '@apollo/client';

export const SET_ATTENDANCE_MUTATION = gql`
  mutation SetAttendance($classroomId: ID!, $studentId: ID!, $date: String!, $status: AttendanceStatus!, $reason: String, $scope: AttendanceScope!) {
    setAttendance(classroomId: $classroomId, studentId: $studentId, date: $date, status: $status, reason: $reason, scope: $scope) {
      id date checkedAt status reason scope
    }
  }
`;
