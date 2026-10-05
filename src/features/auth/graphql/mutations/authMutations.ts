import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      user { id name email role schoolId mustChangePassword isIndependent }
    }
  }
`;

export const REGISTER_TEACHER_MUTATION = gql`
  mutation RegisterTeacher($input: RegisterTeacherInput!) {
    registerTeacher(input: $input) {
      accessToken
      user { id name email role schoolId mustChangePassword isIndependent }
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) { id mustChangePassword }
  }
`;
