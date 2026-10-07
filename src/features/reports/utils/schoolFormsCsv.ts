import { Sf2Report, Sf5Report, Sf9Report } from '@/core/types';

const cell = (value: unknown) => { const text = value == null ? '' : String(value); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
const row = (values: unknown[]) => values.map(cell).join(',');
const gradeLevel = (value: number) => value === 0 ? 'Kindergarten' : `Grade/Year ${value}`;
const schoolRows = (report: { school: Sf2Report['school']; classroom: Sf2Report['classroom']; adviserName: string; status: string }) => [row(['School ID', report.school.schoolIdNumber]), row(['School Name', report.school.name]), row(['Region', report.school.region]), row(['Division', report.school.division]), row(['District', report.school.district]), row(['School Year', report.classroom.schoolYear]), row(['Grade/Year Level', gradeLevel(report.classroom.gradeLevel)]), row(['Section', report.classroom.section]), row(['Adviser', report.adviserName]), row(['School Head', report.school.schoolHeadName]), row(['Status', report.status])];
const finish = (lines: string[], missing: string[]) => `\uFEFF${[...lines, ...(missing.length ? ['', row(['Incomplete fields', missing.join('; ')])] : [])].join('\r\n')}`;

const attendanceCode = (value: string) => ({ PRESENT: '', ABSENT: 'X', LATE: 'L', EXCUSED: 'E' }[value] ?? '');
const number = (value: number | null | undefined) => value == null ? '' : Number(value).toFixed(2).replace(/\.00$/, '');

export const createSf2Csv = (report: Sf2Report) => {
  const activeDays = (report.rows[0]?.days ?? []).map((_, index) => index).filter((index) => report.rows.some((item) => item.days[index]));
  const dates = activeDays.map((index) => index + 1);
  const male = report.rows.filter((item) => item.student.sex === 'MALE');
  const female = report.rows.filter((item) => item.student.sex === 'FEMALE');
  const totalFor = (items: typeof report.rows, index: number) => items.filter((item) => ['PRESENT', 'LATE'].includes(item.days[index] ?? '')).length;
  const attendanceRows = (items: typeof report.rows, label?: string) => [
    ...items.map((item, index) => row([index + 1, item.student.fullName, ...activeDays.map((day) => attendanceCode(item.days[day] ?? '')), item.absent, item.present + item.late, ''])),
    ...(label ? [row(['', `${label} total per day`, ...activeDays.map((day) => totalFor(items, day)), '', '', ''])] : []),
  ];
  const totalPresent = report.rows.reduce((sum, item) => sum + item.present + item.late, 0);
  const schoolDays = dates.length;
  const averageDailyAttendance = schoolDays ? totalPresent / schoolDays : 0;
  return finish([row(['SF2 - Learner Daily Attendance Report']), ...schoolRows(report), row(['Report for the Month of', report.month]), '', row(['No.', 'NAME (Last Name, First Name)', ...dates, 'Total Absent', 'Total Present', 'Remarks']), ...attendanceRows(male, 'Male'), ...attendanceRows(female, 'Female'), row(['', 'Combined total per day', ...activeDays.map((day) => totalFor(report.rows, day)), '', '', '']), '', row(['MONTHLY SUMMARY']), row(['Number of school days', schoolDays]), row(['Registered learners at end of month', report.rows.length]), row(['Average daily attendance', number(averageDailyAttendance)]), row(['Percentage of attendance', report.rows.length ? number((averageDailyAttendance / report.rows.length) * 100) : '']), '', row(['Certified correct by', report.adviserName]), row(['Noted by', report.school.schoolHeadName])], report.missingFields);
};

export const createSf9Csv = (report: Sf9Report) => {
  const completedSubjects = report.subjects.filter((item) => item.finalRating != null);
  const generalAverage = completedSubjects.length ? completedSubjects.reduce((sum, item) => sum + (item.finalRating ?? 0), 0) / completedSubjects.length : undefined;
  return finish([row([`${report.variant} - Learner Progress Report`]), ...schoolRows(report), row(['Learner Name', report.student.fullName]), row(['LRN', report.student.lrn]), row(['Birth Date', report.student.birthDate]), row(['Sex', report.student.sex]), '', row(['LEARNING AREAS', 'Q1', 'Q2', 'Q3', 'Q4', 'FINAL RATING', 'REMARKS']), ...report.subjects.map((item) => row([item.subject, ...item.quarters.map(number), number(item.finalRating), item.remarks])), row(['GENERAL AVERAGE', '', '', '', '', number(generalAverage), generalAverage == null ? 'INCOMPLETE' : generalAverage >= 75 ? 'PASSED' : 'FOR REVIEW']), '', row(['REPORT ON ATTENDANCE']), row(['Month', 'School Days', 'Days Present', 'Days Absent', 'Times Late']), ...report.attendance.map((item) => row([item.month, item.schoolDays, item.daysPresent, item.daysAbsent, item.timesLate])), '', row(['REPORT ON LEARNER’S OBSERVED VALUES']), row(['Core Value', 'Q1', 'Q2', 'Q3', 'Q4']), ...report.observedValues.map((item) => row([item.coreValue, ...item.quarters])), '', row(['Adviser', report.adviserName]), row(['School Head', report.school.schoolHeadName])], report.missingFields);
};

export const createCombinedSf9Csv = (reports: Sf9Report[]) => `\uFEFF${reports.map((report) => createSf9Csv(report).replace(/^\uFEFF/, '')).join('\r\n\r\n')}`;

export const createSf5Csv = (report: Sf5Report) => {
  const male = report.rows.filter((item) => item.student.sex === 'MALE').length;
  const female = report.rows.filter((item) => item.student.sex === 'FEMALE').length;
  return finish([row([`${report.variant} - Report on Promotion and Learning Progress`]), ...schoolRows(report), '', row(['No.', 'LRN', 'LEARNER NAME', 'SEX', 'BIRTH DATE', 'GENERAL AVERAGE', 'PROMOTION / REMARKS']), ...report.rows.map((item, index) => row([index + 1, item.student.lrn ?? item.student.studentNo, item.student.fullName, item.student.sex, item.student.birthDate?.slice(0, 10), number(item.generalAverage), item.result])), '', row(['SUMMARY']), row(['Male', male]), row(['Female', female]), row(['Total learners', report.rows.length]), '', row(['Certified correct by', report.adviserName]), row(['Noted by', report.school.schoolHeadName])], report.missingFields);
};
export const formFileName = (kind: string, report: { classroom: { section: string; schoolYear: string } }, suffix = '') => `${kind}_${report.classroom.section}_${report.classroom.schoolYear}${suffix}.csv`.replace(/[^a-z0-9_.-]+/gi, '-');
export const combinedSf9FileName = (classroom: { section: string; schoolYear: string }) => `SF9_${classroom.section}_${classroom.schoolYear}_Selected-Learners.csv`.replace(/[^a-z0-9_.-]+/gi, '-');
