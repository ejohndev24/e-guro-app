/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws  and international treaties, and it
 * or any part thereof, may not be copied,  reproduced, utilized, distributed
 * or an adaptation thereof be made,  without the prior authority and consent
 * of PharmaServ Express.  Any unauthorized use of this program will be dealt
 * with and  prosecuted to the maximum extent possible under  the law and may
 * result in civil and criminal liabilities.
 */
import { gql } from "@apollo/client";

export const SET_ATTENDANCE_MUTATION = gql`
  mutation SetAttendance(
    $classroomId: ID!
    $studentId: ID!
    $date: String!
    $status: AttendanceStatus!
    $reason: String
    $scope: AttendanceScope!
  ) {
    setAttendance(
      classroomId: $classroomId
      studentId: $studentId
      date: $date
      status: $status
      reason: $reason
      scope: $scope
    ) {
      id
      date
      checkedAt
      status
      reason
      scope
    }
  }
`;
