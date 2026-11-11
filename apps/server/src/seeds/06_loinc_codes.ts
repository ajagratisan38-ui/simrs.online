import type { Knex } from 'knex'

interface LoincEntry {
  code: string
  name: string
  short_name: string
  kategori: string
  class: string
  property: string
  time_aspect: string
  system: string
  scale: string
  unit: string
  ucum_code: string
}

const LOINC_DATA: LoincEntry[] = [
  // ===== Hematologi =====
  { code: '718-7', name: 'Hemoglobin [Mass/volume] in Blood', short_name: 'Hemoglobin', kategori: 'Hematologi', class: 'HEM/BC', property: 'MCnc', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: 'g/dL', ucum_code: 'g/dL' },
  { code: '4544-3', name: 'Hematocrit [Volume Fraction] of Blood by Automated count', short_name: 'Hematokrit', kategori: 'Hematologi', class: 'HEM/BC', property: 'VFr', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: '%', ucum_code: '%' },
  { code: '789-8', name: 'Erythrocytes [#/volume] in Blood by Automated count', short_name: 'Eritrosit (RBC)', kategori: 'Hematologi', class: 'HEM/BC', property: 'NCnc', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: '10^6/uL', ucum_code: '10*6/uL' },
  { code: '6690-2', name: 'Leukocytes [#/volume] in Blood by Automated count', short_name: 'Leukosit (WBC)', kategori: 'Hematologi', class: 'HEM/BC', property: 'NCnc', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: '10^3/uL', ucum_code: '10*3/uL' },
  { code: '777-3', name: 'Platelets [#/volume] in Blood by Automated count', short_name: 'Trombosit (PLT)', kategori: 'Hematologi', class: 'HEM/BC', property: 'NCnc', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: '10^3/uL', ucum_code: '10*3/uL' },
  { code: '787-2', name: 'MCV [Entitic volume] by Automated count', short_name: 'MCV', kategori: 'Hematologi', class: 'HEM/BC', property: 'EntVol', time_aspect: 'Pt', system: 'RBC', scale: 'Qn', unit: 'fL', ucum_code: 'fL' },
  { code: '785-6', name: 'MCH [Entitic mass] by Automated count', short_name: 'MCH', kategori: 'Hematologi', class: 'HEM/BC', property: 'EntMass', time_aspect: 'Pt', system: 'RBC', scale: 'Qn', unit: 'pg', ucum_code: 'pg' },
  { code: '786-4', name: 'MCHC [Mass/volume] by Automated count', short_name: 'MCHC', kategori: 'Hematologi', class: 'HEM/BC', property: 'MCnc', time_aspect: 'Pt', system: 'RBC', scale: 'Qn', unit: 'g/dL', ucum_code: 'g/dL' },
  { code: '4537-7', name: 'Erythrocyte sedimentation rate by Westergren method', short_name: 'LED (ESR)', kategori: 'Hematologi', class: 'HEM/BC', property: 'Vel', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: 'mm/h', ucum_code: 'mm/h' },
  { code: '17849-1', name: 'Reticulocytes/100 erythrocytes in Blood', short_name: 'Retikulosit', kategori: 'Hematologi', class: 'HEM/BC', property: 'NFr', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: '%', ucum_code: '%' },
  { code: '5902-2', name: 'Prothrombin time (PT)', short_name: 'PT (Prothrombin Time)', kategori: 'Hematologi', class: 'COAG', property: 'Time', time_aspect: 'Pt', system: 'PPP', scale: 'Qn', unit: 's', ucum_code: 's' },
  { code: '3173-2', name: 'Activated partial thromboplastin time (aPTT) in PPP', short_name: 'aPTT', kategori: 'Hematologi', class: 'COAG', property: 'Time', time_aspect: 'Pt', system: 'PPP', scale: 'Qn', unit: 's', ucum_code: 's' },
  { code: '6301-6', name: 'INR in Platelet poor plasma by Coagulation assay', short_name: 'INR', kategori: 'Hematologi', class: 'COAG', property: 'Rto', time_aspect: 'Pt', system: 'PPP', scale: 'Qn', unit: '{INR}', ucum_code: '{INR}' },
  { code: '5905-5', name: 'Bleeding time', short_name: 'Bleeding Time', kategori: 'Hematologi', class: 'COAG', property: 'Time', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: 'min', ucum_code: 'min' },
  { code: '5904-8', name: 'Clotting time', short_name: 'Clotting Time', kategori: 'Hematologi', class: 'COAG', property: 'Time', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: 'min', ucum_code: 'min' },
  { code: '30341-2', name: 'Erythrocyte sedimentation rate', short_name: 'LED Westergren', kategori: 'Hematologi', class: 'HEM/BC', property: 'Vel', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: 'mm/h', ucum_code: 'mm/h' },

  // ===== Kimia Klinik =====
  { code: '2345-7', name: 'Glucose [Mass/volume] in Serum or Plasma', short_name: 'Glukosa Darah Sewaktu', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '1558-6', name: 'Fasting glucose [Mass/volume] in Serum or Plasma', short_name: 'Glukosa Puasa', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '4548-4', name: 'Hemoglobin A1c/Hemoglobin.total in Blood', short_name: 'HbA1c', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MFr', time_aspect: 'Pt', system: 'Bld', scale: 'Qn', unit: '%', ucum_code: '%' },
  { code: '2093-3', name: 'Cholesterol [Mass/volume] in Serum or Plasma', short_name: 'Kolesterol Total', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '2571-8', name: 'Triglyceride [Mass/volume] in Serum or Plasma', short_name: 'Trigliserida', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '2085-9', name: 'HDL Cholesterol [Mass/volume] in Serum or Plasma', short_name: 'HDL Kolesterol', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '13457-7', name: 'LDL Cholesterol [Mass/volume] in Serum or Plasma by calculation', short_name: 'LDL Kolesterol', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '3094-0', name: 'Urea nitrogen [Mass/volume] in Serum or Plasma', short_name: 'Ureum / BUN', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '2160-0', name: 'Creatinine [Mass/volume] in Serum or Plasma', short_name: 'Kreatinin', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '3084-1', name: 'Urate [Mass/volume] in Serum or Plasma', short_name: 'Asam Urat', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '1920-8', name: 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma', short_name: 'AST / SGOT', kategori: 'Kimia Klinik', class: 'CHEM', property: 'CCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'U/L', ucum_code: 'U/L' },
  { code: '1742-6', name: 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma', short_name: 'ALT / SGPT', kategori: 'Kimia Klinik', class: 'CHEM', property: 'CCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'U/L', ucum_code: 'U/L' },
  { code: '1975-2', name: 'Bilirubin.total [Mass/volume] in Serum or Plasma', short_name: 'Bilirubin Total', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '1968-7', name: 'Bilirubin.direct [Mass/volume] in Serum or Plasma', short_name: 'Bilirubin Direk', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '6768-6', name: 'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma', short_name: 'ALP', kategori: 'Kimia Klinik', class: 'CHEM', property: 'CCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'U/L', ucum_code: 'U/L' },
  { code: '1751-7', name: 'Albumin [Mass/volume] in Serum or Plasma', short_name: 'Albumin', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'g/dL', ucum_code: 'g/dL' },
  { code: '2324-2', name: 'Gamma glutamyl transferase [Enzymatic activity/volume] in Serum or Plasma', short_name: 'GGT', kategori: 'Kimia Klinik', class: 'CHEM', property: 'CCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'U/L', ucum_code: 'U/L' },
  { code: '2885-2', name: 'Protein [Mass/volume] in Serum or Plasma', short_name: 'Protein Total', kategori: 'Kimia Klinik', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'g/dL', ucum_code: 'g/dL' },
  { code: '1798-8', name: 'Amylase [Enzymatic activity/volume] in Serum or Plasma', short_name: 'Amilase', kategori: 'Kimia Klinik', class: 'CHEM', property: 'CCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'U/L', ucum_code: 'U/L' },
  { code: '3040-3', name: 'Lipase [Enzymatic activity/volume] in Serum or Plasma', short_name: 'Lipase', kategori: 'Kimia Klinik', class: 'CHEM', property: 'CCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'U/L', ucum_code: 'U/L' },
  { code: '14682-9', name: 'Creatinine [Mass/volume] in Serum or Plasma (estimated GFR)', short_name: 'eGFR', kategori: 'Kimia Klinik', class: 'CHEM', property: 'ArVRat', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mL/min/1.73m2', ucum_code: 'mL/min/{1.73_m2}' },

  // ===== Elektrolit =====
  { code: '2951-2', name: 'Sodium [Moles/volume] in Serum or Plasma', short_name: 'Natrium (Na)', kategori: 'Elektrolit', class: 'CHEM', property: 'SCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mmol/L', ucum_code: 'mmol/L' },
  { code: '2823-3', name: 'Potassium [Moles/volume] in Serum or Plasma', short_name: 'Kalium (K)', kategori: 'Elektrolit', class: 'CHEM', property: 'SCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mmol/L', ucum_code: 'mmol/L' },
  { code: '2075-0', name: 'Chloride [Moles/volume] in Serum or Plasma', short_name: 'Klorida (Cl)', kategori: 'Elektrolit', class: 'CHEM', property: 'SCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mmol/L', ucum_code: 'mmol/L' },
  { code: '17861-6', name: 'Calcium [Mass/volume] in Serum or Plasma', short_name: 'Kalsium (Ca)', kategori: 'Elektrolit', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '2601-3', name: 'Magnesium [Mass/volume] in Serum or Plasma', short_name: 'Magnesium (Mg)', kategori: 'Elektrolit', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },
  { code: '2777-1', name: 'Phosphate [Mass/volume] in Serum or Plasma', short_name: 'Fosfat (P)', kategori: 'Elektrolit', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/dL', ucum_code: 'mg/dL' },

  // ===== Urinalisis =====
  { code: '24356-8', name: 'Urinalysis complete panel in Urine', short_name: 'Urinalisis Lengkap', kategori: 'Urinalisis', class: 'UA', property: '-', time_aspect: 'Pt', system: 'Urine', scale: '-', unit: '-', ucum_code: '' },
  { code: '2888-6', name: 'Protein [Mass/volume] in Urine by Test strip', short_name: 'Protein Urine', kategori: 'Urinalisis', class: 'UA', property: 'MCnc', time_aspect: 'Pt', system: 'Urine', scale: 'Ord', unit: '-', ucum_code: '' },
  { code: '2350-7', name: 'Glucose [Mass/volume] in Urine by Test strip', short_name: 'Glukosa Urine', kategori: 'Urinalisis', class: 'UA', property: 'MCnc', time_aspect: 'Pt', system: 'Urine', scale: 'Ord', unit: '-', ucum_code: '' },
  { code: '5811-5', name: 'Specific gravity of Urine by Test strip', short_name: 'Berat Jenis Urine', kategori: 'Urinalisis', class: 'UA', property: 'Rden', time_aspect: 'Pt', system: 'Urine', scale: 'Qn', unit: '-', ucum_code: '' },
  { code: '2756-5', name: 'pH of Urine by Test strip', short_name: 'pH Urine', kategori: 'Urinalisis', class: 'UA', property: 'LsCnc', time_aspect: 'Pt', system: 'Urine', scale: 'Qn', unit: '[pH]', ucum_code: '[pH]' },
  { code: '20505-4', name: 'Bilirubin.total [Presence] in Urine by Test strip', short_name: 'Bilirubin Urine', kategori: 'Urinalisis', class: 'UA', property: 'ACnc', time_aspect: 'Pt', system: 'Urine', scale: 'Ord', unit: '-', ucum_code: '' },
  { code: '5770-3', name: 'Ketones [Presence] in Urine by Test strip', short_name: 'Keton Urine', kategori: 'Urinalisis', class: 'UA', property: 'ACnc', time_aspect: 'Pt', system: 'Urine', scale: 'Ord', unit: '-', ucum_code: '' },
  { code: '5794-3', name: 'Hemoglobin [Presence] in Urine by Test strip', short_name: 'Darah Urine', kategori: 'Urinalisis', class: 'UA', property: 'ACnc', time_aspect: 'Pt', system: 'Urine', scale: 'Ord', unit: '-', ucum_code: '' },
  { code: '5767-9', name: 'Appearance of Urine', short_name: 'Warna Urine', kategori: 'Urinalisis', class: 'UA', property: 'Type', time_aspect: 'Pt', system: 'Urine', scale: 'Nom', unit: '-', ucum_code: '' },
  { code: '20463-6', name: 'Leukocyte esterase [Presence] in Urine by Test strip', short_name: 'Leukosit Esterase Urine', kategori: 'Urinalisis', class: 'UA', property: 'ACnc', time_aspect: 'Pt', system: 'Urine', scale: 'Ord', unit: '-', ucum_code: '' },

  // ===== Serologi / Imunologi =====
  { code: '5196-1', name: 'Hepatitis B virus surface Ag [Presence] in Serum', short_name: 'HBsAg', kategori: 'Serologi', class: 'SERO', property: 'ACnc', time_aspect: 'Pt', system: 'Ser', scale: 'Ord', unit: '-', ucum_code: '' },
  { code: '16128-1', name: 'Hepatitis C virus Ab [Presence] in Serum', short_name: 'Anti-HCV', kategori: 'Serologi', class: 'SERO', property: 'ACnc', time_aspect: 'Pt', system: 'Ser', scale: 'Ord', unit: '-', ucum_code: '' },
  { code: '68961-2', name: 'HIV 1+2 Ab [Presence] in Serum or Plasma', short_name: 'Anti-HIV 1+2', kategori: 'Serologi', class: 'SERO', property: 'ACnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Ord', unit: '-', ucum_code: '' },
  { code: '5322-2', name: 'Salmonella sp identified in Serum by Agglutination', short_name: 'Widal', kategori: 'Serologi', class: 'SERO', property: 'Prid', time_aspect: 'Pt', system: 'Ser', scale: 'Nom', unit: '-', ucum_code: '' },
  { code: '11572-5', name: 'Rheumatoid factor [Units/volume] in Serum', short_name: 'Rheumatoid Factor (RF)', kategori: 'Serologi', class: 'SERO', property: 'ACnc', time_aspect: 'Pt', system: 'Ser', scale: 'Qn', unit: 'IU/mL', ucum_code: '[IU]/mL' },
  { code: '1988-5', name: 'C reactive protein [Mass/volume] in Serum or Plasma', short_name: 'CRP', kategori: 'Serologi', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'mg/L', ucum_code: 'mg/L' },
  { code: '5180-5', name: 'Hepatitis B virus surface Ab [Units/volume] in Serum', short_name: 'Anti-HBs', kategori: 'Serologi', class: 'SERO', property: 'ACnc', time_aspect: 'Pt', system: 'Ser', scale: 'Qn', unit: 'mIU/mL', ucum_code: 'm[IU]/mL' },
  { code: '22322-2', name: 'Hepatitis B virus e Ag [Presence] in Serum', short_name: 'HBeAg', kategori: 'Serologi', class: 'SERO', property: 'ACnc', time_aspect: 'Pt', system: 'Ser', scale: 'Ord', unit: '-', ucum_code: '' },
  { code: '33462-3', name: 'Hepatitis B virus DNA [Units/volume] in Serum or Plasma by NAA', short_name: 'HBV DNA', kategori: 'Serologi', class: 'MICRO', property: 'ACnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'IU/mL', ucum_code: '[IU]/mL' },
  { code: '71776-9', name: 'SARS-CoV-2 (COVID-19) Ag [Presence] in Respiratory specimen', short_name: 'Antigen SARS-CoV-2', kategori: 'Serologi', class: 'MICRO', property: 'ACnc', time_aspect: 'Pt', system: 'Resp', scale: 'Ord', unit: '-', ucum_code: '' },

  // ===== Gas Darah =====
  { code: '2744-1', name: 'pH of Arterial blood', short_name: 'pH Darah Arteri', kategori: 'Gas Darah', class: 'CHEM', property: 'LsCnc', time_aspect: 'Pt', system: 'BldA', scale: 'Qn', unit: '[pH]', ucum_code: '[pH]' },
  { code: '2019-8', name: 'Carbon dioxide [Partial pressure] in Arterial blood', short_name: 'pCO2', kategori: 'Gas Darah', class: 'CHEM', property: 'PPres', time_aspect: 'Pt', system: 'BldA', scale: 'Qn', unit: 'mmHg', ucum_code: 'mm[Hg]' },
  { code: '2703-7', name: 'Oxygen [Partial pressure] in Arterial blood', short_name: 'pO2', kategori: 'Gas Darah', class: 'CHEM', property: 'PPres', time_aspect: 'Pt', system: 'BldA', scale: 'Qn', unit: 'mmHg', ucum_code: 'mm[Hg]' },
  { code: '1963-8', name: 'Bicarbonate [Moles/volume] in Arterial blood', short_name: 'Bikarbonat (HCO3)', kategori: 'Gas Darah', class: 'CHEM', property: 'SCnc', time_aspect: 'Pt', system: 'BldA', scale: 'Qn', unit: 'mmol/L', ucum_code: 'mmol/L' },
  { code: '2714-4', name: 'Base excess in Arterial blood by calculation', short_name: 'Base Excess (BE)', kategori: 'Gas Darah', class: 'CHEM', property: 'SCnc', time_aspect: 'Pt', system: 'BldA', scale: 'Qn', unit: 'mmol/L', ucum_code: 'mmol/L' },
  { code: '20564-1', name: 'Oxygen saturation in Arterial blood', short_name: 'SaO2', kategori: 'Gas Darah', class: 'CHEM', property: 'SFr', time_aspect: 'Pt', system: 'BldA', scale: 'Qn', unit: '%', ucum_code: '%' },

  // ===== Marker Jantung =====
  { code: '6598-7', name: 'Troponin T.cardiac [Mass/volume] in Serum or Plasma', short_name: 'Troponin T', kategori: 'Marker Jantung', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ng/mL', ucum_code: 'ng/mL' },
  { code: '33762-6', name: 'NT-proBNP [Mass/volume] in Serum or Plasma', short_name: 'NT-proBNP', kategori: 'Marker Jantung', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'pg/mL', ucum_code: 'pg/mL' },
  { code: '2157-6', name: 'Creatine kinase [Enzymatic activity/volume] in Serum or Plasma', short_name: 'CK (Creatine Kinase)', kategori: 'Marker Jantung', class: 'CHEM', property: 'CCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'U/L', ucum_code: 'U/L' },
  { code: '13969-1', name: 'Creatine kinase.MB [Mass/volume] in Serum or Plasma', short_name: 'CK-MB', kategori: 'Marker Jantung', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ng/mL', ucum_code: 'ng/mL' },
  { code: '30392-5', name: 'D-dimer [Mass/volume] (FEU) in Platelet poor plasma', short_name: 'D-Dimer', kategori: 'Marker Jantung', class: 'COAG', property: 'MCnc', time_aspect: 'Pt', system: 'PPP', scale: 'Qn', unit: 'ng/mL', ucum_code: 'ng/mL{FEU}' },
  { code: '49563-0', name: 'Troponin I.cardiac [Mass/volume] in Serum or Plasma', short_name: 'Troponin I', kategori: 'Marker Jantung', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ng/mL', ucum_code: 'ng/mL' },

  // ===== Hormon =====
  { code: '3016-3', name: 'Thyrotropin [Units/volume] in Serum or Plasma', short_name: 'TSH', kategori: 'Hormon', class: 'CHEM', property: 'ACnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'uIU/mL', ucum_code: 'u[IU]/mL' },
  { code: '3053-6', name: 'Triiodothyronine (T3) Free [Mass/volume] in Serum or Plasma', short_name: 'FT3', kategori: 'Hormon', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'pg/mL', ucum_code: 'pg/mL' },
  { code: '3024-7', name: 'Thyroxine (T4) Free [Mass/volume] in Serum or Plasma', short_name: 'FT4', kategori: 'Hormon', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ng/dL', ucum_code: 'ng/dL' },

  // ===== Tumor Marker =====
  { code: '2276-4', name: 'Ferritin [Mass/volume] in Serum or Plasma', short_name: 'Ferritin', kategori: 'Tumor Marker & Besi', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ng/mL', ucum_code: 'ng/mL' },
  { code: '2498-4', name: 'Iron [Mass/volume] in Serum or Plasma', short_name: 'Besi (Fe / SI)', kategori: 'Tumor Marker & Besi', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ug/dL', ucum_code: 'ug/dL' },
  { code: '2502-3', name: 'Iron binding capacity [Mass/volume] in Serum or Plasma', short_name: 'TIBC', kategori: 'Tumor Marker & Besi', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ug/dL', ucum_code: 'ug/dL' },
  { code: '4547-6', name: 'Prostate specific Ag [Mass/volume] in Serum or Plasma', short_name: 'PSA', kategori: 'Tumor Marker & Besi', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ng/mL', ucum_code: 'ng/mL' },
  { code: '1834-1', name: 'Alpha-1-fetoprotein [Mass/volume] in Serum or Plasma', short_name: 'AFP', kategori: 'Tumor Marker & Besi', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ng/mL', ucum_code: 'ng/mL' },
  { code: '2039-6', name: 'Carcinoembryonic Ag [Mass/volume] in Serum or Plasma', short_name: 'CEA', kategori: 'Tumor Marker & Besi', class: 'CHEM', property: 'MCnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'ng/mL', ucum_code: 'ng/mL' },
  { code: '24108-3', name: 'CA 19-9 [Units/volume] in Serum or Plasma', short_name: 'CA 19-9', kategori: 'Tumor Marker & Besi', class: 'CHEM', property: 'ACnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'U/mL', ucum_code: 'U/mL' },
  { code: '10334-1', name: 'Cancer Ag 125 [Units/volume] in Serum or Plasma', short_name: 'CA 125', kategori: 'Tumor Marker & Besi', class: 'CHEM', property: 'ACnc', time_aspect: 'Pt', system: 'Ser/Plas', scale: 'Qn', unit: 'U/mL', ucum_code: 'U/mL' },

  // ===== Vital Signs (for SATUSEHAT mapping) =====
  { code: '8310-5', name: 'Body temperature', short_name: 'Suhu Tubuh', kategori: 'Tanda Vital', class: 'VITALS', property: 'Temp', time_aspect: 'Pt', system: '-', scale: 'Qn', unit: 'Cel', ucum_code: 'Cel' },
  { code: '8867-4', name: 'Heart rate', short_name: 'Nadi', kategori: 'Tanda Vital', class: 'VITALS', property: 'NRat', time_aspect: 'Pt', system: '-', scale: 'Qn', unit: '/min', ucum_code: '/min' },
  { code: '9279-1', name: 'Respiratory rate', short_name: 'Respirasi', kategori: 'Tanda Vital', class: 'VITALS', property: 'NRat', time_aspect: 'Pt', system: '-', scale: 'Qn', unit: '/min', ucum_code: '/min' },
  { code: '8480-6', name: 'Systolic blood pressure', short_name: 'Tekanan Darah Sistolik', kategori: 'Tanda Vital', class: 'VITALS', property: 'Pres', time_aspect: 'Pt', system: '-', scale: 'Qn', unit: 'mmHg', ucum_code: 'mm[Hg]' },
  { code: '8462-4', name: 'Diastolic blood pressure', short_name: 'Tekanan Darah Diastolik', kategori: 'Tanda Vital', class: 'VITALS', property: 'Pres', time_aspect: 'Pt', system: '-', scale: 'Qn', unit: 'mmHg', ucum_code: 'mm[Hg]' },
  { code: '2708-6', name: 'Oxygen saturation in Arterial blood by Pulse oximetry', short_name: 'SpO2', kategori: 'Tanda Vital', class: 'VITALS', property: 'SFr', time_aspect: 'Pt', system: 'BldA', scale: 'Qn', unit: '%', ucum_code: '%' },
  { code: '29463-7', name: 'Body weight', short_name: 'Berat Badan', kategori: 'Tanda Vital', class: 'VITALS', property: 'Mass', time_aspect: 'Pt', system: '-', scale: 'Qn', unit: 'kg', ucum_code: 'kg' },
  { code: '8302-2', name: 'Body height', short_name: 'Tinggi Badan', kategori: 'Tanda Vital', class: 'VITALS', property: 'Len', time_aspect: 'Pt', system: '-', scale: 'Qn', unit: 'cm', ucum_code: 'cm' },
  { code: '39156-5', name: 'Body mass index (BMI)', short_name: 'IMT / BMI', kategori: 'Tanda Vital', class: 'VITALS', property: 'RelMCnc', time_aspect: 'Pt', system: '-', scale: 'Qn', unit: 'kg/m2', ucum_code: 'kg/m2' },
]

// Mapping lab_parameters.kode → LOINC code
const LAB_PARAM_LOINC_MAP: Record<string, string> = {
  HB: '718-7',
  HCT: '4544-3',
  RBC: '789-8',
  WBC: '6690-2',
  PLT: '777-3',
  MCV: '787-2',
  MCH: '785-6',
  MCHC: '786-4',
  LED: '4537-7',
  RET: '17849-1',
  GDS: '2345-7',
  GDP: '1558-6',
  GD2PP: '2345-7',
  HBA1C: '4548-4',
  CHOL: '2093-3',
  TG: '2571-8',
  HDL: '2085-9',
  LDL: '13457-7',
  UREA: '3094-0',
  CREA: '2160-0',
  UA: '3084-1',
  SGOT: '1920-8',
  SGPT: '1742-6',
  BILT: '1975-2',
  BILD: '1968-7',
  ALP: '6768-6',
  ALB: '1751-7',
  NA: '2951-2',
  K: '2823-3',
  CL: '2075-0',
  CA: '17861-6',
  UL: '24356-8',
  UPROT: '2888-6',
  UGLUC: '2350-7',
  HBSAG: '5196-1',
  AHCV: '16128-1',
  HIV: '68961-2',
  WIDAL: '5322-2',
  RF: '11572-5',
  CRP: '1988-5',
  PT: '5902-2',
  APTT: '3173-2',
  INR: '6301-6',
  BT: '5905-5',
  CT: '5904-8',
  PH: '2744-1',
}

export async function seed(knex: Knex): Promise<void> {
  // Insert LOINC codes (idempotent — skip existing)
  for (const entry of LOINC_DATA) {
    const exists = await knex('public.loinc_codes').where('code', entry.code).first()
    if (!exists) {
      await knex('public.loinc_codes').insert(entry)
    }
  }

  // Map existing lab_parameters to LOINC codes
  const hasLoincCol = await knex.schema.withSchema('public').hasColumn('lab_parameters', 'loinc_code')
  if (hasLoincCol) {
    for (const [kode, loincCode] of Object.entries(LAB_PARAM_LOINC_MAP)) {
      await knex('public.lab_parameters')
        .where('kode', kode)
        .whereNull('loinc_code')
        .update({ loinc_code: loincCode })
    }
  }
}
