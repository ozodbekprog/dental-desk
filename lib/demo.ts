import { addDays, ymd } from "./util";

export type SeedRecord = {
  collection: string;
  docId: string;
  data: Record<string, unknown>;
};

type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  reason: string;
  createdAt: number;
  arrivedAt?: number;
};

function slotCells(time: string, duration: number): string[] {
  const [h, m] = time.split(":").map(Number);
  const start = h * 60 + m;
  const count = Math.max(1, Math.ceil(duration / 30));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = start + i * 30;
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

/**
 * Demo clinic content. Every record carries demo: true so the app shows
 * its "delete examples" banner and the clinic can clear it in one click.
 */
export function demoRecords(today = new Date()): SeedRecord[] {
  const todayStr = ymd(today);
  const records: SeedRecord[] = [];
  const push = (collection: string, docId: string, data: Record<string, unknown>) =>
    records.push({ collection, docId, data });

  const doctors = [
    { id: "dd-demo-d1", name: "Dr. Aziza Karimova", spec: "therapist" },
    { id: "dd-demo-d2", name: "Dr. Bekzod Tursunov", spec: "surgeon" },
    { id: "dd-demo-d3", name: "Dr. Nilufar Yusupova", spec: "orthodontist" },
  ];
  for (const d of doctors) {
    push("doctors", d.id, {
      name: d.name,
      spec: d.spec,
      createdAt: Date.now() - 120 * 86400000,
      demo: true,
    });
  }

  // Each doctor keeps a personal price list. Empty cells mean "by agreement".
  const priceLists: Record<string, { procs: Record<string, number>; extras: Record<string, number> }> = {
    "dd-demo-d1": {
      procs: { exam: 50000, xray: 60000, cleaning: 250000, filling: 350000, endo: 900000, crown: 1100000, extraction: 350000 },
      extras: { injection: 50000, consult: 50000, xray_img: 60000 },
    },
    "dd-demo-d2": {
      procs: { exam: 50000, xray: 60000, extraction: 400000, implant: 3500000, crown: 1200000, filling: 400000 },
      extras: { injection: 50000, consult: 50000, materials: 80000 },
    },
    "dd-demo-d3": {
      procs: { exam: 40000, cleaning: 220000, whitening: 800000, crown: 1200000, sealant: 150000 },
      extras: { consult: 40000, xray_img: 55000 },
    },
  };
  for (const [docId, items] of Object.entries(priceLists)) {
    push("prices", docId, {
      doctorId: docId,
      items,
      updatedAt: Date.now() - 5 * 86400000,
      updatedBy: "Demo",
      demo: true,
    });
  }

  const patients = [
    { id: "dd-demo-p1", name: "Dilnoza Rasulova", phone: "+998 90 123 45 67", dob: "1991-04-12", alertIds: [] },
    { id: "dd-demo-p2", name: "Jasur Ahmedov", phone: "+998 91 234 56 78", dob: "1984-09-03", alertIds: ["hypertension"] },
    { id: "dd-demo-p3", name: "Malika Saidova", phone: "+998 93 345 67 89", dob: "1998-01-27", alertIds: [] },
    { id: "dd-demo-p4", name: "Sardor Qodirov", phone: "+998 94 456 78 90", dob: "1979-06-18", alertIds: ["diabetes"] },
    { id: "dd-demo-p5", name: "Nigora Umarova", phone: "+998 97 567 89 01", dob: "2003-11-05", alertIds: [] },
    { id: "dd-demo-p6", name: "Aziz Toshpulatov", phone: "+998 90 678 90 12", dob: "1988-03-22", alertIds: [] },
    { id: "dd-demo-p7", name: "Kamila Yuldasheva", phone: "+998 99 789 01 23", dob: "2014-08-14", alertIds: [] },
    { id: "dd-demo-p8", name: "Rustam Nazarov", phone: "+998 90 890 12 34", dob: "1971-12-30", alertIds: ["heart", "anticoag"] },
    { id: "dd-demo-p9", name: "Shahzoda Mirzaeva", phone: "+998 88 901 23 45", dob: "1995-07-09", alertIds: [] },
    { id: "dd-demo-p10", name: "Bekzod Alimov", phone: "+998 91 012 34 56", dob: "1999-02-16", alertIds: [] },
  ];
  for (const p of patients) {
    push("patients", p.id, {
      name: p.name,
      phone: p.phone,
      dob: p.dob,
      alerts: "",
      alertIds: p.alertIds,
      createdAt: Date.now() - 60 * 86400000,
      demo: true,
    });
  }

  const appts: Appointment[] = [
    { id: "dd-demo-a1", patientId: "dd-demo-p1", patientName: "Dilnoza Rasulova", doctorId: "dd-demo-d1", doctorName: "Dr. Aziza Karimova", date: todayStr, time: "09:00", duration: 30, status: "arrived", reason: "checkup", createdAt: Date.now() - 2 * 86400000, arrivedAt: Date.now() - 10 * 60000 },
    { id: "dd-demo-a2", patientId: "dd-demo-p2", patientName: "Jasur Ahmedov", doctorId: "dd-demo-d1", doctorName: "Dr. Aziza Karimova", date: todayStr, time: "09:30", duration: 30, status: "in-chair", reason: "pain", createdAt: Date.now() - 2 * 86400000 },
    { id: "dd-demo-a3", patientId: "dd-demo-p3", patientName: "Malika Saidova", doctorId: "dd-demo-d2", doctorName: "Dr. Bekzod Tursunov", date: todayStr, time: "10:00", duration: 30, status: "scheduled", reason: "extraction", createdAt: Date.now() - 86400000 },
    { id: "dd-demo-a4", patientId: "dd-demo-p4", patientName: "Sardor Qodirov", doctorId: "dd-demo-d3", doctorName: "Dr. Nilufar Yusupova", date: todayStr, time: "10:30", duration: 30, status: "scheduled", reason: "consult", createdAt: Date.now() - 86400000 },
    { id: "dd-demo-a5", patientId: "dd-demo-p5", patientName: "Nigora Umarova", doctorId: "dd-demo-d1", doctorName: "Dr. Aziza Karimova", date: todayStr, time: "11:00", duration: 30, status: "scheduled", reason: "filling", createdAt: Date.now() - 86400000 },
    { id: "dd-demo-a6", patientId: "dd-demo-p6", patientName: "Aziz Toshpulatov", doctorId: "dd-demo-d2", doctorName: "Dr. Bekzod Tursunov", date: todayStr, time: "14:00", duration: 30, status: "scheduled", reason: "rootcanal", createdAt: Date.now() - 86400000 },
    { id: "dd-demo-a7", patientId: "dd-demo-p7", patientName: "Kamila Yuldasheva", doctorId: "dd-demo-d1", doctorName: "Dr. Aziza Karimova", date: todayStr, time: "15:00", duration: 30, status: "scheduled", reason: "cleaning", createdAt: Date.now() - 86400000 },
    { id: "dd-demo-a8", patientId: "dd-demo-p8", patientName: "Rustam Nazarov", doctorId: "dd-demo-d3", doctorName: "Dr. Nilufar Yusupova", date: todayStr, time: "09:00", duration: 30, status: "done", reason: "crown", createdAt: Date.now() - 3 * 86400000 },
  ];

  for (const a of appts) {
    push("appointments", a.id, {
      patientId: a.patientId,
      patientName: a.patientName,
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      date: a.date,
      time: a.time,
      duration: a.duration,
      reason: a.reason,
      reasonOther: "",
      status: a.status,
      source: "staff",
      createdAt: a.createdAt,
      ...(a.arrivedAt ? { arrivedAt: a.arrivedAt } : {}),
      demo: true,
    });
    for (const cell of slotCells(a.time, a.duration)) {
      const key = `${a.doctorId}_${a.date}_${cell.replace(":", "")}`;
      push("slots", key, {
        ref: a.id,
        doctorId: a.doctorId,
        date: a.date,
        time: cell,
        demo: true,
      });
    }
  }

  const day = (offset: number) => ymd(addDays(today, offset));
  const visits = [
    {
      id: "dd-demo-v1",
      patientId: "dd-demo-p1",
      date: day(-3),
      doctorId: "dd-demo-d1",
      doctorName: "Dr. Aziza Karimova",
      reason: "cleaning",
      procedures: [
        { type: "cleaning", tooth: null, surfaces: [], tools: ["scaler", "polish", "air_polish"], toolsOther: [], price: 250000, note: "" },
      ],
      quick: ["hygiene"],
      notes: "Tish toshlari tozalandi, holat yaxshi.",
      total: 250000,
    },
    {
      id: "dd-demo-v2",
      patientId: "dd-demo-p3",
      date: day(-7),
      doctorId: "dd-demo-d2",
      doctorName: "Dr. Bekzod Tursunov",
      reason: "extraction",
      procedures: [
        { type: "extraction", tooth: 38, surfaces: [], tools: ["articaine", "elevator", "forceps", "sutures"], toolsOther: [], price: 400000, note: "" },
      ],
      quick: ["stitch", "painkiller"],
      notes: "38-tish olindi, choklar 7 kundan keyin olinadi.",
      total: 400000,
    },
    {
      id: "dd-demo-v3",
      patientId: "dd-demo-p5",
      date: day(-14),
      doctorId: "dd-demo-d1",
      doctorName: "Dr. Aziza Karimova",
      reason: "filling",
      procedures: [
        { type: "filling", tooth: 16, surfaces: ["O", "M"], tools: ["articaine", "hs_handpiece", "burs", "etchant", "bond", "composite", "curing_light"], toolsOther: [], price: 350000, note: "" },
      ],
      quick: ["noeat"],
      notes: "16-tish kompozit bilan tiklandi.",
      total: 350000,
    },
    {
      id: "dd-demo-v4",
      patientId: "dd-demo-p2",
      date: day(-30),
      doctorId: "dd-demo-d1",
      doctorName: "Dr. Aziza Karimova",
      reason: "rootcanal",
      procedures: [
        { type: "endo", tooth: 11, surfaces: [], tools: ["articaine", "rubber_dam", "endo_files", "rotary", "irrigant", "gutta", "sealer", "xray_sensor"], toolsOther: [], price: 900000, note: "" },
      ],
      quick: ["control", "xraynext"],
      notes: "11-tish ildiz kanallari davolandi.",
      total: 900000,
    },
    {
      id: "dd-demo-v5",
      patientId: "dd-demo-p6",
      date: day(-2),
      doctorId: "dd-demo-d3",
      doctorName: "Dr. Nilufar Yusupova",
      reason: "crown",
      procedures: [
        { type: "crown", tooth: 26, surfaces: [], tools: ["articaine", "hs_handpiece", "retraction", "impression", "temp_cement"], toolsOther: [], price: 1200000, note: "" },
      ],
      quick: ["noeat"],
      notes: "26-tishga vaqtinchalik koronka o'rnatildi.",
      total: 1200000,
    },
  ];

  for (const v of visits) {
    push("visits", v.id, {
      patientId: v.patientId,
      date: v.date,
      time: "10:00",
      doctorId: v.doctorId,
      doctorName: v.doctorName,
      reason: v.reason,
      reasonOther: "",
      procedures: v.procedures,
      extras: [],
      quick: v.quick,
      notes: v.notes,
      total: v.total,
      createdAt: Date.now() - 5 * 86400000,
      demo: true,
    });
  }

  // Online booking requests waiting on reception / call centre.
  const nextOpenDay = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return ymd(d);
  };
  const now = Date.now();
  const reqDay1 = nextOpenDay(1);
  const reqDay2 = nextOpenDay(2);
  push("requests", "pub-demo-r1", {
    items: [
      {
        id: "dd-demo-r1",
        name: "Gulnora Sattorova",
        phone: "+998 90 555 12 34",
        doctorId: "dd-demo-d2",
        doctorName: "Dr. Bekzod Tursunov",
        date: reqDay1,
        time: "11:30",
        duration: 30,
        reason: "pain",
        reasonOther: "",
        source: "public",
        lang: "uz",
        createdAt: now - 25 * 60000,
      },
    ],
    channel: "public",
    createdAt: now - 25 * 60000,
    demo: true,
  });
  push("requests", "pub-demo-r2", {
    items: [
      {
        id: "dd-demo-r2",
        name: "Otabek Rahimov",
        phone: "+998 93 222 45 67",
        doctorId: "dd-demo-d3",
        doctorName: "Dr. Nilufar Yusupova",
        date: reqDay2,
        time: "15:30",
        duration: 30,
        reason: "consult",
        reasonOther: "",
        source: "public",
        lang: "uz",
        createdAt: now - 2 * 3600000,
      },
    ],
    channel: "public",
    createdAt: now - 2 * 3600000,
    demo: true,
  });
  push("reqstate", "dd-demo-r2", {
    status: "contacted",
    contactedAt: now - 90 * 60000,
    contacts: [
      {
        at: now - 90 * 60000,
        channel: "call",
        note: "Bemorga qo'ng'iroq qilindi, vaqtni tasdiqladi.",
        by: "Qabul",
      },
    ],
    at: now - 90 * 60000,
    demo: true,
  });

  return records;
}
