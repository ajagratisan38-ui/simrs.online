import type { Knex } from 'knex'

interface KfaEntry {
  code: string
  name: string
  nama_dagang: string
  kekuatan: string
  bentuk_sediaan: string
  kategori: string
  golongan: string
  pabrik: string
  nie: string
}

const KFA_DATA: KfaEntry[] = [
  // ===== Antibiotik =====
  { code: '93001437', name: 'Amoxicillin 500 mg Kaplet', nama_dagang: 'Amoxicillin', kekuatan: '500 mg', bentuk_sediaan: 'Kaplet', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408501617A1' },
  { code: '93001438', name: 'Amoxicillin 250 mg/5 mL Sirup Kering', nama_dagang: 'Amoxicillin', kekuatan: '250 mg/5 mL', bentuk_sediaan: 'Sirup Kering', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408501817B1' },
  { code: '93001101', name: 'Ampicillin 500 mg Serbuk Injeksi', nama_dagang: 'Ampicillin', kekuatan: '500 mg', bentuk_sediaan: 'Serbuk Injeksi', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Phapros Tbk', nie: 'GKL0308500117A1' },
  { code: '93001201', name: 'Ceftriaxone 1 g Serbuk Injeksi', nama_dagang: 'Ceftriaxone', kekuatan: '1 g', bentuk_sediaan: 'Serbuk Injeksi', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Dexa Medica', nie: 'GKL1208504117A1' },
  { code: '93001202', name: 'Cefotaxime 1 g Serbuk Injeksi', nama_dagang: 'Cefotaxime', kekuatan: '1 g', bentuk_sediaan: 'Serbuk Injeksi', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Bernofarm', nie: 'GKL0508502417A1' },
  { code: '93001203', name: 'Cefixime 100 mg Kapsul', nama_dagang: 'Cefixime', kekuatan: '100 mg', bentuk_sediaan: 'Kapsul', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Sanbe Farma', nie: 'GKL0708503017A1' },
  { code: '93001204', name: 'Cefadroxil 500 mg Kapsul', nama_dagang: 'Cefadroxil', kekuatan: '500 mg', bentuk_sediaan: 'Kapsul', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Hexpharm Jaya', nie: 'GKL0608502817A1' },
  { code: '93001301', name: 'Ciprofloxacin 500 mg Tablet Salut Selaput', nama_dagang: 'Ciprofloxacin', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Indofarma Tbk', nie: 'GKL0208500917A1' },
  { code: '93001302', name: 'Levofloxacin 500 mg Tablet Salut Selaput', nama_dagang: 'Levofloxacin', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Kalbe Farma Tbk', nie: 'GKL1008505017A1' },
  { code: '93001401', name: 'Metronidazole 500 mg Tablet', nama_dagang: 'Metronidazole', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408501917A1' },
  { code: '93001402', name: 'Metronidazole 500 mg/100 mL Infus', nama_dagang: 'Metronidazole Infus', kekuatan: '500 mg/100 mL', bentuk_sediaan: 'Infus', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Widatra Bhakti', nie: 'GKL1108505517A1' },
  { code: '93001501', name: 'Azithromycin 500 mg Tablet Salut Selaput', nama_dagang: 'Azithromycin', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Dexa Medica', nie: 'GKL1208504217A1' },
  { code: '93001502', name: 'Erythromycin 500 mg Tablet Salut Selaput', nama_dagang: 'Erythromycin', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Darya Varia', nie: 'GKL0908504817A1' },
  { code: '93001601', name: 'Gentamicin 80 mg/2 mL Injeksi', nama_dagang: 'Gentamicin', kekuatan: '80 mg/2 mL', bentuk_sediaan: 'Injeksi', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Indofarma Tbk', nie: 'GKL0208501017A1' },
  { code: '93001602', name: 'Meropenem 1 g Serbuk Injeksi', nama_dagang: 'Meropenem', kekuatan: '1 g', bentuk_sediaan: 'Serbuk Injeksi', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Kalbe Farma Tbk', nie: 'GKL1008505117A1' },
  { code: '93001603', name: 'Cotrimoxazole 480 mg Tablet', nama_dagang: 'Cotrimoxazole', kekuatan: '480 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antibiotik', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408502017A1' },

  // ===== Analgesik & Anti-Inflamasi =====
  { code: '93002001', name: 'Paracetamol 500 mg Tablet', nama_dagang: 'Paracetamol', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Analgesik', pabrik: 'PT Kimia Farma Tbk', nie: 'DBL0408501117A1' },
  { code: '93002002', name: 'Paracetamol 120 mg/5 mL Sirup', nama_dagang: 'Paracetamol Sirup', kekuatan: '120 mg/5 mL', bentuk_sediaan: 'Sirup', kategori: 'obat', golongan: 'Analgesik', pabrik: 'PT Kimia Farma Tbk', nie: 'DBL0408501217B1' },
  { code: '93002003', name: 'Paracetamol 1 g/100 mL Infus', nama_dagang: 'Paracetamol Infus', kekuatan: '1 g/100 mL', bentuk_sediaan: 'Infus', kategori: 'obat', golongan: 'Analgesik', pabrik: 'PT Kalbe Farma Tbk', nie: 'DKL1008505217A1' },
  { code: '93002101', name: 'Ibuprofen 400 mg Tablet Salut Selaput', nama_dagang: 'Ibuprofen', kekuatan: '400 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Anti-Inflamasi', pabrik: 'PT Indofarma Tbk', nie: 'GKL0208501117A1' },
  { code: '93002102', name: 'Natrium Diklofenak 50 mg Tablet Salut Enterik', nama_dagang: 'Natrium Diklofenak', kekuatan: '50 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Anti-Inflamasi', pabrik: 'PT Dexa Medica', nie: 'GKL1208504317A1' },
  { code: '93002103', name: 'Ketorolac 30 mg/mL Injeksi', nama_dagang: 'Ketorolac', kekuatan: '30 mg/mL', bentuk_sediaan: 'Injeksi', kategori: 'obat', golongan: 'Anti-Inflamasi', pabrik: 'PT Kalbe Farma Tbk', nie: 'DKL1008505317A1' },
  { code: '93002104', name: 'Metamizole 500 mg Tablet', nama_dagang: 'Metamizole', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Analgesik', pabrik: 'PT Phapros Tbk', nie: 'GKL0308500217A1' },
  { code: '93002201', name: 'Tramadol 50 mg Kapsul', nama_dagang: 'Tramadol', kekuatan: '50 mg', bentuk_sediaan: 'Kapsul', kategori: 'obat', golongan: 'Analgesik Opioid', pabrik: 'PT Sanbe Farma', nie: 'DKL0708503117A1' },
  { code: '93002202', name: 'Tramadol 100 mg/2 mL Injeksi', nama_dagang: 'Tramadol Injeksi', kekuatan: '100 mg/2 mL', bentuk_sediaan: 'Injeksi', kategori: 'obat', golongan: 'Analgesik Opioid', pabrik: 'PT Sanbe Farma', nie: 'DKL0708503217A1' },
  { code: '93002301', name: 'Asam Mefenamat 500 mg Kaplet', nama_dagang: 'Asam Mefenamat', kekuatan: '500 mg', bentuk_sediaan: 'Kaplet', kategori: 'obat', golongan: 'Anti-Inflamasi', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408502117A1' },

  // ===== Kardiovaskular =====
  { code: '93003001', name: 'Amlodipine 5 mg Tablet', nama_dagang: 'Amlodipine', kekuatan: '5 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antihipertensi', pabrik: 'PT Dexa Medica', nie: 'GKL1208504417A1' },
  { code: '93003002', name: 'Amlodipine 10 mg Tablet', nama_dagang: 'Amlodipine', kekuatan: '10 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antihipertensi', pabrik: 'PT Dexa Medica', nie: 'GKL1208504517A1' },
  { code: '93003101', name: 'Captopril 25 mg Tablet', nama_dagang: 'Captopril', kekuatan: '25 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antihipertensi', pabrik: 'PT Indofarma Tbk', nie: 'GKL0208501217A1' },
  { code: '93003102', name: 'Ramipril 5 mg Tablet', nama_dagang: 'Ramipril', kekuatan: '5 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antihipertensi', pabrik: 'PT Dexa Medica', nie: 'GKL1208504617A1' },
  { code: '93003201', name: 'Bisoprolol 5 mg Tablet Salut Selaput', nama_dagang: 'Bisoprolol', kekuatan: '5 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antihipertensi', pabrik: 'PT Kalbe Farma Tbk', nie: 'GKL1008505417A1' },
  { code: '93003301', name: 'Simvastatin 20 mg Tablet Salut Selaput', nama_dagang: 'Simvastatin', kekuatan: '20 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antilipidemia', pabrik: 'PT Hexpharm Jaya', nie: 'GKL0608502917A1' },
  { code: '93003302', name: 'Atorvastatin 20 mg Tablet Salut Selaput', nama_dagang: 'Atorvastatin', kekuatan: '20 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antilipidemia', pabrik: 'PT Dexa Medica', nie: 'GKL1208504717A1' },
  { code: '93003401', name: 'Clopidogrel 75 mg Tablet Salut Selaput', nama_dagang: 'Clopidogrel', kekuatan: '75 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antiplatelet', pabrik: 'PT Kalbe Farma Tbk', nie: 'GKL1008505517A1' },
  { code: '93003402', name: 'Asam Asetilsalisilat 80 mg Tablet', nama_dagang: 'Aspirin', kekuatan: '80 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antiplatelet', pabrik: 'PT Bayer Indonesia', nie: 'GKL0108500117A1' },
  { code: '93003501', name: 'Furosemid 40 mg Tablet', nama_dagang: 'Furosemid', kekuatan: '40 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Diuretik', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408502217A1' },
  { code: '93003502', name: 'Spironolakton 25 mg Tablet', nama_dagang: 'Spironolakton', kekuatan: '25 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Diuretik', pabrik: 'PT Phapros Tbk', nie: 'GKL0308500317A1' },
  { code: '93003601', name: 'Isosorbide Dinitrate 5 mg Tablet Sublingual', nama_dagang: 'ISDN', kekuatan: '5 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antiangina', pabrik: 'PT Darya Varia', nie: 'GKL0908504917A1' },

  // ===== Diabetes =====
  { code: '93004001', name: 'Metformin 500 mg Tablet', nama_dagang: 'Metformin', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antidiabetes', pabrik: 'PT Dexa Medica', nie: 'GKL1208504817A1' },
  { code: '93004002', name: 'Metformin 850 mg Tablet', nama_dagang: 'Metformin', kekuatan: '850 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antidiabetes', pabrik: 'PT Dexa Medica', nie: 'GKL1208504917A1' },
  { code: '93004101', name: 'Glimepiride 2 mg Tablet', nama_dagang: 'Glimepiride', kekuatan: '2 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antidiabetes', pabrik: 'PT Sanbe Farma', nie: 'GKL0708503217A1' },
  { code: '93004102', name: 'Glibenklamid 5 mg Tablet', nama_dagang: 'Glibenklamid', kekuatan: '5 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antidiabetes', pabrik: 'PT Indofarma Tbk', nie: 'GKL0208501317A1' },
  { code: '93004201', name: 'Insulin Aspart 100 IU/mL FlexPen 3 mL', nama_dagang: 'NovoRapid FlexPen', kekuatan: '100 IU/mL', bentuk_sediaan: 'Pen Injeksi', kategori: 'obat', golongan: 'Antidiabetes', pabrik: 'Novo Nordisk', nie: 'DKI0113500117A1' },
  { code: '93004202', name: 'Insulin Glargine 100 IU/mL SoloStar 3 mL', nama_dagang: 'Lantus SoloStar', kekuatan: '100 IU/mL', bentuk_sediaan: 'Pen Injeksi', kategori: 'obat', golongan: 'Antidiabetes', pabrik: 'Sanofi Aventis', nie: 'DKI0213500217A1' },
  { code: '93004301', name: 'Acarbose 50 mg Tablet', nama_dagang: 'Acarbose', kekuatan: '50 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antidiabetes', pabrik: 'PT Dexa Medica', nie: 'GKL1208505017A1' },
  { code: '93004302', name: 'Pioglitazone 30 mg Tablet', nama_dagang: 'Pioglitazone', kekuatan: '30 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antidiabetes', pabrik: 'PT Kalbe Farma Tbk', nie: 'GKL1008505617A1' },

  // ===== GI & Lambung =====
  { code: '93005001', name: 'Omeprazole 20 mg Kapsul', nama_dagang: 'Omeprazole', kekuatan: '20 mg', bentuk_sediaan: 'Kapsul', kategori: 'obat', golongan: 'Antitukak', pabrik: 'PT Dexa Medica', nie: 'GKL1208505117A1' },
  { code: '93005002', name: 'Lansoprazole 30 mg Kapsul', nama_dagang: 'Lansoprazole', kekuatan: '30 mg', bentuk_sediaan: 'Kapsul', kategori: 'obat', golongan: 'Antitukak', pabrik: 'PT Kalbe Farma Tbk', nie: 'GKL1008505717A1' },
  { code: '93005003', name: 'Ranitidine 150 mg Tablet Salut Selaput', nama_dagang: 'Ranitidine', kekuatan: '150 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antitukak', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408502317A1' },
  { code: '93005004', name: 'Sucralfate 500 mg/5 mL Suspensi', nama_dagang: 'Sucralfate', kekuatan: '500 mg/5 mL', bentuk_sediaan: 'Suspensi', kategori: 'obat', golongan: 'Antitukak', pabrik: 'PT Sanbe Farma', nie: 'GKL0708503317B1' },
  { code: '93005101', name: 'Ondansetron 4 mg Tablet Salut Selaput', nama_dagang: 'Ondansetron', kekuatan: '4 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antiemetik', pabrik: 'PT Dexa Medica', nie: 'GKL1208505217A1' },
  { code: '93005102', name: 'Ondansetron 4 mg/2 mL Injeksi', nama_dagang: 'Ondansetron Injeksi', kekuatan: '4 mg/2 mL', bentuk_sediaan: 'Injeksi', kategori: 'obat', golongan: 'Antiemetik', pabrik: 'PT Kalbe Farma Tbk', nie: 'DKL1008505817A1' },
  { code: '93005201', name: 'Domperidone 10 mg Tablet', nama_dagang: 'Domperidone', kekuatan: '10 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Prokinetik', pabrik: 'PT Bernofarm', nie: 'GKL0508502517A1' },
  { code: '93005202', name: 'Metoclopramide 10 mg Tablet', nama_dagang: 'Metoclopramide', kekuatan: '10 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Prokinetik', pabrik: 'PT Indofarma Tbk', nie: 'GKL0208501417A1' },

  // ===== Saraf & Psikiatri =====
  { code: '93006001', name: 'Gabapentin 300 mg Kapsul', nama_dagang: 'Gabapentin', kekuatan: '300 mg', bentuk_sediaan: 'Kapsul', kategori: 'obat', golongan: 'Antikonvulsan', pabrik: 'PT Kalbe Farma Tbk', nie: 'GKL1008505917A1' },
  { code: '93006002', name: 'Pregabalin 75 mg Kapsul', nama_dagang: 'Pregabalin', kekuatan: '75 mg', bentuk_sediaan: 'Kapsul', kategori: 'obat', golongan: 'Antikonvulsan', pabrik: 'PT Dexa Medica', nie: 'GKL1208505317A1' },
  { code: '93006101', name: 'Diazepam 5 mg Tablet', nama_dagang: 'Diazepam', kekuatan: '5 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Ansiolitik', pabrik: 'PT Kimia Farma Tbk', nie: 'DKL0408502417A1' },
  { code: '93006102', name: 'Alprazolam 0.5 mg Tablet', nama_dagang: 'Alprazolam', kekuatan: '0.5 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Ansiolitik', pabrik: 'PT Dexa Medica', nie: 'DKL1208505417A1' },
  { code: '93006201', name: 'Amitriptyline 25 mg Tablet Salut Selaput', nama_dagang: 'Amitriptyline', kekuatan: '25 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antidepresan', pabrik: 'PT Indofarma Tbk', nie: 'GKL0208501517A1' },
  { code: '93006202', name: 'Haloperidol 1.5 mg Tablet', nama_dagang: 'Haloperidol', kekuatan: '1.5 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antipsikotik', pabrik: 'PT Phapros Tbk', nie: 'DKL0308500417A1' },
  { code: '93006301', name: 'Phenytoin 100 mg Kapsul', nama_dagang: 'Phenytoin', kekuatan: '100 mg', bentuk_sediaan: 'Kapsul', kategori: 'obat', golongan: 'Antikonvulsan', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408502517A1' },
  { code: '93006302', name: 'Carbamazepine 200 mg Tablet', nama_dagang: 'Carbamazepine', kekuatan: '200 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antikonvulsan', pabrik: 'PT Novartis Indonesia', nie: 'GKL0113500317A1' },

  // ===== Alergi & Respirasi =====
  { code: '93007001', name: 'Cetirizine 10 mg Tablet Salut Selaput', nama_dagang: 'Cetirizine', kekuatan: '10 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antihistamin', pabrik: 'PT Dexa Medica', nie: 'GKL1208505517A1' },
  { code: '93007002', name: 'Loratadine 10 mg Tablet', nama_dagang: 'Loratadine', kekuatan: '10 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Antihistamin', pabrik: 'PT Sanbe Farma', nie: 'GKL0708503417A1' },
  { code: '93007101', name: 'Salbutamol 2 mg Tablet', nama_dagang: 'Salbutamol', kekuatan: '2 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Bronkodilator', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408502617A1' },
  { code: '93007102', name: 'Salbutamol 2.5 mg/2.5 mL Nebule', nama_dagang: 'Ventolin Nebule', kekuatan: '2.5 mg/2.5 mL', bentuk_sediaan: 'Nebule', kategori: 'obat', golongan: 'Bronkodilator', pabrik: 'PT GlaxoSmithKline', nie: 'DKI0113500417A1' },
  { code: '93007201', name: 'Dexamethasone 0.5 mg Tablet', nama_dagang: 'Dexamethasone', kekuatan: '0.5 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Kortikosteroid', pabrik: 'PT Indofarma Tbk', nie: 'GKL0208501617A1' },
  { code: '93007202', name: 'Methylprednisolone 4 mg Tablet', nama_dagang: 'Methylprednisolone', kekuatan: '4 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Kortikosteroid', pabrik: 'PT Dexa Medica', nie: 'GKL1208505617A1' },
  { code: '93007301', name: 'N-Acetylcysteine 200 mg Kapsul', nama_dagang: 'NAC', kekuatan: '200 mg', bentuk_sediaan: 'Kapsul', kategori: 'obat', golongan: 'Mukolitik', pabrik: 'PT Sanbe Farma', nie: 'GKL0708503517A1' },
  { code: '93007302', name: 'Ambroxol 30 mg Tablet', nama_dagang: 'Ambroxol', kekuatan: '30 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Mukolitik', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408502717A1' },

  // ===== Cairan Infus =====
  { code: '93008001', name: 'Natrium Klorida 0.9% 500 mL Infus', nama_dagang: 'NaCl 0.9%', kekuatan: '0.9%', bentuk_sediaan: 'Infus', kategori: 'obat', golongan: 'Cairan Infus', pabrik: 'PT Widatra Bhakti', nie: 'GKL1108505617B1' },
  { code: '93008002', name: 'Ringer Laktat 500 mL Infus', nama_dagang: 'Ringer Laktat', kekuatan: '-', bentuk_sediaan: 'Infus', kategori: 'obat', golongan: 'Cairan Infus', pabrik: 'PT Widatra Bhakti', nie: 'GKL1108505717B1' },
  { code: '93008003', name: 'Dextrose 5% 500 mL Infus', nama_dagang: 'Dextrose 5%', kekuatan: '5%', bentuk_sediaan: 'Infus', kategori: 'obat', golongan: 'Cairan Infus', pabrik: 'PT Widatra Bhakti', nie: 'GKL1108505817B1' },
  { code: '93008004', name: 'KA-EN 3B 500 mL Infus', nama_dagang: 'KA-EN 3B', kekuatan: '-', bentuk_sediaan: 'Infus', kategori: 'obat', golongan: 'Cairan Infus', pabrik: 'PT Otsuka Indonesia', nie: 'GKL1308506117B1' },
  { code: '93008005', name: 'Gelafundin 500 mL Infus', nama_dagang: 'Gelafundin', kekuatan: '4%', bentuk_sediaan: 'Infus', kategori: 'obat', golongan: 'Cairan Infus', pabrik: 'B. Braun', nie: 'DKI0413500617B1' },
  { code: '93008006', name: 'Aminofluid 500 mL Infus', nama_dagang: 'Aminofluid', kekuatan: '-', bentuk_sediaan: 'Infus', kategori: 'obat', golongan: 'Cairan Infus', pabrik: 'PT Otsuka Indonesia', nie: 'GKL1308506217B1' },

  // ===== Alkes & BHP =====
  { code: '93009001', name: 'Spuit Disposable 3 cc', nama_dagang: 'Spuit 3 cc', kekuatan: '3 cc', bentuk_sediaan: '-', kategori: 'alkes', golongan: 'Alat Suntik', pabrik: 'PT Oneject Indonesia', nie: 'AKL20803815709' },
  { code: '93009002', name: 'Spuit Disposable 5 cc', nama_dagang: 'Spuit 5 cc', kekuatan: '5 cc', bentuk_sediaan: '-', kategori: 'alkes', golongan: 'Alat Suntik', pabrik: 'PT Oneject Indonesia', nie: 'AKL20803815710' },
  { code: '93009003', name: 'Spuit Disposable 10 cc', nama_dagang: 'Spuit 10 cc', kekuatan: '10 cc', bentuk_sediaan: '-', kategori: 'alkes', golongan: 'Alat Suntik', pabrik: 'PT Oneject Indonesia', nie: 'AKL20803815711' },
  { code: '93009004', name: 'IV Catheter 20G', nama_dagang: 'Abbocath 20G', kekuatan: '20G', bentuk_sediaan: '-', kategori: 'alkes', golongan: 'Alat Infus', pabrik: 'B. Braun', nie: 'AKL20502815801' },
  { code: '93009005', name: 'IV Catheter 22G', nama_dagang: 'Abbocath 22G', kekuatan: '22G', bentuk_sediaan: '-', kategori: 'alkes', golongan: 'Alat Infus', pabrik: 'B. Braun', nie: 'AKL20502815802' },
  { code: '93009006', name: 'Infusion Set Dewasa', nama_dagang: 'Infusion Set', kekuatan: '-', bentuk_sediaan: '-', kategori: 'alkes', golongan: 'Alat Infus', pabrik: 'PT Oneject Indonesia', nie: 'AKL20301815901' },
  { code: '93009007', name: 'Kasa Steril 16x16 cm', nama_dagang: 'Kasa Steril', kekuatan: '16x16 cm', bentuk_sediaan: '-', kategori: 'bhp', golongan: 'Pembalut Luka', pabrik: 'PT OneMed', nie: 'AKL10704415501' },
  { code: '93009008', name: 'Plester Micropore 1 inch x 10 yard', nama_dagang: 'Micropore', kekuatan: '1 inch', bentuk_sediaan: '-', kategori: 'bhp', golongan: 'Pembalut Luka', pabrik: '3M Indonesia', nie: 'AKL10704415502' },
  { code: '93009009', name: 'Handscoen Steril Ukuran 7.5', nama_dagang: 'Handscoen Steril', kekuatan: '7.5', bentuk_sediaan: '-', kategori: 'alkes', golongan: 'Sarung Tangan', pabrik: 'PT Shamrock Manufacturing', nie: 'AKL20604816001' },
  { code: '93009010', name: 'Masker Bedah 3 Ply Earloop', nama_dagang: 'Masker Bedah', kekuatan: '-', bentuk_sediaan: '-', kategori: 'bhp', golongan: 'Pelindung Diri', pabrik: 'PT OneMed', nie: 'AKL20904816101' },
  { code: '93009011', name: 'Urine Bag 2000 mL', nama_dagang: 'Urine Bag', kekuatan: '2000 mL', bentuk_sediaan: '-', kategori: 'alkes', golongan: 'Alat Urin', pabrik: 'PT Oneject Indonesia', nie: 'AKL20201816201' },
  { code: '93009012', name: 'NGT (Nasogastric Tube) No. 16', nama_dagang: 'NGT No. 16', kekuatan: 'No. 16', bentuk_sediaan: '-', kategori: 'alkes', golongan: 'Selang Medis', pabrik: 'PT Oneject Indonesia', nie: 'AKL20201816301' },

  // ===== Vitamin & Suplemen =====
  { code: '93010001', name: 'Vitamin B Complex Tablet Salut Gula', nama_dagang: 'Vitamin B Complex', kekuatan: '-', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Vitamin', pabrik: 'PT Kimia Farma Tbk', nie: 'DBL0408502817A1' },
  { code: '93010002', name: 'Vitamin C 500 mg Tablet', nama_dagang: 'Vitamin C', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Vitamin', pabrik: 'PT Indofarma Tbk', nie: 'DBL0208501717A1' },
  { code: '93010003', name: 'Asam Folat 1 mg Tablet', nama_dagang: 'Asam Folat', kekuatan: '1 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Vitamin', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408502917A1' },
  { code: '93010004', name: 'Kalsium Laktat 500 mg Tablet', nama_dagang: 'Kalsium Laktat', kekuatan: '500 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Mineral', pabrik: 'PT Kimia Farma Tbk', nie: 'DBL0408503017A1' },
  { code: '93010005', name: 'Zinc 20 mg Tablet Dispersible', nama_dagang: 'Zinc', kekuatan: '20 mg', bentuk_sediaan: 'Tablet', kategori: 'obat', golongan: 'Mineral', pabrik: 'PT Indofarma Tbk', nie: 'DBL0208501817A1' },

  // ===== Mata, THT, Kulit =====
  { code: '93011001', name: 'Timolol 0.5% Tetes Mata 5 mL', nama_dagang: 'Timolol', kekuatan: '0.5%', bentuk_sediaan: 'Tetes Mata', kategori: 'obat', golongan: 'Obat Mata', pabrik: 'PT Cendo Pharmaceutical', nie: 'GKL1408506417A1' },
  { code: '93011002', name: 'Ofloxacin 3 mg/mL Tetes Mata 5 mL', nama_dagang: 'Ofloxacin', kekuatan: '3 mg/mL', bentuk_sediaan: 'Tetes Mata', kategori: 'obat', golongan: 'Obat Mata', pabrik: 'PT Cendo Pharmaceutical', nie: 'GKL1408506517A1' },
  { code: '93011003', name: 'Chloramphenicol 1% Tetes Telinga 10 mL', nama_dagang: 'Chloramphenicol Otic', kekuatan: '1%', bentuk_sediaan: 'Tetes Telinga', kategori: 'obat', golongan: 'Obat THT', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408503117A1' },
  { code: '93011004', name: 'Gentamicin 0.1% Krim 5 g', nama_dagang: 'Gentamicin Krim', kekuatan: '0.1%', bentuk_sediaan: 'Krim', kategori: 'obat', golongan: 'Obat Kulit', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408503217A1' },
  { code: '93011005', name: 'Ketoconazole 2% Krim 10 g', nama_dagang: 'Ketoconazole Krim', kekuatan: '2%', bentuk_sediaan: 'Krim', kategori: 'obat', golongan: 'Obat Kulit', pabrik: 'PT Kimia Farma Tbk', nie: 'GKL0408503317A1' },

  // ===== Anestesi =====
  { code: '93012001', name: 'Lidocaine 2% 20 mg/mL Injeksi 2 mL', nama_dagang: 'Lidocaine', kekuatan: '2%', bentuk_sediaan: 'Injeksi', kategori: 'obat', golongan: 'Anestesi Lokal', pabrik: 'PT Kimia Farma Tbk', nie: 'DKL0408503417A1' },
  { code: '93012002', name: 'Bupivacaine 0.5% Spinal Heavy 4 mL', nama_dagang: 'Bupivacaine', kekuatan: '0.5%', bentuk_sediaan: 'Injeksi', kategori: 'obat', golongan: 'Anestesi Lokal', pabrik: 'B. Braun', nie: 'DKI0413500717A1' },
  { code: '93012003', name: 'Propofol 10 mg/mL 20 mL Injeksi', nama_dagang: 'Propofol', kekuatan: '10 mg/mL', bentuk_sediaan: 'Injeksi', kategori: 'obat', golongan: 'Anestesi Umum', pabrik: 'PT Fresenius Kabi', nie: 'DKI0513500817A1' },
  { code: '93012004', name: 'Ketamine 50 mg/mL 10 mL Injeksi', nama_dagang: 'Ketamine', kekuatan: '50 mg/mL', bentuk_sediaan: 'Injeksi', kategori: 'obat', golongan: 'Anestesi Umum', pabrik: 'PT Kimia Farma Tbk', nie: 'DKL0408503517A1' },
]

export async function seed(knex: Knex): Promise<void> {
  for (const entry of KFA_DATA) {
    const exists = await knex('public.kfa_codes').where('code', entry.code).first()
    if (!exists) {
      await knex('public.kfa_codes').insert(entry)
    }
  }
}
