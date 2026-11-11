import type { Knex } from 'knex'

// Top 500+ kode ICD-10 yang umum di RS Indonesia
// Dikelompokkan per kategori klinis
const ICD10_DATA: Array<{
  code: string
  name_en: string
  name_id: string
  category: string
}> = [
  // ============================================================
  // PENYAKIT DALAM (Internal Medicine)
  // ============================================================
  { code: 'A01.0', name_en: 'Typhoid fever', name_id: 'Demam tifoid', category: 'Penyakit Dalam' },
  { code: 'A09', name_en: 'Infectious gastroenteritis and colitis', name_id: 'Gastroenteritis dan kolitis infeksi', category: 'Penyakit Dalam' },
  { code: 'A09.0', name_en: 'Gastroenteritis and colitis of infectious origin', name_id: 'Gastroenteritis dan kolitis asal infeksi', category: 'Penyakit Dalam' },
  { code: 'A15.0', name_en: 'Tuberculosis of lung', name_id: 'Tuberkulosis paru', category: 'Penyakit Dalam' },
  { code: 'A15.3', name_en: 'Tuberculosis of lung, confirmed by culture', name_id: 'TB paru konfirmasi kultur', category: 'Penyakit Dalam' },
  { code: 'A16.0', name_en: 'Tuberculosis of lung, bacteriologically and histologically negative', name_id: 'TB paru BTA negatif', category: 'Penyakit Dalam' },
  { code: 'A90', name_en: 'Dengue fever', name_id: 'Demam dengue', category: 'Penyakit Dalam' },
  { code: 'A91', name_en: 'Dengue haemorrhagic fever', name_id: 'Demam berdarah dengue', category: 'Penyakit Dalam' },
  { code: 'B15.0', name_en: 'Hepatitis A with hepatic coma', name_id: 'Hepatitis A dengan koma hepatik', category: 'Penyakit Dalam' },
  { code: 'B16.9', name_en: 'Acute hepatitis B without delta-agent', name_id: 'Hepatitis B akut', category: 'Penyakit Dalam' },
  { code: 'B18.1', name_en: 'Chronic viral hepatitis B', name_id: 'Hepatitis B kronis', category: 'Penyakit Dalam' },
  { code: 'B18.2', name_en: 'Chronic viral hepatitis C', name_id: 'Hepatitis C kronis', category: 'Penyakit Dalam' },
  { code: 'B20', name_en: 'HIV disease resulting in infectious diseases', name_id: 'HIV dengan penyakit infeksi', category: 'Penyakit Dalam' },
  { code: 'B24', name_en: 'Unspecified HIV disease', name_id: 'HIV tidak terspesifikasi', category: 'Penyakit Dalam' },
  { code: 'B50.9', name_en: 'Plasmodium falciparum malaria, unspecified', name_id: 'Malaria falciparum', category: 'Penyakit Dalam' },
  { code: 'B54', name_en: 'Unspecified malaria', name_id: 'Malaria tidak terspesifikasi', category: 'Penyakit Dalam' },
  { code: 'D50.9', name_en: 'Iron deficiency anaemia, unspecified', name_id: 'Anemia defisiensi besi', category: 'Penyakit Dalam' },
  { code: 'D64.9', name_en: 'Anaemia, unspecified', name_id: 'Anemia tidak terspesifikasi', category: 'Penyakit Dalam' },
  { code: 'E10.9', name_en: 'Type 1 diabetes mellitus without complications', name_id: 'Diabetes melitus tipe 1 tanpa komplikasi', category: 'Penyakit Dalam' },
  { code: 'E11.0', name_en: 'Type 2 diabetes mellitus with coma', name_id: 'DM tipe 2 dengan koma', category: 'Penyakit Dalam' },
  { code: 'E11.2', name_en: 'Type 2 diabetes mellitus with kidney complications', name_id: 'DM tipe 2 dengan komplikasi ginjal', category: 'Penyakit Dalam' },
  { code: 'E11.5', name_en: 'Type 2 diabetes mellitus with peripheral circulatory complications', name_id: 'DM tipe 2 dengan komplikasi sirkulasi perifer', category: 'Penyakit Dalam' },
  { code: 'E11.6', name_en: 'Type 2 diabetes mellitus with other specified complications', name_id: 'DM tipe 2 dengan komplikasi lain', category: 'Penyakit Dalam' },
  { code: 'E11.9', name_en: 'Type 2 diabetes mellitus without complications', name_id: 'Diabetes melitus tipe 2 tanpa komplikasi', category: 'Penyakit Dalam' },
  { code: 'E13.9', name_en: 'Other specified diabetes mellitus without complications', name_id: 'DM lainnya tanpa komplikasi', category: 'Penyakit Dalam' },
  { code: 'E14.9', name_en: 'Unspecified diabetes mellitus without complications', name_id: 'DM tidak terspesifikasi', category: 'Penyakit Dalam' },
  { code: 'E03.9', name_en: 'Hypothyroidism, unspecified', name_id: 'Hipotiroidisme', category: 'Penyakit Dalam' },
  { code: 'E05.9', name_en: 'Thyrotoxicosis, unspecified', name_id: 'Tirotoksikosis / Hipertiroid', category: 'Penyakit Dalam' },
  { code: 'E66.9', name_en: 'Obesity, unspecified', name_id: 'Obesitas', category: 'Penyakit Dalam' },
  { code: 'E78.0', name_en: 'Pure hypercholesterolaemia', name_id: 'Hiperkolesterolemia murni', category: 'Penyakit Dalam' },
  { code: 'E78.5', name_en: 'Hyperlipidaemia, unspecified', name_id: 'Hiperlipidemia / Dislipidemia', category: 'Penyakit Dalam' },
  { code: 'E86', name_en: 'Volume depletion', name_id: 'Dehidrasi', category: 'Penyakit Dalam' },
  { code: 'E87.6', name_en: 'Hypokalaemia', name_id: 'Hipokalemia', category: 'Penyakit Dalam' },

  // Kardiovaskular
  { code: 'I10', name_en: 'Essential (primary) hypertension', name_id: 'Hipertensi esensial', category: 'Penyakit Dalam' },
  { code: 'I11.0', name_en: 'Hypertensive heart disease with heart failure', name_id: 'Penyakit jantung hipertensi dengan gagal jantung', category: 'Penyakit Dalam' },
  { code: 'I11.9', name_en: 'Hypertensive heart disease without heart failure', name_id: 'Penyakit jantung hipertensi tanpa gagal jantung', category: 'Penyakit Dalam' },
  { code: 'I13.9', name_en: 'Hypertensive heart and renal disease, unspecified', name_id: 'Penyakit jantung dan ginjal hipertensi', category: 'Penyakit Dalam' },
  { code: 'I20.0', name_en: 'Unstable angina', name_id: 'Angina tidak stabil', category: 'Penyakit Dalam' },
  { code: 'I20.9', name_en: 'Angina pectoris, unspecified', name_id: 'Angina pektoris', category: 'Penyakit Dalam' },
  { code: 'I21.0', name_en: 'Acute ST elevation myocardial infarction of anterior wall', name_id: 'STEMI dinding anterior', category: 'Penyakit Dalam' },
  { code: 'I21.1', name_en: 'Acute ST elevation myocardial infarction of inferior wall', name_id: 'STEMI dinding inferior', category: 'Penyakit Dalam' },
  { code: 'I21.9', name_en: 'Acute myocardial infarction, unspecified', name_id: 'Infark miokard akut', category: 'Penyakit Dalam' },
  { code: 'I25.1', name_en: 'Atherosclerotic heart disease', name_id: 'Penyakit jantung aterosklerotik', category: 'Penyakit Dalam' },
  { code: 'I25.9', name_en: 'Chronic ischaemic heart disease, unspecified', name_id: 'Penyakit jantung iskemik kronis', category: 'Penyakit Dalam' },
  { code: 'I42.0', name_en: 'Dilated cardiomyopathy', name_id: 'Kardiomiopati dilatasi', category: 'Penyakit Dalam' },
  { code: 'I48', name_en: 'Atrial fibrillation and flutter', name_id: 'Fibrilasi atrium', category: 'Penyakit Dalam' },
  { code: 'I49.9', name_en: 'Cardiac arrhythmia, unspecified', name_id: 'Aritmia jantung', category: 'Penyakit Dalam' },
  { code: 'I50.0', name_en: 'Congestive heart failure', name_id: 'Gagal jantung kongestif', category: 'Penyakit Dalam' },
  { code: 'I50.9', name_en: 'Heart failure, unspecified', name_id: 'Gagal jantung', category: 'Penyakit Dalam' },
  { code: 'I63.9', name_en: 'Cerebral infarction, unspecified', name_id: 'Infark serebral / Stroke iskemik', category: 'Penyakit Dalam' },
  { code: 'I61.9', name_en: 'Intracerebral haemorrhage, unspecified', name_id: 'Perdarahan intraserebral / Stroke hemoragik', category: 'Penyakit Dalam' },
  { code: 'I64', name_en: 'Stroke, not specified as haemorrhage or infarction', name_id: 'Stroke tidak terspesifikasi', category: 'Penyakit Dalam' },
  { code: 'I74.3', name_en: 'Embolism and thrombosis of arteries of lower extremities', name_id: 'Emboli dan trombosis arteri ekstremitas bawah', category: 'Penyakit Dalam' },
  { code: 'I80.2', name_en: 'Deep vein thrombosis', name_id: 'Trombosis vena dalam (DVT)', category: 'Penyakit Dalam' },
  { code: 'I26.9', name_en: 'Pulmonary embolism', name_id: 'Emboli paru', category: 'Penyakit Dalam' },

  // Penyakit saluran cerna
  { code: 'K21.0', name_en: 'GERD with oesophagitis', name_id: 'GERD dengan esofagitis', category: 'Penyakit Dalam' },
  { code: 'K25.9', name_en: 'Gastric ulcer, unspecified', name_id: 'Ulkus lambung', category: 'Penyakit Dalam' },
  { code: 'K26.9', name_en: 'Duodenal ulcer, unspecified', name_id: 'Ulkus duodenum', category: 'Penyakit Dalam' },
  { code: 'K29.7', name_en: 'Gastritis, unspecified', name_id: 'Gastritis', category: 'Penyakit Dalam' },
  { code: 'K30', name_en: 'Functional dyspepsia', name_id: 'Dispepsia fungsional', category: 'Penyakit Dalam' },
  { code: 'K35.8', name_en: 'Acute appendicitis, other and unspecified', name_id: 'Apendisitis akut', category: 'Penyakit Dalam' },
  { code: 'K40.9', name_en: 'Unilateral inguinal hernia without obstruction', name_id: 'Hernia inguinalis', category: 'Penyakit Dalam' },
  { code: 'K56.6', name_en: 'Other and unspecified intestinal obstruction', name_id: 'Obstruksi usus', category: 'Penyakit Dalam' },
  { code: 'K57.3', name_en: 'Diverticular disease of large intestine', name_id: 'Penyakit divertikular usus besar', category: 'Penyakit Dalam' },
  { code: 'K59.0', name_en: 'Constipation', name_id: 'Konstipasi', category: 'Penyakit Dalam' },
  { code: 'K70.3', name_en: 'Alcoholic cirrhosis of liver', name_id: 'Sirosis hati alkoholik', category: 'Penyakit Dalam' },
  { code: 'K74.6', name_en: 'Other and unspecified cirrhosis of liver', name_id: 'Sirosis hati', category: 'Penyakit Dalam' },
  { code: 'K76.0', name_en: 'Fatty (change of) liver', name_id: 'Perlemakan hati / Fatty liver', category: 'Penyakit Dalam' },
  { code: 'K80.2', name_en: 'Calculus of gallbladder without cholecystitis', name_id: 'Batu empedu tanpa kolesistitis', category: 'Penyakit Dalam' },
  { code: 'K81.0', name_en: 'Acute cholecystitis', name_id: 'Kolesistitis akut', category: 'Penyakit Dalam' },
  { code: 'K85.9', name_en: 'Acute pancreatitis, unspecified', name_id: 'Pankreatitis akut', category: 'Penyakit Dalam' },
  { code: 'K86.1', name_en: 'Other chronic pancreatitis', name_id: 'Pankreatitis kronis', category: 'Penyakit Dalam' },
  { code: 'K92.2', name_en: 'Gastrointestinal haemorrhage, unspecified', name_id: 'Perdarahan saluran cerna', category: 'Penyakit Dalam' },

  // Penyakit ginjal
  { code: 'N17.9', name_en: 'Acute kidney failure, unspecified', name_id: 'Gagal ginjal akut (AKI)', category: 'Penyakit Dalam' },
  { code: 'N18.5', name_en: 'Chronic kidney disease, stage 5', name_id: 'Penyakit ginjal kronis stadium 5', category: 'Penyakit Dalam' },
  { code: 'N18.9', name_en: 'Chronic kidney disease, unspecified', name_id: 'Penyakit ginjal kronis (CKD)', category: 'Penyakit Dalam' },
  { code: 'N20.0', name_en: 'Calculus of kidney', name_id: 'Batu ginjal', category: 'Penyakit Dalam' },
  { code: 'N39.0', name_en: 'Urinary tract infection, site not specified', name_id: 'Infeksi saluran kemih (ISK)', category: 'Penyakit Dalam' },

  // ============================================================
  // PARU & SALURAN NAPAS
  // ============================================================
  { code: 'J00', name_en: 'Acute nasopharyngitis (common cold)', name_id: 'Nasofaringitis akut (selesma)', category: 'Paru' },
  { code: 'J02.9', name_en: 'Acute pharyngitis, unspecified', name_id: 'Faringitis akut', category: 'Paru' },
  { code: 'J03.9', name_en: 'Acute tonsillitis, unspecified', name_id: 'Tonsilitis akut', category: 'Paru' },
  { code: 'J04.0', name_en: 'Acute laryngitis', name_id: 'Laringitis akut', category: 'Paru' },
  { code: 'J06.9', name_en: 'Acute upper respiratory infection, unspecified', name_id: 'ISPA (Infeksi saluran pernapasan atas)', category: 'Paru' },
  { code: 'J11.1', name_en: 'Influenza with other respiratory manifestations', name_id: 'Influenza', category: 'Paru' },
  { code: 'J15.9', name_en: 'Bacterial pneumonia, unspecified', name_id: 'Pneumonia bakterial', category: 'Paru' },
  { code: 'J18.0', name_en: 'Bronchopneumonia, unspecified', name_id: 'Bronkopneumonia', category: 'Paru' },
  { code: 'J18.9', name_en: 'Pneumonia, unspecified', name_id: 'Pneumonia', category: 'Paru' },
  { code: 'J20.9', name_en: 'Acute bronchitis, unspecified', name_id: 'Bronkitis akut', category: 'Paru' },
  { code: 'J42', name_en: 'Unspecified chronic bronchitis', name_id: 'Bronkitis kronis', category: 'Paru' },
  { code: 'J43.9', name_en: 'Emphysema, unspecified', name_id: 'Emfisema', category: 'Paru' },
  { code: 'J44.0', name_en: 'COPD with acute lower respiratory infection', name_id: 'PPOK dengan infeksi', category: 'Paru' },
  { code: 'J44.1', name_en: 'COPD with acute exacerbation, unspecified', name_id: 'PPOK eksaserbasi akut', category: 'Paru' },
  { code: 'J44.9', name_en: 'COPD, unspecified', name_id: 'Penyakit paru obstruktif kronis (PPOK)', category: 'Paru' },
  { code: 'J45.0', name_en: 'Predominantly allergic asthma', name_id: 'Asma predominan alergi', category: 'Paru' },
  { code: 'J45.9', name_en: 'Asthma, unspecified', name_id: 'Asma', category: 'Paru' },
  { code: 'J46', name_en: 'Status asthmaticus', name_id: 'Status asmatikus', category: 'Paru' },
  { code: 'J90', name_en: 'Pleural effusion', name_id: 'Efusi pleura', category: 'Paru' },
  { code: 'J93.1', name_en: 'Other spontaneous pneumothorax', name_id: 'Pneumotoraks spontan', category: 'Paru' },
  { code: 'J96.0', name_en: 'Acute respiratory failure', name_id: 'Gagal napas akut', category: 'Paru' },
  { code: 'J96.9', name_en: 'Respiratory failure, unspecified', name_id: 'Gagal napas', category: 'Paru' },
  { code: 'J98.4', name_en: 'Other disorders of lung', name_id: 'Gangguan paru lainnya', category: 'Paru' },

  // ============================================================
  // BEDAH (Surgery)
  // ============================================================
  { code: 'K35.2', name_en: 'Acute appendicitis with generalized peritonitis', name_id: 'Apendisitis akut dengan peritonitis', category: 'Bedah' },
  { code: 'K36', name_en: 'Other appendicitis', name_id: 'Apendisitis kronis', category: 'Bedah' },
  { code: 'K40.3', name_en: 'Unilateral inguinal hernia with obstruction', name_id: 'Hernia inguinalis dengan obstruksi', category: 'Bedah' },
  { code: 'K42.0', name_en: 'Umbilical hernia with obstruction', name_id: 'Hernia umbilikalis dengan obstruksi', category: 'Bedah' },
  { code: 'K42.9', name_en: 'Umbilical hernia without obstruction', name_id: 'Hernia umbilikalis', category: 'Bedah' },
  { code: 'K43.9', name_en: 'Ventral hernia without obstruction', name_id: 'Hernia ventralis', category: 'Bedah' },
  { code: 'K80.0', name_en: 'Calculus of gallbladder with acute cholecystitis', name_id: 'Batu empedu dengan kolesistitis akut', category: 'Bedah' },
  { code: 'K80.1', name_en: 'Calculus of gallbladder with other cholecystitis', name_id: 'Batu empedu dengan kolesistitis', category: 'Bedah' },
  { code: 'L02.2', name_en: 'Cutaneous abscess of trunk', name_id: 'Abses kulit batang tubuh', category: 'Bedah' },
  { code: 'L02.4', name_en: 'Cutaneous abscess of limb', name_id: 'Abses kulit ekstremitas', category: 'Bedah' },
  { code: 'L03.1', name_en: 'Cellulitis of other parts of limb', name_id: 'Selulitis ekstremitas', category: 'Bedah' },
  { code: 'L05.0', name_en: 'Pilonidal cyst with abscess', name_id: 'Kista pilonidal dengan abses', category: 'Bedah' },
  { code: 'L72.0', name_en: 'Epidermal cyst', name_id: 'Kista epidermal', category: 'Bedah' },
  { code: 'N40', name_en: 'Benign prostatic hyperplasia', name_id: 'Hiperplasia prostat jinak (BPH)', category: 'Bedah' },
  { code: 'N43.3', name_en: 'Hydrocele, unspecified', name_id: 'Hidrokel', category: 'Bedah' },
  { code: 'N44', name_en: 'Torsion of testis', name_id: 'Torsio testis', category: 'Bedah' },
  { code: 'N47', name_en: 'Redundant prepuce, phimosis and paraphimosis', name_id: 'Fimosis', category: 'Bedah' },
  { code: 'K60.0', name_en: 'Acute anal fissure', name_id: 'Fisura anus akut', category: 'Bedah' },
  { code: 'K61.0', name_en: 'Anal abscess', name_id: 'Abses anus', category: 'Bedah' },
  { code: 'K64.1', name_en: 'Second degree haemorrhoids', name_id: 'Hemoroid derajat 2', category: 'Bedah' },
  { code: 'K64.2', name_en: 'Third degree haemorrhoids', name_id: 'Hemoroid derajat 3', category: 'Bedah' },
  { code: 'K64.9', name_en: 'Haemorrhoids, unspecified', name_id: 'Hemoroid', category: 'Bedah' },

  // ============================================================
  // ORTOPEDI (Orthopedics)
  // ============================================================
  { code: 'M16.9', name_en: 'Osteoarthritis of hip, unspecified', name_id: 'Osteoartritis panggul', category: 'Ortopedi' },
  { code: 'M17.9', name_en: 'Osteoarthritis of knee, unspecified', name_id: 'Osteoartritis lutut', category: 'Ortopedi' },
  { code: 'M19.9', name_en: 'Osteoarthritis, unspecified', name_id: 'Osteoartritis', category: 'Ortopedi' },
  { code: 'M23.5', name_en: 'Chronic instability of knee', name_id: 'Instabilitas lutut kronis', category: 'Ortopedi' },
  { code: 'M47.8', name_en: 'Other spondylosis', name_id: 'Spondilosis', category: 'Ortopedi' },
  { code: 'M50.1', name_en: 'Cervical disc disorder with radiculopathy', name_id: 'HNP servikal dengan radikulopati', category: 'Ortopedi' },
  { code: 'M51.1', name_en: 'Lumbar disc disorder with radiculopathy', name_id: 'HNP lumbal dengan radikulopati', category: 'Ortopedi' },
  { code: 'M54.5', name_en: 'Low back pain', name_id: 'Nyeri punggung bawah (LBP)', category: 'Ortopedi' },
  { code: 'M54.9', name_en: 'Dorsalgia, unspecified', name_id: 'Nyeri punggung', category: 'Ortopedi' },
  { code: 'M65.9', name_en: 'Synovitis and tenosynovitis, unspecified', name_id: 'Sinovitis dan tenosinovitis', category: 'Ortopedi' },
  { code: 'M72.0', name_en: 'Palmar fascial fibromatosis', name_id: 'Kontraktur Dupuytren', category: 'Ortopedi' },
  { code: 'M75.1', name_en: 'Rotator cuff syndrome', name_id: 'Sindrom rotator cuff', category: 'Ortopedi' },
  { code: 'M79.3', name_en: 'Panniculitis, unspecified', name_id: 'Panikulitis', category: 'Ortopedi' },
  { code: 'S42.0', name_en: 'Fracture of clavicle', name_id: 'Fraktur klavikula', category: 'Ortopedi' },
  { code: 'S42.2', name_en: 'Fracture of upper end of humerus', name_id: 'Fraktur humerus proksimal', category: 'Ortopedi' },
  { code: 'S42.3', name_en: 'Fracture of shaft of humerus', name_id: 'Fraktur batang humerus', category: 'Ortopedi' },
  { code: 'S52.5', name_en: 'Fracture of lower end of radius', name_id: 'Fraktur radius distal', category: 'Ortopedi' },
  { code: 'S52.9', name_en: 'Fracture of forearm, part unspecified', name_id: 'Fraktur lengan bawah', category: 'Ortopedi' },
  { code: 'S62.0', name_en: 'Fracture of navicular bone of hand', name_id: 'Fraktur tulang skafoid', category: 'Ortopedi' },
  { code: 'S72.0', name_en: 'Fracture of neck of femur', name_id: 'Fraktur leher femur', category: 'Ortopedi' },
  { code: 'S72.1', name_en: 'Pertrochanteric fracture', name_id: 'Fraktur pertrokanter', category: 'Ortopedi' },
  { code: 'S72.3', name_en: 'Fracture of shaft of femur', name_id: 'Fraktur batang femur', category: 'Ortopedi' },
  { code: 'S82.0', name_en: 'Fracture of patella', name_id: 'Fraktur patela', category: 'Ortopedi' },
  { code: 'S82.1', name_en: 'Fracture of upper end of tibia', name_id: 'Fraktur tibia proksimal', category: 'Ortopedi' },
  { code: 'S82.2', name_en: 'Fracture of shaft of tibia', name_id: 'Fraktur batang tibia', category: 'Ortopedi' },
  { code: 'S82.6', name_en: 'Fracture of lateral malleolus', name_id: 'Fraktur malleolus lateral', category: 'Ortopedi' },
  { code: 'S82.8', name_en: 'Fractures of other parts of lower leg', name_id: 'Fraktur tungkai bawah lainnya', category: 'Ortopedi' },
  { code: 'S92.0', name_en: 'Fracture of calcaneus', name_id: 'Fraktur kalkaneus', category: 'Ortopedi' },
  { code: 'M80.9', name_en: 'Osteoporosis with pathological fracture', name_id: 'Osteoporosis dengan fraktur patologis', category: 'Ortopedi' },
  { code: 'M81.9', name_en: 'Osteoporosis, unspecified', name_id: 'Osteoporosis', category: 'Ortopedi' },

  // ============================================================
  // ANAK (Pediatrics)
  // ============================================================
  { code: 'A08.0', name_en: 'Rotaviral enteritis', name_id: 'Enteritis rotavirus', category: 'Anak' },
  { code: 'B05.9', name_en: 'Measles without complication', name_id: 'Campak', category: 'Anak' },
  { code: 'B01.9', name_en: 'Varicella without complication', name_id: 'Varisela (cacar air)', category: 'Anak' },
  { code: 'B26.9', name_en: 'Mumps without complication', name_id: 'Gondong (parotitis)', category: 'Anak' },
  { code: 'J21.9', name_en: 'Acute bronchiolitis, unspecified', name_id: 'Bronkiolitis akut', category: 'Anak' },
  { code: 'J45.1', name_en: 'Nonallergic asthma', name_id: 'Asma non-alergi pada anak', category: 'Anak' },
  { code: 'P07.3', name_en: 'Other preterm infants', name_id: 'Bayi prematur', category: 'Anak' },
  { code: 'P22.0', name_en: 'Respiratory distress syndrome of newborn', name_id: 'Sindrom gawat napas neonatal', category: 'Anak' },
  { code: 'P36.9', name_en: 'Bacterial sepsis of newborn, unspecified', name_id: 'Sepsis neonatal', category: 'Anak' },
  { code: 'P59.9', name_en: 'Neonatal jaundice, unspecified', name_id: 'Ikterus neonatal', category: 'Anak' },
  { code: 'R50.9', name_en: 'Fever, unspecified', name_id: 'Demam tidak terspesifikasi', category: 'Anak' },
  { code: 'R11', name_en: 'Nausea and vomiting', name_id: 'Mual dan muntah', category: 'Anak' },
  { code: 'E40', name_en: 'Kwashiorkor', name_id: 'Kwashiorkor', category: 'Anak' },
  { code: 'E41', name_en: 'Nutritional marasmus', name_id: 'Marasmus', category: 'Anak' },
  { code: 'E43', name_en: 'Unspecified severe protein-energy malnutrition', name_id: 'Gizi buruk', category: 'Anak' },
  { code: 'E44.0', name_en: 'Moderate protein-energy malnutrition', name_id: 'Gizi kurang sedang', category: 'Anak' },
  { code: 'E46', name_en: 'Unspecified protein-energy malnutrition', name_id: 'Gizi kurang', category: 'Anak' },
  { code: 'R56.0', name_en: 'Febrile convulsions', name_id: 'Kejang demam', category: 'Anak' },
  { code: 'G40.9', name_en: 'Epilepsy, unspecified', name_id: 'Epilepsi', category: 'Anak' },

  // ============================================================
  // OBSTETRI & GINEKOLOGI
  // ============================================================
  { code: 'O00.1', name_en: 'Tubal pregnancy', name_id: 'Kehamilan tuba (KET)', category: 'Obstetri' },
  { code: 'O03.9', name_en: 'Complete spontaneous abortion', name_id: 'Abortus spontan komplit', category: 'Obstetri' },
  { code: 'O06.9', name_en: 'Unspecified abortion, complete', name_id: 'Abortus tidak terspesifikasi', category: 'Obstetri' },
  { code: 'O14.1', name_en: 'Severe pre-eclampsia', name_id: 'Preeklamsia berat', category: 'Obstetri' },
  { code: 'O14.9', name_en: 'Pre-eclampsia, unspecified', name_id: 'Preeklamsia', category: 'Obstetri' },
  { code: 'O15.0', name_en: 'Eclampsia in pregnancy', name_id: 'Eklamsia dalam kehamilan', category: 'Obstetri' },
  { code: 'O20.0', name_en: 'Threatened abortion', name_id: 'Abortus imminens', category: 'Obstetri' },
  { code: 'O24.4', name_en: 'Gestational diabetes mellitus', name_id: 'Diabetes gestasional', category: 'Obstetri' },
  { code: 'O26.8', name_en: 'Other specified pregnancy-related conditions', name_id: 'Kondisi kehamilan lainnya', category: 'Obstetri' },
  { code: 'O34.2', name_en: 'Maternal care for uterine scar from previous surgery', name_id: 'Perawatan bekas SC sebelumnya', category: 'Obstetri' },
  { code: 'O36.4', name_en: 'Maternal care for intrauterine death', name_id: 'IUFD', category: 'Obstetri' },
  { code: 'O42.9', name_en: 'Premature rupture of membranes, unspecified', name_id: 'Ketuban pecah dini (KPD)', category: 'Obstetri' },
  { code: 'O44.1', name_en: 'Placenta praevia with haemorrhage', name_id: 'Plasenta previa dengan perdarahan', category: 'Obstetri' },
  { code: 'O45.9', name_en: 'Premature separation of placenta (abruptio placentae)', name_id: 'Solusio plasenta', category: 'Obstetri' },
  { code: 'O47.0', name_en: 'False labour before 37 completed weeks', name_id: 'Persalinan palsu prematur', category: 'Obstetri' },
  { code: 'O60', name_en: 'Preterm labour', name_id: 'Persalinan prematur', category: 'Obstetri' },
  { code: 'O62.1', name_en: 'Secondary uterine inertia', name_id: 'Inersia uterus sekunder', category: 'Obstetri' },
  { code: 'O63.9', name_en: 'Long labour, unspecified', name_id: 'Partus lama', category: 'Obstetri' },
  { code: 'O68.0', name_en: 'Labour complicated by fetal heart rate anomaly', name_id: 'Gawat janin', category: 'Obstetri' },
  { code: 'O72.1', name_en: 'Other immediate postpartum haemorrhage', name_id: 'Perdarahan postpartum', category: 'Obstetri' },
  { code: 'O80', name_en: 'Single spontaneous delivery', name_id: 'Persalinan spontan', category: 'Obstetri' },
  { code: 'O82', name_en: 'Single delivery by caesarean section', name_id: 'Persalinan sesar (SC)', category: 'Obstetri' },
  { code: 'O85', name_en: 'Puerperal sepsis', name_id: 'Sepsis puerperalis', category: 'Obstetri' },
  { code: 'O99.0', name_en: 'Anaemia complicating pregnancy', name_id: 'Anemia pada kehamilan', category: 'Obstetri' },

  // Ginekologi
  { code: 'D25.9', name_en: 'Leiomyoma of uterus, unspecified', name_id: 'Mioma uteri', category: 'Obstetri' },
  { code: 'N70.9', name_en: 'Salpingitis and oophoritis, unspecified', name_id: 'Salpingitis dan ooforitis', category: 'Obstetri' },
  { code: 'N73.0', name_en: 'Acute parametritis and pelvic cellulitis', name_id: 'Parametritis akut', category: 'Obstetri' },
  { code: 'N76.0', name_en: 'Acute vaginitis', name_id: 'Vaginitis akut', category: 'Obstetri' },
  { code: 'N80.9', name_en: 'Endometriosis, unspecified', name_id: 'Endometriosis', category: 'Obstetri' },
  { code: 'N83.2', name_en: 'Other ovarian cysts', name_id: 'Kista ovarium', category: 'Obstetri' },
  { code: 'N84.0', name_en: 'Polyp of corpus uteri', name_id: 'Polip uterus', category: 'Obstetri' },
  { code: 'N85.0', name_en: 'Endometrial glandular hyperplasia', name_id: 'Hiperplasia endometrium', category: 'Obstetri' },
  { code: 'N92.0', name_en: 'Excessive and frequent menstruation', name_id: 'Menorrhagia', category: 'Obstetri' },
  { code: 'N92.1', name_en: 'Excessive menstruation at irregular intervals', name_id: 'Metrorhagia', category: 'Obstetri' },

  // ============================================================
  // MATA (Ophthalmology)
  // ============================================================
  { code: 'H10.0', name_en: 'Mucopurulent conjunctivitis', name_id: 'Konjungtivitis mukopurulen', category: 'Mata' },
  { code: 'H10.1', name_en: 'Acute atopic conjunctivitis', name_id: 'Konjungtivitis alergi akut', category: 'Mata' },
  { code: 'H10.9', name_en: 'Conjunctivitis, unspecified', name_id: 'Konjungtivitis', category: 'Mata' },
  { code: 'H11.0', name_en: 'Pterygium', name_id: 'Pterigium', category: 'Mata' },
  { code: 'H16.0', name_en: 'Corneal ulcer', name_id: 'Ulkus kornea', category: 'Mata' },
  { code: 'H25.9', name_en: 'Senile cataract, unspecified', name_id: 'Katarak senilis', category: 'Mata' },
  { code: 'H26.9', name_en: 'Cataract, unspecified', name_id: 'Katarak', category: 'Mata' },
  { code: 'H33.0', name_en: 'Retinal detachment with retinal break', name_id: 'Ablasi retina', category: 'Mata' },
  { code: 'H34.1', name_en: 'Central retinal artery occlusion', name_id: 'Oklusi arteri retina sentral', category: 'Mata' },
  { code: 'H35.3', name_en: 'Degeneration of macula and posterior pole', name_id: 'Degenerasi makula', category: 'Mata' },
  { code: 'H36.0', name_en: 'Diabetic retinopathy', name_id: 'Retinopati diabetik', category: 'Mata' },
  { code: 'H40.1', name_en: 'Primary open-angle glaucoma', name_id: 'Glaukoma sudut terbuka', category: 'Mata' },
  { code: 'H40.2', name_en: 'Primary angle-closure glaucoma', name_id: 'Glaukoma sudut tertutup', category: 'Mata' },
  { code: 'H40.9', name_en: 'Glaucoma, unspecified', name_id: 'Glaukoma', category: 'Mata' },
  { code: 'H43.1', name_en: 'Vitreous haemorrhage', name_id: 'Perdarahan vitreus', category: 'Mata' },
  { code: 'H52.1', name_en: 'Myopia', name_id: 'Miopia (rabun jauh)', category: 'Mata' },
  { code: 'H52.0', name_en: 'Hypermetropia', name_id: 'Hipermetropia (rabun dekat)', category: 'Mata' },
  { code: 'H52.4', name_en: 'Presbyopia', name_id: 'Presbiopia', category: 'Mata' },
  { code: 'H53.4', name_en: 'Visual field defects', name_id: 'Defek lapang pandang', category: 'Mata' },

  // ============================================================
  // THT (ENT)
  // ============================================================
  { code: 'H60.9', name_en: 'Otitis externa, unspecified', name_id: 'Otitis eksterna', category: 'THT' },
  { code: 'H65.9', name_en: 'Nonsuppurative otitis media, unspecified', name_id: 'Otitis media non-supuratif', category: 'THT' },
  { code: 'H66.0', name_en: 'Acute suppurative otitis media', name_id: 'Otitis media supuratif akut (OMA)', category: 'THT' },
  { code: 'H66.1', name_en: 'Chronic tubotympanic suppurative otitis media', name_id: 'OMSK tipe aman', category: 'THT' },
  { code: 'H66.9', name_en: 'Otitis media, unspecified', name_id: 'Otitis media', category: 'THT' },
  { code: 'H72.9', name_en: 'Perforation of tympanic membrane, unspecified', name_id: 'Perforasi membran timpani', category: 'THT' },
  { code: 'H81.0', name_en: 'Meniere disease', name_id: 'Penyakit Meniere', category: 'THT' },
  { code: 'H81.1', name_en: 'Benign paroxysmal positional vertigo', name_id: 'BPPV', category: 'THT' },
  { code: 'H91.9', name_en: 'Hearing loss, unspecified', name_id: 'Gangguan pendengaran', category: 'THT' },
  { code: 'J01.9', name_en: 'Acute sinusitis, unspecified', name_id: 'Sinusitis akut', category: 'THT' },
  { code: 'J32.9', name_en: 'Chronic sinusitis, unspecified', name_id: 'Sinusitis kronis', category: 'THT' },
  { code: 'J33.0', name_en: 'Polyp of nasal cavity', name_id: 'Polip hidung', category: 'THT' },
  { code: 'J34.2', name_en: 'Deviated nasal septum', name_id: 'Deviasi septum nasi', category: 'THT' },
  { code: 'J35.0', name_en: 'Chronic tonsillitis', name_id: 'Tonsilitis kronis', category: 'THT' },
  { code: 'J35.1', name_en: 'Hypertrophy of tonsils', name_id: 'Hipertrofi tonsil', category: 'THT' },
  { code: 'J35.2', name_en: 'Hypertrophy of adenoids', name_id: 'Hipertrofi adenoid', category: 'THT' },
  { code: 'J35.3', name_en: 'Hypertrophy of tonsils with hypertrophy of adenoids', name_id: 'Hipertrofi tonsil dan adenoid', category: 'THT' },
  { code: 'J38.0', name_en: 'Paralysis of vocal cords', name_id: 'Paralisis pita suara', category: 'THT' },
  { code: 'R04.0', name_en: 'Epistaxis', name_id: 'Epistaksis (mimisan)', category: 'THT' },
  { code: 'J30.1', name_en: 'Allergic rhinitis due to pollen', name_id: 'Rhinitis alergi', category: 'THT' },

  // ============================================================
  // KULIT (Dermatology)
  // ============================================================
  { code: 'L20.9', name_en: 'Atopic dermatitis, unspecified', name_id: 'Dermatitis atopik', category: 'Kulit' },
  { code: 'L23.9', name_en: 'Allergic contact dermatitis', name_id: 'Dermatitis kontak alergi', category: 'Kulit' },
  { code: 'L25.9', name_en: 'Unspecified contact dermatitis', name_id: 'Dermatitis kontak', category: 'Kulit' },
  { code: 'L30.9', name_en: 'Dermatitis, unspecified', name_id: 'Dermatitis', category: 'Kulit' },
  { code: 'L40.0', name_en: 'Psoriasis vulgaris', name_id: 'Psoriasis vulgaris', category: 'Kulit' },
  { code: 'L50.0', name_en: 'Allergic urticaria', name_id: 'Urtikaria alergi', category: 'Kulit' },
  { code: 'L50.9', name_en: 'Urticaria, unspecified', name_id: 'Urtikaria', category: 'Kulit' },
  { code: 'L60.0', name_en: 'Ingrowing nail', name_id: 'Kuku tumbuh ke dalam (ingrown nail)', category: 'Kulit' },
  { code: 'B35.0', name_en: 'Tinea barbae and tinea capitis', name_id: 'Tinea kapitis', category: 'Kulit' },
  { code: 'B35.3', name_en: 'Tinea pedis', name_id: 'Tinea pedis (kutu air)', category: 'Kulit' },
  { code: 'B35.4', name_en: 'Tinea corporis', name_id: 'Tinea korporis', category: 'Kulit' },
  { code: 'B36.0', name_en: 'Pityriasis versicolor', name_id: 'Panu (pitiriasis versikolor)', category: 'Kulit' },
  { code: 'B02.9', name_en: 'Herpes zoster without complication', name_id: 'Herpes zoster', category: 'Kulit' },
  { code: 'B00.1', name_en: 'Herpesviral vesicular dermatitis', name_id: 'Herpes simpleks kulit', category: 'Kulit' },
  { code: 'B86', name_en: 'Scabies', name_id: 'Skabies (kudis)', category: 'Kulit' },
  { code: 'L70.0', name_en: 'Acne vulgaris', name_id: 'Akne vulgaris (jerawat)', category: 'Kulit' },
  { code: 'L73.2', name_en: 'Hidradenitis suppurativa', name_id: 'Hidradenitis supurativa', category: 'Kulit' },
  { code: 'L80', name_en: 'Vitiligo', name_id: 'Vitiligo', category: 'Kulit' },
  { code: 'L81.1', name_en: 'Chloasma', name_id: 'Melasma / Kloasma', category: 'Kulit' },

  // ============================================================
  // NEUROLOGI (Neurology)
  // ============================================================
  { code: 'G00.9', name_en: 'Bacterial meningitis, unspecified', name_id: 'Meningitis bakterial', category: 'Neurologi' },
  { code: 'G03.9', name_en: 'Meningitis, unspecified', name_id: 'Meningitis', category: 'Neurologi' },
  { code: 'G20', name_en: 'Parkinson disease', name_id: 'Penyakit Parkinson', category: 'Neurologi' },
  { code: 'G35', name_en: 'Multiple sclerosis', name_id: 'Sklerosis multipel', category: 'Neurologi' },
  { code: 'G40.0', name_en: 'Localization-related (focal)(partial) idiopathic epilepsy', name_id: 'Epilepsi fokal idiopatik', category: 'Neurologi' },
  { code: 'G43.9', name_en: 'Migraine, unspecified', name_id: 'Migren', category: 'Neurologi' },
  { code: 'G44.2', name_en: 'Tension-type headache', name_id: 'Nyeri kepala tipe tegang', category: 'Neurologi' },
  { code: 'G50.0', name_en: 'Trigeminal neuralgia', name_id: 'Neuralgia trigeminal', category: 'Neurologi' },
  { code: 'G51.0', name_en: 'Bell palsy', name_id: 'Bell palsy', category: 'Neurologi' },
  { code: 'G56.0', name_en: 'Carpal tunnel syndrome', name_id: 'Sindrom terowongan karpal (CTS)', category: 'Neurologi' },
  { code: 'G61.0', name_en: 'Guillain-Barre syndrome', name_id: 'Sindrom Guillain-Barre', category: 'Neurologi' },
  { code: 'G81.9', name_en: 'Hemiplegia, unspecified', name_id: 'Hemiplegia', category: 'Neurologi' },
  { code: 'G91.9', name_en: 'Hydrocephalus, unspecified', name_id: 'Hidrosefalus', category: 'Neurologi' },
  { code: 'R51', name_en: 'Headache', name_id: 'Nyeri kepala / Cephalgia', category: 'Neurologi' },

  // ============================================================
  // ONKOLOGI (Oncology)
  // ============================================================
  { code: 'C16.9', name_en: 'Malignant neoplasm of stomach, unspecified', name_id: 'Kanker lambung', category: 'Onkologi' },
  { code: 'C18.9', name_en: 'Malignant neoplasm of colon, unspecified', name_id: 'Kanker kolon', category: 'Onkologi' },
  { code: 'C20', name_en: 'Malignant neoplasm of rectum', name_id: 'Kanker rektum', category: 'Onkologi' },
  { code: 'C22.0', name_en: 'Liver cell carcinoma', name_id: 'Karsinoma hepatoseluler', category: 'Onkologi' },
  { code: 'C34.9', name_en: 'Malignant neoplasm of bronchus or lung, unspecified', name_id: 'Kanker paru', category: 'Onkologi' },
  { code: 'C50.9', name_en: 'Malignant neoplasm of breast, unspecified', name_id: 'Kanker payudara', category: 'Onkologi' },
  { code: 'C53.9', name_en: 'Malignant neoplasm of cervix uteri, unspecified', name_id: 'Kanker serviks', category: 'Onkologi' },
  { code: 'C56', name_en: 'Malignant neoplasm of ovary', name_id: 'Kanker ovarium', category: 'Onkologi' },
  { code: 'C61', name_en: 'Malignant neoplasm of prostate', name_id: 'Kanker prostat', category: 'Onkologi' },
  { code: 'C67.9', name_en: 'Malignant neoplasm of bladder, unspecified', name_id: 'Kanker kandung kemih', category: 'Onkologi' },
  { code: 'C71.9', name_en: 'Malignant neoplasm of brain, unspecified', name_id: 'Kanker otak', category: 'Onkologi' },
  { code: 'C73', name_en: 'Malignant neoplasm of thyroid gland', name_id: 'Kanker tiroid', category: 'Onkologi' },
  { code: 'C76.0', name_en: 'Malignant neoplasm of head, face and neck', name_id: 'Kanker kepala dan leher', category: 'Onkologi' },
  { code: 'C81.9', name_en: 'Hodgkin lymphoma, unspecified', name_id: 'Limfoma Hodgkin', category: 'Onkologi' },
  { code: 'C85.9', name_en: 'Non-Hodgkin lymphoma, unspecified', name_id: 'Limfoma non-Hodgkin', category: 'Onkologi' },
  { code: 'C91.0', name_en: 'Acute lymphoblastic leukaemia', name_id: 'Leukemia limfoblastik akut (ALL)', category: 'Onkologi' },
  { code: 'C92.0', name_en: 'Acute myeloblastic leukaemia', name_id: 'Leukemia mieloblastik akut (AML)', category: 'Onkologi' },
  { code: 'C95.9', name_en: 'Leukaemia, unspecified', name_id: 'Leukemia', category: 'Onkologi' },
  { code: 'D17.9', name_en: 'Benign lipomatous neoplasm, unspecified', name_id: 'Lipoma', category: 'Onkologi' },

  // ============================================================
  // IGD & TRAUMA (Emergency)
  // ============================================================
  { code: 'T07', name_en: 'Multiple injuries, unspecified', name_id: 'Cedera multipel', category: 'IGD' },
  { code: 'T14.0', name_en: 'Superficial injury of unspecified body region', name_id: 'Cedera superfisial', category: 'IGD' },
  { code: 'T14.1', name_en: 'Open wound of unspecified body region', name_id: 'Luka terbuka', category: 'IGD' },
  { code: 'S00.9', name_en: 'Superficial injury of head, unspecified', name_id: 'Cedera kepala ringan', category: 'IGD' },
  { code: 'S01.9', name_en: 'Open wound of head, part unspecified', name_id: 'Luka terbuka di kepala', category: 'IGD' },
  { code: 'S06.0', name_en: 'Concussion', name_id: 'Gegar otak (komosio)', category: 'IGD' },
  { code: 'S06.9', name_en: 'Intracranial injury, unspecified', name_id: 'Cedera intrakranial', category: 'IGD' },
  { code: 'S09.9', name_en: 'Unspecified injury of head', name_id: 'Cedera kepala', category: 'IGD' },
  { code: 'S22.3', name_en: 'Fracture of rib', name_id: 'Fraktur iga', category: 'IGD' },
  { code: 'T30.0', name_en: 'Burn of unspecified body region, unspecified degree', name_id: 'Luka bakar', category: 'IGD' },
  { code: 'T56.0', name_en: 'Toxic effects of lead', name_id: 'Keracunan timbal', category: 'IGD' },
  { code: 'T58', name_en: 'Toxic effect of carbon monoxide', name_id: 'Keracunan CO', category: 'IGD' },
  { code: 'T63.0', name_en: 'Toxic effect of snake venom', name_id: 'Gigitan ular berbisa', category: 'IGD' },
  { code: 'T65.9', name_en: 'Toxic effect of unspecified substance', name_id: 'Keracunan zat tidak terspesifikasi', category: 'IGD' },
  { code: 'T78.2', name_en: 'Anaphylactic shock, unspecified', name_id: 'Syok anafilaktik', category: 'IGD' },
  { code: 'T78.4', name_en: 'Allergy, unspecified', name_id: 'Alergi tidak terspesifikasi', category: 'IGD' },
  { code: 'T81.4', name_en: 'Infection following a procedure', name_id: 'Infeksi pasca prosedur', category: 'IGD' },
  { code: 'V89.2', name_en: 'Person injured in unspecified motor-vehicle accident', name_id: 'Kecelakaan lalu lintas', category: 'IGD' },
  { code: 'W19', name_en: 'Unspecified fall', name_id: 'Jatuh', category: 'IGD' },
  { code: 'X59', name_en: 'Exposure to unspecified factor', name_id: 'Paparan faktor tidak terspesifikasi', category: 'IGD' },

  // ============================================================
  // GIGI & MULUT (Dentistry)
  // ============================================================
  { code: 'K02.1', name_en: 'Dental caries of dentine', name_id: 'Karies gigi dentin', category: 'Gigi' },
  { code: 'K02.9', name_en: 'Dental caries, unspecified', name_id: 'Karies gigi', category: 'Gigi' },
  { code: 'K04.0', name_en: 'Pulpitis', name_id: 'Pulpitis', category: 'Gigi' },
  { code: 'K04.7', name_en: 'Periapical abscess without sinus', name_id: 'Abses periapikal', category: 'Gigi' },
  { code: 'K05.0', name_en: 'Acute gingivitis', name_id: 'Gingivitis akut', category: 'Gigi' },
  { code: 'K05.1', name_en: 'Chronic gingivitis', name_id: 'Gingivitis kronis', category: 'Gigi' },
  { code: 'K05.3', name_en: 'Chronic periodontitis', name_id: 'Periodontitis kronis', category: 'Gigi' },
  { code: 'K08.1', name_en: 'Loss of teeth due to accident or extraction', name_id: 'Kehilangan gigi', category: 'Gigi' },
  { code: 'K12.0', name_en: 'Recurrent oral aphthae', name_id: 'Sariawan (stomatitis aftosa)', category: 'Gigi' },
  { code: 'K12.1', name_en: 'Other forms of stomatitis', name_id: 'Stomatitis', category: 'Gigi' },

  // ============================================================
  // JIWA / PSIKIATRI (Psychiatry)
  // ============================================================
  { code: 'F10.2', name_en: 'Mental and behavioural disorders due to alcohol, dependence', name_id: 'Ketergantungan alkohol', category: 'Psikiatri' },
  { code: 'F20.0', name_en: 'Paranoid schizophrenia', name_id: 'Skizofrenia paranoid', category: 'Psikiatri' },
  { code: 'F20.9', name_en: 'Schizophrenia, unspecified', name_id: 'Skizofrenia', category: 'Psikiatri' },
  { code: 'F31.9', name_en: 'Bipolar affective disorder, unspecified', name_id: 'Gangguan bipolar', category: 'Psikiatri' },
  { code: 'F32.0', name_en: 'Mild depressive episode', name_id: 'Episode depresif ringan', category: 'Psikiatri' },
  { code: 'F32.1', name_en: 'Moderate depressive episode', name_id: 'Episode depresif sedang', category: 'Psikiatri' },
  { code: 'F32.2', name_en: 'Severe depressive episode without psychotic symptoms', name_id: 'Episode depresif berat tanpa gejala psikotik', category: 'Psikiatri' },
  { code: 'F32.9', name_en: 'Depressive episode, unspecified', name_id: 'Episode depresif', category: 'Psikiatri' },
  { code: 'F33.9', name_en: 'Recurrent depressive disorder, unspecified', name_id: 'Gangguan depresif berulang', category: 'Psikiatri' },
  { code: 'F41.0', name_en: 'Panic disorder', name_id: 'Gangguan panik', category: 'Psikiatri' },
  { code: 'F41.1', name_en: 'Generalized anxiety disorder', name_id: 'Gangguan cemas menyeluruh (GAD)', category: 'Psikiatri' },
  { code: 'F41.9', name_en: 'Anxiety disorder, unspecified', name_id: 'Gangguan cemas', category: 'Psikiatri' },
  { code: 'F43.1', name_en: 'Post-traumatic stress disorder', name_id: 'PTSD', category: 'Psikiatri' },
  { code: 'F43.2', name_en: 'Adjustment disorders', name_id: 'Gangguan penyesuaian', category: 'Psikiatri' },
  { code: 'F51.0', name_en: 'Nonorganic insomnia', name_id: 'Insomnia', category: 'Psikiatri' },

  // ============================================================
  // UROLOGI (Urology)
  // ============================================================
  { code: 'N20.1', name_en: 'Calculus of ureter', name_id: 'Batu ureter', category: 'Urologi' },
  { code: 'N20.9', name_en: 'Urinary calculus, unspecified', name_id: 'Batu saluran kemih', category: 'Urologi' },
  { code: 'N21.0', name_en: 'Calculus in bladder', name_id: 'Batu kandung kemih', category: 'Urologi' },
  { code: 'N23', name_en: 'Unspecified renal colic', name_id: 'Kolik ginjal', category: 'Urologi' },
  { code: 'N30.0', name_en: 'Acute cystitis', name_id: 'Sistitis akut', category: 'Urologi' },
  { code: 'N41.0', name_en: 'Acute prostatitis', name_id: 'Prostatitis akut', category: 'Urologi' },
  { code: 'N45.9', name_en: 'Orchitis, epididymitis and epididymo-orchitis', name_id: 'Orkitis dan epididimitis', category: 'Urologi' },

  // ============================================================
  // GEJALA & TANDA UMUM (Symptoms)
  // ============================================================
  { code: 'R00.0', name_en: 'Tachycardia, unspecified', name_id: 'Takikardia', category: 'Gejala' },
  { code: 'R06.0', name_en: 'Dyspnoea', name_id: 'Sesak napas / Dispnea', category: 'Gejala' },
  { code: 'R07.4', name_en: 'Chest pain, unspecified', name_id: 'Nyeri dada', category: 'Gejala' },
  { code: 'R10.4', name_en: 'Other and unspecified abdominal pain', name_id: 'Nyeri perut', category: 'Gejala' },
  { code: 'R10.0', name_en: 'Acute abdomen', name_id: 'Akut abdomen', category: 'Gejala' },
  { code: 'R17', name_en: 'Unspecified jaundice', name_id: 'Ikterus', category: 'Gejala' },
  { code: 'R40.0', name_en: 'Somnolence', name_id: 'Somnolen / Penurunan kesadaran', category: 'Gejala' },
  { code: 'R42', name_en: 'Dizziness and giddiness', name_id: 'Pusing / Vertigo', category: 'Gejala' },
  { code: 'R50.0', name_en: 'Fever with chills', name_id: 'Demam dengan menggigil', category: 'Gejala' },
  { code: 'R55', name_en: 'Syncope and collapse', name_id: 'Sinkop (pingsan)', category: 'Gejala' },
  { code: 'R57.0', name_en: 'Cardiogenic shock', name_id: 'Syok kardiogenik', category: 'Gejala' },
  { code: 'R57.1', name_en: 'Hypovolaemic shock', name_id: 'Syok hipovolemik', category: 'Gejala' },
  { code: 'R57.8', name_en: 'Other shock', name_id: 'Syok lainnya', category: 'Gejala' },
  { code: 'R73.0', name_en: 'Abnormal glucose tolerance test', name_id: 'Tes toleransi glukosa abnormal', category: 'Gejala' },

  // ============================================================
  // SEPSIS & INFEKSI BERAT
  // ============================================================
  { code: 'A40.9', name_en: 'Streptococcal sepsis, unspecified', name_id: 'Sepsis streptokokus', category: 'Penyakit Dalam' },
  { code: 'A41.9', name_en: 'Sepsis, unspecified', name_id: 'Sepsis', category: 'Penyakit Dalam' },
  { code: 'R65.1', name_en: 'Systemic inflammatory response syndrome of infectious origin with organ failure', name_id: 'SIRS infeksi dengan gagal organ', category: 'Penyakit Dalam' },

  // ============================================================
  // ADDITIONAL COMMON CODES
  // ============================================================
  { code: 'Z00.0', name_en: 'General medical examination', name_id: 'Pemeriksaan umum', category: 'Gejala' },
  { code: 'Z01.0', name_en: 'Examination of eyes and vision', name_id: 'Pemeriksaan mata', category: 'Gejala' },
  { code: 'Z03.9', name_en: 'Observation for suspected disease or condition, unspecified', name_id: 'Observasi kasus suspek', category: 'Gejala' },
  { code: 'Z09.9', name_en: 'Follow-up examination after treatment', name_id: 'Pemeriksaan kontrol pasca pengobatan', category: 'Gejala' },
  { code: 'Z34.0', name_en: 'Supervision of first normal pregnancy', name_id: 'Pemeriksaan kehamilan pertama', category: 'Obstetri' },
  { code: 'Z34.9', name_en: 'Supervision of normal pregnancy, unspecified', name_id: 'Pemeriksaan kehamilan', category: 'Obstetri' },
  { code: 'Z39.0', name_en: 'Care and examination immediately after delivery', name_id: 'Perawatan pasca persalinan', category: 'Obstetri' },
  { code: 'Z53.0', name_en: 'Procedure not carried out because of contraindication', name_id: 'Prosedur batal karena kontraindikasi', category: 'Gejala' },

  // Artritis & Reumatologi
  { code: 'M05.9', name_en: 'Rheumatoid arthritis, unspecified', name_id: 'Artritis reumatoid', category: 'Penyakit Dalam' },
  { code: 'M06.9', name_en: 'Rheumatoid arthritis, unspecified', name_id: 'Artritis reumatoid (lainnya)', category: 'Penyakit Dalam' },
  { code: 'M10.9', name_en: 'Gout, unspecified', name_id: 'Gout (asam urat)', category: 'Penyakit Dalam' },
  { code: 'M13.9', name_en: 'Arthritis, unspecified', name_id: 'Artritis', category: 'Penyakit Dalam' },
  { code: 'M32.9', name_en: 'Systemic lupus erythematosus, unspecified', name_id: 'SLE (Lupus)', category: 'Penyakit Dalam' },
  { code: 'M79.1', name_en: 'Myalgia', name_id: 'Mialgia (nyeri otot)', category: 'Penyakit Dalam' },
  { code: 'M79.6', name_en: 'Pain in limb', name_id: 'Nyeri anggota gerak', category: 'Penyakit Dalam' },
]

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('icd10_codes').del()

  // Batch insert, 100 per batch
  const BATCH = 100
  for (let i = 0; i < ICD10_DATA.length; i += BATCH) {
    const batch = ICD10_DATA.slice(i, i + BATCH)
    await knex('icd10_codes').insert(batch)
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${ICD10_DATA.length} ICD-10 codes`)
}
