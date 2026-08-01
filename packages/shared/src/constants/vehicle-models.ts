export interface IsuzuVehicleModel {
  name: string
  category: string
  price: number
  formattedPrice: string
}

export const ISUZU_OFFICIAL_LINEUP: IsuzuVehicleModel[] = [
  // สปาร์ค (Single Cab / Cab Chassis)
  { name: 'Spark 2.2 Ddi B Cab Chassis', category: 'สปาร์ค (Single Cab)', price: 535000, formattedPrice: '฿535,000' },
  { name: 'Spark 2.2 Ddi B Flat Deck (SWB)', category: 'สปาร์ค (Single Cab)', price: 560000, formattedPrice: '฿560,000' },
  { name: 'Spark 2.2 Ddi S', category: 'สปาร์ค (Single Cab)', price: 585000, formattedPrice: '฿585,000' },
  { name: 'Spark 3.0 Ddi S', category: 'สปาร์ค (Single Cab)', price: 610000, formattedPrice: '฿610,000' },
  { name: 'Spark 3.0 Ddi S 4x4', category: 'สปาร์ค (Single Cab)', price: 690000, formattedPrice: '฿690,000' },

  // ปิกอัพ 2 ประตู (Spacecab & Hi-Lander 2-door)
  { name: 'Spacecab 2.2 Ddi S', category: 'ปิกอัพ 2 ประตู (Spacecab)', price: 650000, formattedPrice: '฿650,000' },
  { name: 'Spacecab 2.2 Ddi L', category: 'ปิกอัพ 2 ประตู (Spacecab)', price: 730000, formattedPrice: '฿730,000' },
  { name: 'Hi-Lander 2-door 2.2 Ddi L', category: 'ปิกอัพ 2 ประตู (Hi-Lander)', price: 750000, formattedPrice: '฿750,000' },
  { name: 'Hi-Lander 2-door 2.2 Ddi Z', category: 'ปิกอัพ 2 ประตู (Hi-Lander)', price: 815000, formattedPrice: '฿815,000' },

  // ปิกอัพ 4 ประตู (Cab4 & Hi-Lander 4-door)
  { name: 'Cab4 2.2 Ddi S', category: 'ปิกอัพ 4 ประตู (Cab4)', price: 730000, formattedPrice: '฿730,000' },
  { name: 'Cab4 2.2 Ddi L', category: 'ปิกอัพ 4 ประตู (Cab4)', price: 805000, formattedPrice: '฿805,000' },
  { name: 'Cab4 2.2 Ddi Z A/T', category: 'ปิกอัพ 4 ประตู (Cab4)', price: 885000, formattedPrice: '฿885,000' },
  { name: 'Hi-Lander 4-door 2.2 Ddi L', category: 'ปิกอัพ 4 ประตู (Hi-Lander)', price: 865000, formattedPrice: '฿865,000' },
  { name: 'Hi-Lander 4-door 2.2 Ddi Z', category: 'ปิกอัพ 4 ประตู (Hi-Lander)', price: 930000, formattedPrice: '฿930,000' },
  { name: 'Hi-Lander 4-door 2.2 Ddi M A/T', category: 'ปิกอัพ 4 ประตู (Hi-Lander)', price: 1075000, formattedPrice: '฿1,075,000' },
  { name: 'Hi-Lander 4-door 3.0 Ddi M A/T', category: 'ปิกอัพ 4 ประตู (Hi-Lander)', price: 1120000, formattedPrice: '฿1,120,000' },

  // วี-ครอส 4x4 (V-Cross 4x4)
  { name: 'V-Cross 3.0 Ddi Z 2-door', category: 'วี-ครอส 4x4 (V-Cross)', price: 890000, formattedPrice: '฿890,000' },
  { name: 'V-Cross 2.2 Ddi Z 4-door A/T', category: 'วี-ครอส 4x4 (V-Cross)', price: 1000000, formattedPrice: '฿1,000,000' },
  { name: 'V-Cross 3.0 Ddi Z 4-door', category: 'วี-ครอส 4x4 (V-Cross)', price: 1050000, formattedPrice: '฿1,050,000' },
  { name: 'V-Cross 3.0 Ddi M 4-door A/T', category: 'วี-ครอส 4x4 (V-Cross)', price: 1257000, formattedPrice: '฿1,257,000' },

  // เอ็กซ์-ซีรี่ส์ (X-Series)
  { name: 'X-Series 2.2 Ddi Speed 2-door', category: 'เอ็กซ์-ซีรี่ส์ (X-Series)', price: 748000, formattedPrice: '฿748,000' },
  { name: 'X-Series 2.2 Ddi Speed 4-door', category: 'เอ็กซ์-ซีรี่ส์ (X-Series)', price: 844000, formattedPrice: '฿844,000' },
  { name: 'X-Series 2.2 Ddi Hi-Lander 4-door', category: 'เอ็กซ์-ซีรี่ส์ (X-Series)', price: 957000, formattedPrice: '฿957,000' },

  // มิว-เอ็กซ์ (MU-X)
  { name: 'MU-X 2.2 Ddi Active A/T', category: 'มิว-เอ็กซ์ (MU-X)', price: 1184000, formattedPrice: '฿1,184,000' },
  { name: 'MU-X 2.2 Ddi Elegant A/T', category: 'มิว-เอ็กซ์ (MU-X)', price: 1419000, formattedPrice: '฿1,419,000' },
  { name: 'MU-X 2.2 Ddi Ultimate A/T', category: 'มิว-เอ็กซ์ (MU-X)', price: 1544000, formattedPrice: '฿1,544,000' },
  { name: 'MU-X 2.2 Ddi RS A/T', category: 'มิว-เอ็กซ์ (MU-X)', price: 1619000, formattedPrice: '฿1,619,000' },
  { name: 'MU-X 3.0 Ddi RS 4WD A/T', category: 'มิว-เอ็กซ์ (MU-X)', price: 1759000, formattedPrice: '฿1,759,000' },

  // รถบรรทุก (King of Trucks)
  { name: 'ELF (4 ล้อ / 6 ล้อ)', category: 'รถบรรทุก (Trucks)', price: 1050000, formattedPrice: '฿1,050,000' },
  { name: 'FORWARD (6 ล้อ)', category: 'รถบรรทุก (Trucks)', price: 1850000, formattedPrice: '฿1,850,000' },
  { name: 'GIGA (10 ล้อ / หัวลาก)', category: 'รถบรรทุก (Trucks)', price: 2950000, formattedPrice: '฿2,950,000' },
]

export const ISUZU_MODELS = ISUZU_OFFICIAL_LINEUP.map((m) => m.name)

export const INTERESTED_MODELS = [
  'กระบะตอนเดียว (Spark)', 'กระบะแค็บ (Spacecab / Hi-Lander)', 'กระบะ 4 ประตู (Cab4 / Hi-Lander)',
  'ขับเคลื่อน 4 ล้อ (V-Cross 4x4)', 'เอ็กซ์-ซีรี่ส์ (X-Series)', 'มิว-เอ็กซ์ (MU-X)', 'รถบรรทุก (Trucks)',
] as const

export const PURCHASE_PURPOSES = [
  'ขยายธุรกิจ', 'ทดแทนรถเก่า', 'ลดค่าซ่อม',
  'เพิ่มประสิทธิภาพการขนส่ง', 'รถผู้บริหาร/พนักงาน',
] as const
