/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws  and international treaties, and it
 * or any part thereof, may not be copied,  reproduced, utilized, distributed
 * or an adaptation thereof be made,  without the prior authority and consent
 * of PharmaServ Express.  Any unauthorized use of this program will be dealt
 * with and  prosecuted to the maximum extent possible under  the law and may
 * result in civil and criminal liabilities.
 */
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type AttendanceScope = "SUBJECT" | "DAILY";
export type EducationLevel =
  | "KINDERGARTEN"
  | "ELEMENTARY"
  | "JUNIOR_HIGH"
  | "SENIOR_HIGH"
  | "COLLEGE"
  | "CUSTOM";

export type Student = {
  id: string;
  studentNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  lrn?: string;
  birthDate?: string;
  sex?: "MALE" | "FEMALE";
};

export type ReportStatus = "DRAFT" | "FINALIZED" | "LOCKED";
export type ReportSchool = {
  name: string;
  schoolIdNumber?: string;
  region?: string;
  division?: string;
  district?: string;
  address?: string;
  schoolHeadName?: string;
};
export type Sf2Report = {
  school: ReportSchool;
  classroom: Classroom;
  adviserName: string;
  month: string;
  status: ReportStatus;
  readyToFinalize: boolean;
  missingFields: string[];
  rows: Array<{
    student: Student;
    days: string[];
    present: number;
    absent: number;
    late: number;
    excused: number;
  }>;
};
export type Sf9Report = {
  school: ReportSchool;
  classroom: Classroom;
  student: Student;
  adviserName: string;
  status: ReportStatus;
  variant: string;
  readyToFinalize: boolean;
  missingFields: string[];
  subjects: Array<{
    subject: string;
    quarters: Array<number | null>;
    finalRating?: number;
    remarks: string;
  }>;
  attendance: Array<{
    month: string;
    schoolDays: number;
    daysPresent: number;
    daysAbsent: number;
    timesLate: number;
  }>;
  observedValues: Array<{
    coreValue: string;
    quarters: Array<"AO" | "SO" | "RO" | "NO" | null>;
  }>;
};
export type Sf5Report = {
  school: ReportSchool;
  classroom: Classroom;
  adviserName: string;
  status: ReportStatus;
  variant: string;
  readyToFinalize: boolean;
  missingFields: string[];
  rows: Array<{ student: Student; generalAverage?: number; result: string }>;
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
  educationLevel: EducationLevel;
  isAdvisory: boolean;
};

export type StudentGroup = {
  id: string;
  gradeLevel: number;
  section: string;
  schoolYear: string;
  term: string;
  educationLevel: EducationLevel;
  displayName: string;
  studentCount: number;
  isAdvisory: boolean;
  classes: Classroom[];
  students: Student[];
};

export type Attendance = {
  id: string;
  date: string;
  checkedAt?: string;
  status: AttendanceStatus;
  reason?: string;
  scope: AttendanceScope;
};
export type Grade = {
  id: string;
  quarter: number;
  quiz: number;
  activity: number;
  exam: number;
  finalGrade: number;
};
export type RosterStudent = {
  student: Student;
  attendance?: Attendance;
  grade?: Grade;
};

export type GradebookAssessment = {
  id: string;
  title: string;
  maxScore: number;
  scores: { studentId: string; score?: number }[];
};
export type GradebookCategory = {
  id: string;
  name: string;
  weight: number;
  assessments: GradebookAssessment[];
};
export type Gradebook = {
  classroom: Classroom;
  schemeName?: string;
  categories: GradebookCategory[];
  students: {
    student: Student;
    initialGrade?: number | null;
    finalGrade?: number | null;
  }[];
};
