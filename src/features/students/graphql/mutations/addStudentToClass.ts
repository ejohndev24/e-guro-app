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

export const ADD_STUDENT_TO_CLASS_MUTATION = gql`
  ${STUDENT_FIELDS}
  mutation AddStudentToClass($input: AddStudentToClassInput!) {
    addStudentToClass(input: $input) {
      ...StudentFields
    }
  }
`;
