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

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      user {
        id
        name
        email
        role
        schoolId
        mustChangePassword
        isIndependent
      }
    }
  }
`;

export const REGISTER_TEACHER_MUTATION = gql`
  mutation RegisterTeacher($input: RegisterTeacherInput!) {
    registerTeacher(input: $input) {
      accessToken
      user {
        id
        name
        email
        role
        schoolId
        mustChangePassword
        isIndependent
      }
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(
      currentPassword: $currentPassword
      newPassword: $newPassword
    ) {
      id
      mustChangePassword
    }
  }
`;
