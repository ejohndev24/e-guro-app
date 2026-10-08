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
import { STUDENT_FIELDS } from "@/features/students/graphql/fragments/studentFields";

export const SAVE_TEACHER_STUDENT_MUTATION = gql`
  ${STUDENT_FIELDS}
  mutation SaveTeacherStudent($input: TeacherStudentInput!) {
    saveTeacherStudent(input: $input) {
      ...StudentFields
    }
  }
`;

export const IMPORT_TEACHER_STUDENTS_MUTATION = gql`
  mutation ImportTeacherStudents($inputs: [TeacherStudentInput!]!) {
    importTeacherStudents(inputs: $inputs) {
      count
    }
  }
`;
