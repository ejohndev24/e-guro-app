/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws  and international treaties, and it
 * or any part thereof, may not be copied,  reproduced, utilized, distributed
 * or an adaptation thereof be made,  without the prior authority and consent
 * of PharmaServ Express.  Any unauthorized use of this program will be dealt
 * with and  prosecuted to the maximum extent possible under  the law and may
 * result in civil and criminal liabilities.
 */
import { StudentGroup } from "@/core/types";

const cell = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const row = (values: unknown[]) => values.map(cell).join(",");
const safe = (value: string) =>
  value
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-|-$/g, "");

export const createGroupSummaryCsv = (group: StudentGroup) => {
  const classHeaders = group.classes.map((room) => room.subject);
  const lines = [
    row(["SECTION SUMMARY"]),
    row(["Section", group.section]),
    row([
      "Grade/Year Level",
      group.gradeLevel === 0 ? "Kindergarten" : group.gradeLevel,
    ]),
    row(["School Year", group.schoolYear]),
    row(["Term", group.term]),
    row(["Adviser", group.isAdvisory ? "Yes" : "No"]),
    "",
    row(["CLASSES"]),
    row(["Subject", "Schedule", "Room", "Students"]),
    ...group.classes.map((room) =>
      row([
        room.subject,
        `${room.scheduleDay} ${room.startTime}-${room.endTime}`,
        room.room,
        room.studentCount,
      ]),
    ),
    "",
    row(["SECTION ROSTER"]),
    row(["No.", "Student Number", "LRN", "Student Name", ...classHeaders]),
    ...group.students.map((student, index) =>
      row([
        index + 1,
        student.studentNo,
        student.lrn,
        student.fullName,
        ...group.classes.map(() => "Enrolled"),
      ]),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
};

export const groupSummaryFileName = (group: StudentGroup) =>
  `${safe(group.displayName)}_Summary_${safe(group.schoolYear)}.csv`;
