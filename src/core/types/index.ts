export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type Student = {
  id: string;
  studentNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
};

export type Classroom = {
  id: string;
  gradeLevel: number;
  section: string;
  subject: string;
  room: string;
  scheduleDay: string;
  startTime: string;
  endTime: string;
  schoolYear: string;
  term: string;
  studentCount: number;
  displayName: string;
};

export type Attendance = { id: string; date: string; checkedAt?: string; status: AttendanceStatus };
export type Grade = { id: string; quarter: number; quiz: number; activity: number; exam: number; finalGrade: number };
export type RosterStudent = { student: Student; attendance?: Attendance; grade?: Grade };

export type GradebookAssessment = { id: string; title: string; maxScore: number; scores: { studentId: string; score?: number }[] };
export type GradebookCategory = { id: string; name: string; weight: number; assessments: GradebookAssessment[] };
export type Gradebook = {
  classroom: Classroom;
  schemeName?: string;
  categories: GradebookCategory[];
  students: { student: Student; finalGrade?: number }[];
};
