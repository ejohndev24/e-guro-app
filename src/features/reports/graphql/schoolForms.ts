import { gql } from '@apollo/client';
import { CLASS_FIELDS } from '@/features/classes/graphql/fragments/classFields';
import { STUDENT_FIELDS } from '@/features/students/graphql/fragments/studentFields';

export const SF2_REPORT_QUERY = gql`
  ${CLASS_FIELDS} ${STUDENT_FIELDS}
  query Sf2Report($classroomId: ID!, $month: String!) { sf2Report(classroomId: $classroomId, month: $month) { school { name schoolIdNumber region division district address schoolHeadName } classroom { ...ClassFields } adviserName month status readyToFinalize missingFields rows { student { ...StudentFields } days present absent late excused } } }
`;
export const SF9_REPORT_QUERY = gql`
  ${CLASS_FIELDS} ${STUDENT_FIELDS}
  query Sf9Report($classroomId: ID!, $studentId: ID!) { sf9Report(classroomId: $classroomId, studentId: $studentId) { school { name schoolIdNumber region division district address schoolHeadName } classroom { ...ClassFields } student { ...StudentFields } adviserName status variant readyToFinalize missingFields subjects { subject quarters finalRating remarks } attendance { month schoolDays daysPresent daysAbsent timesLate } observedValues { coreValue quarters } } }
`;
export const SF5_REPORT_QUERY = gql`
  ${CLASS_FIELDS} ${STUDENT_FIELDS}
  query Sf5Report($classroomId: ID!) { sf5Report(classroomId: $classroomId) { school { name schoolIdNumber region division district address schoolHeadName } classroom { ...ClassFields } adviserName status variant readyToFinalize missingFields rows { student { ...StudentFields } generalAverage result } } }
`;
export const SET_REPORT_STATUS_MUTATION = gql`
  mutation SetSchoolReportStatus($kind: SchoolReportKind!, $classroomId: ID!, $periodKey: String!, $status: SchoolReportStatus!, $studentId: ID) { setSchoolReportStatus(kind: $kind, classroomId: $classroomId, periodKey: $periodKey, status: $status, studentId: $studentId) { id kind status periodKey finalizedAt lockedAt } }
`;
export const SAVE_OBSERVED_VALUE_MUTATION = gql`
  mutation SaveObservedValue($input: SaveObservedValueInput!) { saveObservedValue(input: $input) { id quarter coreValue rating } }
`;
