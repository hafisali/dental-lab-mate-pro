export interface ToothInfo {
  id: number;
  name: string;
  quadrant: number;
  position: number;
  type: "incisor" | "canine" | "premolar" | "molar";
  isDeciduous: boolean;
}

// FDI Permanent Teeth (32 teeth)
export const PERMANENT_TEETH: ToothInfo[] = [
  // Upper Right (Q1: 11-18)
  { id: 18, name: "Upper Right 3rd Molar", quadrant: 1, position: 8, type: "molar", isDeciduous: false },
  { id: 17, name: "Upper Right 2nd Molar", quadrant: 1, position: 7, type: "molar", isDeciduous: false },
  { id: 16, name: "Upper Right 1st Molar", quadrant: 1, position: 6, type: "molar", isDeciduous: false },
  { id: 15, name: "Upper Right 2nd Premolar", quadrant: 1, position: 5, type: "premolar", isDeciduous: false },
  { id: 14, name: "Upper Right 1st Premolar", quadrant: 1, position: 4, type: "premolar", isDeciduous: false },
  { id: 13, name: "Upper Right Canine", quadrant: 1, position: 3, type: "canine", isDeciduous: false },
  { id: 12, name: "Upper Right Lateral Incisor", quadrant: 1, position: 2, type: "incisor", isDeciduous: false },
  { id: 11, name: "Upper Right Central Incisor", quadrant: 1, position: 1, type: "incisor", isDeciduous: false },
  // Upper Left (Q2: 21-28)
  { id: 21, name: "Upper Left Central Incisor", quadrant: 2, position: 1, type: "incisor", isDeciduous: false },
  { id: 22, name: "Upper Left Lateral Incisor", quadrant: 2, position: 2, type: "incisor", isDeciduous: false },
  { id: 23, name: "Upper Left Canine", quadrant: 2, position: 3, type: "canine", isDeciduous: false },
  { id: 24, name: "Upper Left 1st Premolar", quadrant: 2, position: 4, type: "premolar", isDeciduous: false },
  { id: 25, name: "Upper Left 2nd Premolar", quadrant: 2, position: 5, type: "premolar", isDeciduous: false },
  { id: 26, name: "Upper Left 1st Molar", quadrant: 2, position: 6, type: "molar", isDeciduous: false },
  { id: 27, name: "Upper Left 2nd Molar", quadrant: 2, position: 7, type: "molar", isDeciduous: false },
  { id: 28, name: "Upper Left 3rd Molar", quadrant: 2, position: 8, type: "molar", isDeciduous: false },
  // Lower Left (Q3: 31-38)
  { id: 38, name: "Lower Left 3rd Molar", quadrant: 3, position: 8, type: "molar", isDeciduous: false },
  { id: 37, name: "Lower Left 2nd Molar", quadrant: 3, position: 7, type: "molar", isDeciduous: false },
  { id: 36, name: "Lower Left 1st Molar", quadrant: 3, position: 6, type: "molar", isDeciduous: false },
  { id: 35, name: "Lower Left 2nd Premolar", quadrant: 3, position: 5, type: "premolar", isDeciduous: false },
  { id: 34, name: "Lower Left 1st Premolar", quadrant: 3, position: 4, type: "premolar", isDeciduous: false },
  { id: 33, name: "Lower Left Canine", quadrant: 3, position: 3, type: "canine", isDeciduous: false },
  { id: 32, name: "Lower Left Lateral Incisor", quadrant: 3, position: 2, type: "incisor", isDeciduous: false },
  { id: 31, name: "Lower Left Central Incisor", quadrant: 3, position: 1, type: "incisor", isDeciduous: false },
  // Lower Right (Q4: 41-48)
  { id: 41, name: "Lower Right Central Incisor", quadrant: 4, position: 1, type: "incisor", isDeciduous: false },
  { id: 42, name: "Lower Right Lateral Incisor", quadrant: 4, position: 2, type: "incisor", isDeciduous: false },
  { id: 43, name: "Lower Right Canine", quadrant: 4, position: 3, type: "canine", isDeciduous: false },
  { id: 44, name: "Lower Right 1st Premolar", quadrant: 4, position: 4, type: "premolar", isDeciduous: false },
  { id: 45, name: "Lower Right 2nd Premolar", quadrant: 4, position: 5, type: "premolar", isDeciduous: false },
  { id: 46, name: "Lower Right 1st Molar", quadrant: 4, position: 6, type: "molar", isDeciduous: false },
  { id: 47, name: "Lower Right 2nd Molar", quadrant: 4, position: 7, type: "molar", isDeciduous: false },
  { id: 48, name: "Lower Right 3rd Molar", quadrant: 4, position: 8, type: "molar", isDeciduous: false },
];

// FDI Deciduous (Primary) Teeth (20 teeth)
export const DECIDUOUS_TEETH: ToothInfo[] = [
  // Upper Right (Q5: 51-55)
  { id: 55, name: "Upper Right 2nd Molar", quadrant: 5, position: 5, type: "molar", isDeciduous: true },
  { id: 54, name: "Upper Right 1st Molar", quadrant: 5, position: 4, type: "molar", isDeciduous: true },
  { id: 53, name: "Upper Right Canine", quadrant: 5, position: 3, type: "canine", isDeciduous: true },
  { id: 52, name: "Upper Right Lateral Incisor", quadrant: 5, position: 2, type: "incisor", isDeciduous: true },
  { id: 51, name: "Upper Right Central Incisor", quadrant: 5, position: 1, type: "incisor", isDeciduous: true },
  // Upper Left (Q6: 61-65)
  { id: 61, name: "Upper Left Central Incisor", quadrant: 6, position: 1, type: "incisor", isDeciduous: true },
  { id: 62, name: "Upper Left Lateral Incisor", quadrant: 6, position: 2, type: "incisor", isDeciduous: true },
  { id: 63, name: "Upper Left Canine", quadrant: 6, position: 3, type: "canine", isDeciduous: true },
  { id: 64, name: "Upper Left 1st Molar", quadrant: 6, position: 4, type: "molar", isDeciduous: true },
  { id: 65, name: "Upper Left 2nd Molar", quadrant: 6, position: 5, type: "molar", isDeciduous: true },
  // Lower Left (Q7: 71-75)
  { id: 75, name: "Lower Left 2nd Molar", quadrant: 7, position: 5, type: "molar", isDeciduous: true },
  { id: 74, name: "Lower Left 1st Molar", quadrant: 7, position: 4, type: "molar", isDeciduous: true },
  { id: 73, name: "Lower Left Canine", quadrant: 7, position: 3, type: "canine", isDeciduous: true },
  { id: 72, name: "Lower Left Lateral Incisor", quadrant: 7, position: 2, type: "incisor", isDeciduous: true },
  { id: 71, name: "Lower Left Central Incisor", quadrant: 7, position: 1, type: "incisor", isDeciduous: true },
  // Lower Right (Q8: 81-85)
  { id: 81, name: "Lower Right Central Incisor", quadrant: 8, position: 1, type: "incisor", isDeciduous: true },
  { id: 82, name: "Lower Right Lateral Incisor", quadrant: 8, position: 2, type: "incisor", isDeciduous: true },
  { id: 83, name: "Lower Right Canine", quadrant: 8, position: 3, type: "canine", isDeciduous: true },
  { id: 84, name: "Lower Right 1st Molar", quadrant: 8, position: 4, type: "molar", isDeciduous: true },
  { id: 85, name: "Lower Right 2nd Molar", quadrant: 8, position: 5, type: "molar", isDeciduous: true },
];
