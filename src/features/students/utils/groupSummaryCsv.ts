import { StudentGroup } from '@/core/types';

const cell = (value: unknown) => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const row = (values: unknown[]) => values.map(cell).join(',');
const safe = (value: string) => value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '');

export const createGroupSummaryCsv = (group: StudentGroup) => {
  const classHeaders = group.classes.map((room) => room.subject);
  const lines = [
    row(['SECTION SUMMARY']),
    row(['Section', group.section]),
    row(['Grade/Year Level', group.gradeLevel === 0 ? 'Kindergarten' : group.gradeLevel]),
    row(['School Year', group.schoolYear]),
    row(['Term', group.term]),
    row(['Adviser', group.isAdvisory ? 'Yes' : 'No']),
    '',
    row(['CLASSES']),
    row(['Subject', 'Schedule', 'Room', 'Students']),
    ...group.classes.map((room) => row([room.subject, `${room.scheduleDay} ${room.startTime}-${room.endTime}`, room.room, room.studentCount])),
    '',
    row(['SECTION ROSTER']),
    row(['No.', 'Student Number', 'LRN', 'Learner Name', ...classHeaders]),
    ...group.students.map((student, index) => row([index + 1, student.studentNo, student.lrn, student.fullName, ...group.classes.map(() => 'Enrolled')])),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
};

export const groupSummaryFileName = (group: StudentGroup) => `${safe(group.displayName)}_Summary_${safe(group.schoolYear)}.csv`;
