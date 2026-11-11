import type { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  // ============================================================
  // Lab Parameters (46 items, 7 categories)
  // ============================================================
  const existingLabParams = await knex('public.lab_parameters').select('id').first()
  if (!existingLabParams) {
    await knex('public.lab_parameters').insert([
      // Hematologi
      { kode: 'HB', nama: 'Hemoglobin', kategori: 'Hematologi', satuan: 'g/dL', nilai_normal_l: '13.0-17.5', nilai_normal_p: '12.0-15.5', specimen: 'darah', metode: 'Cyanmethemoglobin' },
      { kode: 'HCT', nama: 'Hematokrit', kategori: 'Hematologi', satuan: '%', nilai_normal_l: '40-54', nilai_normal_p: '36-47', specimen: 'darah', metode: 'Automated' },
      { kode: 'RBC', nama: 'Eritrosit', kategori: 'Hematologi', satuan: 'juta/µL', nilai_normal_l: '4.5-6.5', nilai_normal_p: '3.8-5.8', specimen: 'darah', metode: 'Automated' },
      { kode: 'WBC', nama: 'Leukosit', kategori: 'Hematologi', satuan: 'ribu/µL', nilai_normal_l: '4.0-11.0', nilai_normal_p: '4.0-11.0', specimen: 'darah', metode: 'Automated' },
      { kode: 'PLT', nama: 'Trombosit', kategori: 'Hematologi', satuan: 'ribu/µL', nilai_normal_l: '150-400', nilai_normal_p: '150-400', specimen: 'darah', metode: 'Automated' },
      { kode: 'MCV', nama: 'MCV', kategori: 'Hematologi', satuan: 'fL', nilai_normal_l: '80-100', nilai_normal_p: '80-100', specimen: 'darah', metode: 'Automated' },
      { kode: 'MCH', nama: 'MCH', kategori: 'Hematologi', satuan: 'pg', nilai_normal_l: '27-34', nilai_normal_p: '27-34', specimen: 'darah', metode: 'Automated' },
      { kode: 'MCHC', nama: 'MCHC', kategori: 'Hematologi', satuan: 'g/dL', nilai_normal_l: '32-36', nilai_normal_p: '32-36', specimen: 'darah', metode: 'Automated' },
      { kode: 'LED', nama: 'Laju Endap Darah', kategori: 'Hematologi', satuan: 'mm/jam', nilai_normal_l: '0-10', nilai_normal_p: '0-20', specimen: 'darah', metode: 'Westergren' },
      { kode: 'RET', nama: 'Retikulosit', kategori: 'Hematologi', satuan: '%', nilai_normal_l: '0.5-2.5', nilai_normal_p: '0.5-2.5', specimen: 'darah', metode: 'Manual' },
      { kode: 'BT', nama: 'Bleeding Time', kategori: 'Hematologi', satuan: 'menit', nilai_normal_l: '1-6', nilai_normal_p: '1-6', specimen: 'darah', metode: 'Duke' },
      { kode: 'CT', nama: 'Clotting Time', kategori: 'Hematologi', satuan: 'menit', nilai_normal_l: '5-15', nilai_normal_p: '5-15', specimen: 'darah', metode: 'Lee-White' },
      // Kimia Klinik
      { kode: 'GDS', nama: 'Gula Darah Sewaktu', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '70-200', nilai_normal_p: '70-200', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'GDP', nama: 'Gula Darah Puasa', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '70-110', nilai_normal_p: '70-110', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'GD2PP', nama: 'Gula Darah 2 Jam PP', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '<140', nilai_normal_p: '<140', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'HBA1C', nama: 'HbA1c', kategori: 'Kimia Klinik', satuan: '%', nilai_normal_l: '4.0-6.0', nilai_normal_p: '4.0-6.0', specimen: 'darah', metode: 'HPLC' },
      { kode: 'CHOL', nama: 'Kolesterol Total', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '<200', nilai_normal_p: '<200', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'TG', nama: 'Trigliserida', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '<150', nilai_normal_p: '<150', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'HDL', nama: 'HDL Kolesterol', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '>40', nilai_normal_p: '>50', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'LDL', nama: 'LDL Kolesterol', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '<100', nilai_normal_p: '<100', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'UREA', nama: 'Ureum', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '10-50', nilai_normal_p: '10-50', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'CREA', nama: 'Kreatinin', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '0.7-1.3', nilai_normal_p: '0.6-1.1', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'UA', nama: 'Asam Urat', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '3.5-7.0', nilai_normal_p: '2.6-6.0', specimen: 'darah', metode: 'Enzymatic' },
      { kode: 'SGOT', nama: 'SGOT (AST)', kategori: 'Kimia Klinik', satuan: 'U/L', nilai_normal_l: '5-40', nilai_normal_p: '5-32', specimen: 'darah', metode: 'IFCC' },
      { kode: 'SGPT', nama: 'SGPT (ALT)', kategori: 'Kimia Klinik', satuan: 'U/L', nilai_normal_l: '7-56', nilai_normal_p: '7-45', specimen: 'darah', metode: 'IFCC' },
      { kode: 'BILT', nama: 'Bilirubin Total', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '0.1-1.2', nilai_normal_p: '0.1-1.2', specimen: 'darah', metode: 'Colorimetric' },
      { kode: 'BILD', nama: 'Bilirubin Direk', kategori: 'Kimia Klinik', satuan: 'mg/dL', nilai_normal_l: '0.0-0.3', nilai_normal_p: '0.0-0.3', specimen: 'darah', metode: 'Colorimetric' },
      { kode: 'ALP', nama: 'Alkaline Phosphatase', kategori: 'Kimia Klinik', satuan: 'U/L', nilai_normal_l: '44-147', nilai_normal_p: '44-147', specimen: 'darah', metode: 'IFCC' },
      { kode: 'ALB', nama: 'Albumin', kategori: 'Kimia Klinik', satuan: 'g/dL', nilai_normal_l: '3.5-5.5', nilai_normal_p: '3.5-5.5', specimen: 'darah', metode: 'BCG' },
      // Elektrolit
      { kode: 'NA', nama: 'Natrium (Na)', kategori: 'Elektrolit', satuan: 'mmol/L', nilai_normal_l: '135-145', nilai_normal_p: '135-145', specimen: 'darah', metode: 'ISE' },
      { kode: 'K', nama: 'Kalium (K)', kategori: 'Elektrolit', satuan: 'mmol/L', nilai_normal_l: '3.5-5.0', nilai_normal_p: '3.5-5.0', specimen: 'darah', metode: 'ISE' },
      { kode: 'CL', nama: 'Klorida (Cl)', kategori: 'Elektrolit', satuan: 'mmol/L', nilai_normal_l: '98-106', nilai_normal_p: '98-106', specimen: 'darah', metode: 'ISE' },
      { kode: 'CA', nama: 'Kalsium (Ca)', kategori: 'Elektrolit', satuan: 'mg/dL', nilai_normal_l: '8.6-10.2', nilai_normal_p: '8.6-10.2', specimen: 'darah', metode: 'Colorimetric' },
      // Urinalisis
      { kode: 'UL', nama: 'Urinalisis Lengkap', kategori: 'Urinalisis', satuan: '-', nilai_normal_l: '-', nilai_normal_p: '-', specimen: 'urine', metode: 'Dipstick + Mikroskopis' },
      { kode: 'UPROT', nama: 'Protein Urine', kategori: 'Urinalisis', satuan: '-', nilai_normal_l: 'Negatif', nilai_normal_p: 'Negatif', specimen: 'urine', metode: 'Dipstick' },
      { kode: 'UGLUC', nama: 'Glukosa Urine', kategori: 'Urinalisis', satuan: '-', nilai_normal_l: 'Negatif', nilai_normal_p: 'Negatif', specimen: 'urine', metode: 'Dipstick' },
      // Serologi / Imunologi
      { kode: 'HBSAG', nama: 'HBsAg', kategori: 'Serologi', satuan: '-', nilai_normal_l: 'Non-Reaktif', nilai_normal_p: 'Non-Reaktif', specimen: 'darah', metode: 'Immunochromatography' },
      { kode: 'AHCV', nama: 'Anti-HCV', kategori: 'Serologi', satuan: '-', nilai_normal_l: 'Non-Reaktif', nilai_normal_p: 'Non-Reaktif', specimen: 'darah', metode: 'Immunochromatography' },
      { kode: 'HIV', nama: 'Anti-HIV', kategori: 'Serologi', satuan: '-', nilai_normal_l: 'Non-Reaktif', nilai_normal_p: 'Non-Reaktif', specimen: 'darah', metode: 'Immunochromatography' },
      { kode: 'WIDAL', nama: 'Widal', kategori: 'Serologi', satuan: '-', nilai_normal_l: '<1/80', nilai_normal_p: '<1/80', specimen: 'darah', metode: 'Slide Agglutination' },
      { kode: 'RF', nama: 'Rheumatoid Factor', kategori: 'Serologi', satuan: 'IU/mL', nilai_normal_l: '<14', nilai_normal_p: '<14', specimen: 'darah', metode: 'Latex Agglutination' },
      { kode: 'CRP', nama: 'C-Reactive Protein', kategori: 'Serologi', satuan: 'mg/L', nilai_normal_l: '<6', nilai_normal_p: '<6', specimen: 'darah', metode: 'Latex Agglutination' },
      // Koagulasi
      { kode: 'PT', nama: 'Prothrombin Time', kategori: 'Koagulasi', satuan: 'detik', nilai_normal_l: '10-14', nilai_normal_p: '10-14', specimen: 'darah', metode: 'Koagulometri' },
      { kode: 'APTT', nama: 'APTT', kategori: 'Koagulasi', satuan: 'detik', nilai_normal_l: '25-35', nilai_normal_p: '25-35', specimen: 'darah', metode: 'Koagulometri' },
      { kode: 'INR', nama: 'INR', kategori: 'Koagulasi', satuan: '-', nilai_normal_l: '0.8-1.2', nilai_normal_p: '0.8-1.2', specimen: 'darah', metode: 'Koagulometri' },
      // Analisa Gas Darah
      { kode: 'PH', nama: 'pH Darah', kategori: 'Analisa Gas Darah', satuan: '-', nilai_normal_l: '7.35-7.45', nilai_normal_p: '7.35-7.45', specimen: 'darah', metode: 'Blood Gas Analyzer' },
    ])
  }

  // ============================================================
  // Radiology Examinations (34 items, 6 modalities)
  // ============================================================
  const existingRadExams = await knex('public.radiology_examinations').select('id').first()
  if (!existingRadExams) {
    await knex('public.radiology_examinations').insert([
      // X-Ray
      { kode: 'XR-THX-PA', nama: 'Rontgen Thorax PA', modalitas: 'xray', kategori: 'Thorax', deskripsi: 'Foto polos dada posisi PA', tarif_default: 150000 },
      { kode: 'XR-THX-AP', nama: 'Rontgen Thorax AP', modalitas: 'xray', kategori: 'Thorax', deskripsi: 'Foto polos dada posisi AP', tarif_default: 150000 },
      { kode: 'XR-THX-LAT', nama: 'Rontgen Thorax Lateral', modalitas: 'xray', kategori: 'Thorax', deskripsi: 'Foto polos dada posisi lateral', tarif_default: 175000 },
      { kode: 'XR-ABD', nama: 'Rontgen Abdomen', modalitas: 'xray', kategori: 'Abdomen', deskripsi: 'Foto polos abdomen 3 posisi', tarif_default: 200000 },
      { kode: 'XR-SKL-AP', nama: 'Rontgen Skull AP/Lat', modalitas: 'xray', kategori: 'Kepala', deskripsi: 'Foto polos kepala AP dan lateral', tarif_default: 200000 },
      { kode: 'XR-EXT-H', nama: 'Rontgen Tangan/Wrist', modalitas: 'xray', kategori: 'Ekstremitas', deskripsi: 'Foto polos tangan atau pergelangan', tarif_default: 125000 },
      { kode: 'XR-EXT-F', nama: 'Rontgen Kaki/Ankle', modalitas: 'xray', kategori: 'Ekstremitas', deskripsi: 'Foto polos kaki atau pergelangan', tarif_default: 125000 },
      { kode: 'XR-EXT-K', nama: 'Rontgen Knee', modalitas: 'xray', kategori: 'Ekstremitas', deskripsi: 'Foto polos lutut AP/lateral', tarif_default: 150000 },
      { kode: 'XR-PELV', nama: 'Rontgen Pelvis', modalitas: 'xray', kategori: 'Pelvis', deskripsi: 'Foto polos pelvis AP', tarif_default: 175000 },
      { kode: 'XR-SPIN-C', nama: 'Rontgen Cervical', modalitas: 'xray', kategori: 'Spine', deskripsi: 'Foto polos tulang leher', tarif_default: 200000 },
      { kode: 'XR-SPIN-L', nama: 'Rontgen Lumbosacral', modalitas: 'xray', kategori: 'Spine', deskripsi: 'Foto polos tulang punggung bawah', tarif_default: 200000 },
      { kode: 'XR-SPIN-T', nama: 'Rontgen Thoracolumbal', modalitas: 'xray', kategori: 'Spine', deskripsi: 'Foto polos tulang punggung atas', tarif_default: 200000 },
      // USG
      { kode: 'USG-ABD', nama: 'USG Abdomen', modalitas: 'usg', kategori: 'Abdomen', deskripsi: 'Ultrasonografi abdomen lengkap', persiapan: 'Puasa 6-8 jam', tarif_default: 350000 },
      { kode: 'USG-OBS', nama: 'USG Obstetri', modalitas: 'usg', kategori: 'Obstetri', deskripsi: 'Ultrasonografi kehamilan', tarif_default: 300000 },
      { kode: 'USG-MAM', nama: 'USG Mammae', modalitas: 'usg', kategori: 'Mammae', deskripsi: 'Ultrasonografi payudara', tarif_default: 350000 },
      { kode: 'USG-THY', nama: 'USG Thyroid', modalitas: 'usg', kategori: 'Thyroid', deskripsi: 'Ultrasonografi kelenjar tiroid', tarif_default: 350000 },
      { kode: 'USG-GIN', nama: 'USG Ginekologi', modalitas: 'usg', kategori: 'Ginekologi', deskripsi: 'Ultrasonografi organ reproduksi wanita', tarif_default: 350000 },
      { kode: 'USG-URO', nama: 'USG Urologi', modalitas: 'usg', kategori: 'Urologi', deskripsi: 'Ultrasonografi ginjal dan saluran kemih', tarif_default: 350000 },
      // CT Scan
      { kode: 'CT-HEAD', nama: 'CT Scan Kepala', modalitas: 'ct_scan', kategori: 'Kepala', deskripsi: 'CT scan kepala tanpa kontras', tarif_default: 1500000 },
      { kode: 'CT-HEAD-C', nama: 'CT Scan Kepala + Kontras', modalitas: 'ct_scan', kategori: 'Kepala', deskripsi: 'CT scan kepala dengan kontras', persiapan: 'Cek BUN/kreatinin', tarif_default: 2500000 },
      { kode: 'CT-THX', nama: 'CT Scan Thorax', modalitas: 'ct_scan', kategori: 'Thorax', deskripsi: 'CT scan thorax tanpa kontras', tarif_default: 2000000 },
      { kode: 'CT-ABD', nama: 'CT Scan Abdomen', modalitas: 'ct_scan', kategori: 'Abdomen', deskripsi: 'CT scan abdomen tanpa kontras', tarif_default: 2000000 },
      { kode: 'CT-ABD-C', nama: 'CT Scan Abdomen + Kontras', modalitas: 'ct_scan', kategori: 'Abdomen', deskripsi: 'CT scan abdomen dengan kontras', persiapan: 'Puasa 6 jam, cek BUN/kreatinin', tarif_default: 3000000 },
      { kode: 'CT-SPIN', nama: 'CT Scan Spine', modalitas: 'ct_scan', kategori: 'Spine', deskripsi: 'CT scan tulang belakang', tarif_default: 2000000 },
      // MRI
      { kode: 'MRI-HEAD', nama: 'MRI Kepala', modalitas: 'mri', kategori: 'Kepala', deskripsi: 'MRI kepala tanpa kontras', persiapan: 'Lepas benda logam', tarif_default: 3500000 },
      { kode: 'MRI-HEAD-C', nama: 'MRI Kepala + Kontras', modalitas: 'mri', kategori: 'Kepala', deskripsi: 'MRI kepala dengan kontras', persiapan: 'Lepas benda logam, cek BUN/kreatinin', tarif_default: 5000000 },
      { kode: 'MRI-SPIN-C', nama: 'MRI Cervical', modalitas: 'mri', kategori: 'Spine', deskripsi: 'MRI tulang leher', persiapan: 'Lepas benda logam', tarif_default: 3500000 },
      { kode: 'MRI-SPIN-L', nama: 'MRI Lumbosacral', modalitas: 'mri', kategori: 'Spine', deskripsi: 'MRI tulang punggung bawah', persiapan: 'Lepas benda logam', tarif_default: 3500000 },
      { kode: 'MRI-KNEE', nama: 'MRI Knee', modalitas: 'mri', kategori: 'Ekstremitas', deskripsi: 'MRI sendi lutut', persiapan: 'Lepas benda logam', tarif_default: 3500000 },
      { kode: 'MRI-ABD', nama: 'MRI Abdomen', modalitas: 'mri', kategori: 'Abdomen', deskripsi: 'MRI abdomen', persiapan: 'Puasa 4 jam, lepas benda logam', tarif_default: 4000000 },
      // Mammografi
      { kode: 'MAMMO', nama: 'Mammografi Bilateral', modalitas: 'mammografi', kategori: 'Mammae', deskripsi: 'Mammografi kedua payudara', tarif_default: 500000 },
      // Panoramik
      { kode: 'PANO', nama: 'Panoramik Gigi', modalitas: 'panoramik', kategori: 'Gigi', deskripsi: 'Foto panoramik seluruh gigi', tarif_default: 200000 },
      { kode: 'CEPH', nama: 'Cephalometri', modalitas: 'panoramik', kategori: 'Gigi', deskripsi: 'Foto cephalometri ortodonti', tarif_default: 200000 },
      { kode: 'PERIAP', nama: 'Periapikal', modalitas: 'panoramik', kategori: 'Gigi', deskripsi: 'Foto periapikal gigi', tarif_default: 100000 },
    ])
  }

  // ============================================================
  // Subscription Plans (4 plans)
  // ============================================================
  const existingPlans = await knex('public.subscription_plans').select('id').first()
  if (!existingPlans) {
    await knex('public.subscription_plans').insert([
      {
        code: 'trial',
        name: 'Trial',
        description: 'Paket uji coba gratis 30 hari',
        price_monthly: 0,
        price_yearly: 0,
        max_users: 5,
        max_patients: 100,
        max_doctors: 3,
        max_storage_gb: 5,
        allowed_modules: JSON.stringify(['*']),
        trial_days: 30,
        sort_order: 0,
      },
      {
        code: 'basic',
        name: 'Basic',
        description: 'Paket dasar untuk klinik kecil',
        price_monthly: 1500000,
        price_yearly: 15000000,
        max_users: 20,
        max_patients: 5000,
        max_doctors: 10,
        max_storage_gb: 50,
        allowed_modules: JSON.stringify(['dashboard', 'pasien', 'pendaftaran', 'rekam-medis', 'farmasi', 'kasir']),
        trial_days: 0,
        sort_order: 1,
      },
      {
        code: 'professional',
        name: 'Professional',
        description: 'Paket lengkap untuk RS tipe C-D',
        price_monthly: 5000000,
        price_yearly: 50000000,
        max_users: 60,
        max_patients: 50000,
        max_doctors: 30,
        max_storage_gb: 200,
        allowed_modules: JSON.stringify(['*']),
        trial_days: 0,
        sort_order: 2,
      },
      {
        code: 'enterprise',
        name: 'Enterprise',
        description: 'Paket enterprise untuk RS tipe A-B',
        price_monthly: 10000000,
        price_yearly: 100000000,
        max_users: 999,
        max_patients: 999999,
        max_doctors: 999,
        max_storage_gb: 1000,
        allowed_modules: JSON.stringify(['*']),
        trial_days: 0,
        sort_order: 3,
      },
    ])
  }
}
