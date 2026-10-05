import { gql } from '@apollo/client';
import { CLASS_FIELDS } from '@/features/classes/graphql/fragments/classFields';

export const ATTENDANCE_CLASSES_QUERY = gql`
  ${CLASS_FIELDS}
  query AttendanceClasses { classes { ...ClassFields } }
`;
