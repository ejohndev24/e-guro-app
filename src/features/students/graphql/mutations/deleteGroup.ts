import { gql } from '@apollo/client';

export const DELETE_STUDENT_GROUP_MUTATION = gql`
  mutation DeleteStudentGroup($groupId: ID!) {
    deleteStudentGroup(groupId: $groupId)
  }
`;

export const REMOVE_STUDENT_FROM_GROUP_MUTATION = gql`
  mutation RemoveStudentFromGroup($groupId: ID!, $studentId: ID!) {
    removeStudentFromGroup(groupId: $groupId, studentId: $studentId)
  }
`;

export const DELETE_CLASS_MUTATION = gql`
  mutation DeleteClass($classroomId: ID!) {
    deleteClass(classroomId: $classroomId)
  }
`;
