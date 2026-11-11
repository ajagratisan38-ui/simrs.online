import type { Knex } from 'knex'

const ICD9CM_DATA: Array<{
  code: string
  name_en: string
  name_id: string
  category: string
}> = [
  // ============================================================
  // TINDAKAN DIAGNOSTIK (Diagnostic Procedures)
  // ============================================================
  { code: '87.44', name_en: 'Routine chest x-ray', name_id: 'Rontgen thorax rutin', category: 'Diagnostik Radiologi' },
  { code: '87.03', name_en: 'CAT scan of head', name_id: 'CT Scan kepala', category: 'Diagnostik Radiologi' },
  { code: '88.71', name_en: 'Diagnostic ultrasound of head and neck', name_id: 'USG diagnostik kepala dan leher', category: 'Diagnostik Radiologi' },
  { code: '88.72', name_en: 'Diagnostic ultrasound of heart', name_id: 'Ekokardiografi', category: 'Diagnostik Radiologi' },
  { code: '88.74', name_en: 'Diagnostic ultrasound of digestive system', name_id: 'USG abdomen', category: 'Diagnostik Radiologi' },
  { code: '88.76', name_en: 'Diagnostic ultrasound of abdomen and retroperitoneum', name_id: 'USG abdomen dan retroperitoneum', category: 'Diagnostik Radiologi' },
  { code: '88.78', name_en: 'Diagnostic ultrasound of gravid uterus', name_id: 'USG obstetri', category: 'Diagnostik Radiologi' },
  { code: '88.91', name_en: 'MRI of brain and brain stem', name_id: 'MRI otak', category: 'Diagnostik Radiologi' },

  // ============================================================
  // LABORATORIUM (Laboratory)
  // ============================================================
  { code: '90.59', name_en: 'Other microscopic examination of blood', name_id: 'Pemeriksaan darah lengkap', category: 'Laboratorium' },
  { code: '90.62', name_en: 'Blood typing', name_id: 'Golongan darah', category: 'Laboratorium' },
  { code: '91.39', name_en: 'Other microscopic examination of specimen from bladder', name_id: 'Urinalisa', category: 'Laboratorium' },
  { code: '90.49', name_en: 'Other microscopic examination of blood', name_id: 'Kultur darah', category: 'Laboratorium' },

  // ============================================================
  // TINDAKAN BEDAH UMUM (General Surgery)
  // ============================================================
  { code: '47.09', name_en: 'Other appendectomy', name_id: 'Appendektomi', category: 'Bedah Umum' },
  { code: '47.01', name_en: 'Laparoscopic appendectomy', name_id: 'Appendektomi laparoskopi', category: 'Bedah Umum' },
  { code: '51.22', name_en: 'Cholecystectomy', name_id: 'Kolesistektomi', category: 'Bedah Umum' },
  { code: '51.23', name_en: 'Laparoscopic cholecystectomy', name_id: 'Kolesistektomi laparoskopi', category: 'Bedah Umum' },
  { code: '53.00', name_en: 'Unilateral repair of inguinal hernia', name_id: 'Herniotomi inguinal unilateral', category: 'Bedah Umum' },
  { code: '53.01', name_en: 'Repair of direct inguinal hernia', name_id: 'Repair hernia inguinalis direk', category: 'Bedah Umum' },
  { code: '53.21', name_en: 'Laparoscopic bilateral repair of inguinal hernia', name_id: 'Repair hernia inguinal bilateral laparoskopi', category: 'Bedah Umum' },
  { code: '54.11', name_en: 'Exploratory laparotomy', name_id: 'Laparotomi eksplorasi', category: 'Bedah Umum' },
  { code: '54.21', name_en: 'Laparoscopy', name_id: 'Laparoskopi diagnostik', category: 'Bedah Umum' },
  { code: '86.04', name_en: 'Incision with drainage of skin', name_id: 'Insisi dan drainase kulit', category: 'Bedah Umum' },
  { code: '86.22', name_en: 'Excisional debridement of wound', name_id: 'Debridement luka', category: 'Bedah Umum' },
  { code: '86.59', name_en: 'Closure of skin and subcutaneous tissue', name_id: 'Penutupan luka (jahit)', category: 'Bedah Umum' },
  { code: '86.3', name_en: 'Excision or destruction of lesion of skin', name_id: 'Eksisi lesi kulit', category: 'Bedah Umum' },

  // ============================================================
  // BEDAH ORTOPEDI (Orthopedic Surgery)
  // ============================================================
  { code: '79.31', name_en: 'Open reduction of fracture of humerus', name_id: 'ORIF humerus', category: 'Bedah Ortopedi' },
  { code: '79.32', name_en: 'Open reduction of fracture of radius and ulna', name_id: 'ORIF radius/ulna', category: 'Bedah Ortopedi' },
  { code: '79.35', name_en: 'Open reduction of fracture of femur', name_id: 'ORIF femur', category: 'Bedah Ortopedi' },
  { code: '79.36', name_en: 'Open reduction of fracture of tibia and fibula', name_id: 'ORIF tibia/fibula', category: 'Bedah Ortopedi' },
  { code: '79.01', name_en: 'Closed reduction of fracture of humerus', name_id: 'Reposisi tertutup fraktur humerus', category: 'Bedah Ortopedi' },
  { code: '79.06', name_en: 'Closed reduction of fracture of tibia and fibula', name_id: 'Reposisi tertutup fraktur tibia/fibula', category: 'Bedah Ortopedi' },
  { code: '81.51', name_en: 'Total hip replacement', name_id: 'Total hip replacement', category: 'Bedah Ortopedi' },
  { code: '81.54', name_en: 'Total knee replacement', name_id: 'Total knee replacement', category: 'Bedah Ortopedi' },
  { code: '80.26', name_en: 'Arthroscopy of knee', name_id: 'Artroskopi lutut', category: 'Bedah Ortopedi' },
  { code: '78.59', name_en: 'Internal fixation of bone', name_id: 'Fiksasi internal tulang', category: 'Bedah Ortopedi' },
  { code: '93.53', name_en: 'Application of plaster cast', name_id: 'Pemasangan gips', category: 'Bedah Ortopedi' },

  // ============================================================
  // OBSTETRI & GINEKOLOGI (OB-GYN)
  // ============================================================
  { code: '74.0', name_en: 'Classical cesarean section', name_id: 'Seksio sesarea klasik', category: 'Obstetri Ginekologi' },
  { code: '74.1', name_en: 'Low cervical cesarean section', name_id: 'Seksio sesarea transperitoneal rendah', category: 'Obstetri Ginekologi' },
  { code: '73.59', name_en: 'Other manually assisted delivery', name_id: 'Persalinan dengan bantuan manual', category: 'Obstetri Ginekologi' },
  { code: '72.1', name_en: 'Low forceps operation', name_id: 'Ekstraksi forsep rendah', category: 'Obstetri Ginekologi' },
  { code: '72.71', name_en: 'Vacuum extraction', name_id: 'Ekstraksi vakum', category: 'Obstetri Ginekologi' },
  { code: '69.02', name_en: 'Dilation and curettage', name_id: 'Dilatasi dan kuretase', category: 'Obstetri Ginekologi' },
  { code: '68.49', name_en: 'Total abdominal hysterectomy', name_id: 'Histerektomi total abdominal', category: 'Obstetri Ginekologi' },
  { code: '65.29', name_en: 'Other salpingo-oophorectomy', name_id: 'Salpingo-ooforektomi', category: 'Obstetri Ginekologi' },
  { code: '66.39', name_en: 'Other bilateral destruction of fallopian tubes', name_id: 'Tubektomi (MOW)', category: 'Obstetri Ginekologi' },
  { code: '75.34', name_en: 'Other fetal monitoring', name_id: 'Pemantauan janin (CTG)', category: 'Obstetri Ginekologi' },

  // ============================================================
  // BEDAH SARAF (Neurosurgery)
  // ============================================================
  { code: '01.24', name_en: 'Other craniotomy', name_id: 'Kraniotomi', category: 'Bedah Saraf' },
  { code: '01.31', name_en: 'Incision of cerebral meninges', name_id: 'Insisi meninges serebral', category: 'Bedah Saraf' },
  { code: '03.09', name_en: 'Other exploration of spinal canal', name_id: 'Eksplorasi kanalis spinalis', category: 'Bedah Saraf' },
  { code: '03.4', name_en: 'Excision of lesion of spinal cord', name_id: 'Eksisi lesi medula spinalis', category: 'Bedah Saraf' },

  // ============================================================
  // THT (ENT)
  // ============================================================
  { code: '28.2', name_en: 'Tonsillectomy without adenoidectomy', name_id: 'Tonsilektomi', category: 'THT' },
  { code: '28.3', name_en: 'Tonsillectomy with adenoidectomy', name_id: 'Tonsiloadenoidektomi', category: 'THT' },
  { code: '22.2', name_en: 'Intranasal antrotomy', name_id: 'Antrotomi intranasal', category: 'THT' },
  { code: '21.01', name_en: 'Control of epistaxis by anterior nasal packing', name_id: 'Tampon hidung anterior', category: 'THT' },
  { code: '20.01', name_en: 'Myringotomy with insertion of tube', name_id: 'Miringotomi dengan pemasangan pipa', category: 'THT' },

  // ============================================================
  // MATA (Ophthalmology)
  // ============================================================
  { code: '13.19', name_en: 'Other intracapsular extraction of lens', name_id: 'Ekstraksi lensa intrakapsular', category: 'Mata' },
  { code: '13.41', name_en: 'Phacoemulsification and aspiration of cataract', name_id: 'Fakoemulsifikasi katarak', category: 'Mata' },
  { code: '13.71', name_en: 'Insertion of intraocular lens prosthesis', name_id: 'Pemasangan lensa intraokular', category: 'Mata' },
  { code: '14.34', name_en: 'Repair of retinal detachment', name_id: 'Repair ablasio retina', category: 'Mata' },
  { code: '08.44', name_en: 'Repair of entropion', name_id: 'Repair entropion', category: 'Mata' },

  // ============================================================
  // UROLOGI (Urology)
  // ============================================================
  { code: '56.0', name_en: 'Transurethral removal of obstruction from ureter', name_id: 'URS (Ureteroskopi)', category: 'Urologi' },
  { code: '55.04', name_en: 'Percutaneous nephrostomy', name_id: 'Nefrostomi perkutan', category: 'Urologi' },
  { code: '57.0', name_en: 'Transurethral clearance of bladder', name_id: 'Evakuasi buli transuretra', category: 'Urologi' },
  { code: '60.29', name_en: 'Other prostatectomy', name_id: 'Prostatektomi (TURP)', category: 'Urologi' },
  { code: '64.0', name_en: 'Circumcision', name_id: 'Sirkumsisi', category: 'Urologi' },

  // ============================================================
  // KARDIOLOGI (Cardiology)
  // ============================================================
  { code: '37.22', name_en: 'Left heart cardiac catheterization', name_id: 'Kateterisasi jantung kiri', category: 'Kardiologi' },
  { code: '36.01', name_en: 'Single vessel PTCA', name_id: 'PCI (single vessel)', category: 'Kardiologi' },
  { code: '36.06', name_en: 'Insertion of coronary artery stent', name_id: 'Pemasangan stent koroner', category: 'Kardiologi' },
  { code: '37.94', name_en: 'Implantation of automatic cardioverter defibrillator', name_id: 'Pemasangan AICD', category: 'Kardiologi' },
  { code: '89.52', name_en: 'Electrocardiogram', name_id: 'EKG', category: 'Kardiologi' },
  { code: '89.54', name_en: 'Electrographic monitoring', name_id: 'Monitor EKG kontinu', category: 'Kardiologi' },

  // ============================================================
  // TINDAKAN UMUM / MINOR (General Procedures)
  // ============================================================
  { code: '99.29', name_en: 'Injection or infusion of other therapeutic substance', name_id: 'Injeksi/infus obat terapeutik', category: 'Tindakan Umum' },
  { code: '99.04', name_en: 'Transfusion of packed cells', name_id: 'Transfusi PRC', category: 'Tindakan Umum' },
  { code: '99.05', name_en: 'Transfusion of platelets', name_id: 'Transfusi trombosit', category: 'Tindakan Umum' },
  { code: '99.07', name_en: 'Transfusion of other serum', name_id: 'Transfusi FFP', category: 'Tindakan Umum' },
  { code: '96.04', name_en: 'Insertion of endotracheal tube', name_id: 'Pemasangan ETT (intubasi)', category: 'Tindakan Umum' },
  { code: '96.6', name_en: 'Enteral infusion of concentrated nutritional substances', name_id: 'Pemasangan NGT', category: 'Tindakan Umum' },
  { code: '57.94', name_en: 'Insertion of indwelling urinary catheter', name_id: 'Pemasangan kateter urin', category: 'Tindakan Umum' },
  { code: '38.93', name_en: 'Venous catheterization', name_id: 'Pemasangan CVC', category: 'Tindakan Umum' },
  { code: '34.91', name_en: 'Thoracentesis', name_id: 'Torakosentesis (pungsi pleura)', category: 'Tindakan Umum' },
  { code: '54.91', name_en: 'Percutaneous abdominal drainage', name_id: 'Parasentesis abdomen', category: 'Tindakan Umum' },
  { code: '03.31', name_en: 'Spinal tap', name_id: 'Lumbal pungsi', category: 'Tindakan Umum' },
  { code: '93.39', name_en: 'Other physical therapy', name_id: 'Fisioterapi', category: 'Tindakan Umum' },
  { code: '93.11', name_en: 'Assisting exercise', name_id: 'Rehabilitasi medik', category: 'Tindakan Umum' },
  { code: '96.71', name_en: 'Continuous mechanical ventilation < 96 hours', name_id: 'Ventilasi mekanik < 96 jam', category: 'Tindakan Umum' },
  { code: '96.72', name_en: 'Continuous mechanical ventilation >= 96 hours', name_id: 'Ventilasi mekanik >= 96 jam', category: 'Tindakan Umum' },
  { code: '39.95', name_en: 'Hemodialysis', name_id: 'Hemodialisis', category: 'Tindakan Umum' },
  { code: '99.25', name_en: 'Injection of cancer chemotherapeutic substance', name_id: 'Kemoterapi', category: 'Tindakan Umum' },

  // ============================================================
  // GIGI & MULUT (Dental)
  // ============================================================
  { code: '23.09', name_en: 'Extraction of other tooth', name_id: 'Ekstraksi gigi', category: 'Gigi Mulut' },
  { code: '23.19', name_en: 'Other surgical extraction of tooth', name_id: 'Odontektomi', category: 'Gigi Mulut' },
  { code: '24.31', name_en: 'Excision of lesion of jaw', name_id: 'Eksisi lesi rahang', category: 'Gigi Mulut' },
  { code: '23.2', name_en: 'Restoration of tooth by filling', name_id: 'Penambalan gigi', category: 'Gigi Mulut' },
  { code: '23.3', name_en: 'Restoration of tooth by inlay', name_id: 'Restorasi gigi (inlay)', category: 'Gigi Mulut' },

  // ============================================================
  // ANESTESI (Anesthesia)
  // ============================================================
  { code: '99.91', name_en: 'General anesthesia', name_id: 'Anestesi umum', category: 'Anestesi' },
  { code: '03.91', name_en: 'Injection of anesthetic into spinal canal for analgesia', name_id: 'Anestesi spinal', category: 'Anestesi' },
  { code: '04.81', name_en: 'Injection of anesthetic into peripheral nerve', name_id: 'Blok saraf perifer', category: 'Anestesi' },

  // ============================================================
  // BEDAH THORAX & KARDIOVASKULAR
  // ============================================================
  { code: '35.22', name_en: 'Other replacement of mitral valve', name_id: 'Penggantian katup mitral', category: 'Bedah Thorax Kardiovaskular' },
  { code: '35.23', name_en: 'Other replacement of aortic valve', name_id: 'Penggantian katup aorta', category: 'Bedah Thorax Kardiovaskular' },
  { code: '36.11', name_en: 'Aortocoronary bypass of one artery', name_id: 'CABG 1 pembuluh', category: 'Bedah Thorax Kardiovaskular' },
  { code: '36.12', name_en: 'Aortocoronary bypass of two arteries', name_id: 'CABG 2 pembuluh', category: 'Bedah Thorax Kardiovaskular' },
  { code: '36.13', name_en: 'Aortocoronary bypass of three arteries', name_id: 'CABG 3 pembuluh', category: 'Bedah Thorax Kardiovaskular' },
  { code: '34.04', name_en: 'Insertion of intercostal catheter', name_id: 'Pemasangan chest tube/WSD', category: 'Bedah Thorax Kardiovaskular' },

  // ============================================================
  // ENDOSKOPI (Endoscopy)
  // ============================================================
  { code: '45.13', name_en: 'Other endoscopy of small intestine', name_id: 'Enteroskopi', category: 'Endoskopi' },
  { code: '45.23', name_en: 'Colonoscopy', name_id: 'Kolonoskopi', category: 'Endoskopi' },
  { code: '42.23', name_en: 'Other esophagoscopy', name_id: 'Esofagoskopi', category: 'Endoskopi' },
  { code: '44.13', name_en: 'Other gastroscopy', name_id: 'Gastroskopi (EGD)', category: 'Endoskopi' },
  { code: '33.22', name_en: 'Fiber-optic bronchoscopy', name_id: 'Bronkoskopi', category: 'Endoskopi' },
  { code: '57.32', name_en: 'Other cystoscopy', name_id: 'Sistoskopi', category: 'Endoskopi' },

  // ============================================================
  // BEDAH PLASTIK (Plastic Surgery)
  // ============================================================
  { code: '86.60', name_en: 'Free skin graft', name_id: 'Skin graft', category: 'Bedah Plastik' },
  { code: '86.73', name_en: 'Full-thickness skin graft', name_id: 'Skin graft full thickness', category: 'Bedah Plastik' },
  { code: '27.54', name_en: 'Repair of cleft lip', name_id: 'Repair celah bibir', category: 'Bedah Plastik' },
  { code: '27.62', name_en: 'Correction of cleft palate', name_id: 'Repair celah palatum', category: 'Bedah Plastik' },
]

export async function seed(knex: Knex): Promise<void> {
  // Upsert - insert on conflict do nothing
  for (const item of ICD9CM_DATA) {
    await knex.raw(`
      INSERT INTO public.icd9cm_codes (code, name_en, name_id, category)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (code) DO NOTHING
    `, [item.code, item.name_en, item.name_id, item.category])
  }
}
