import * as XLSX from "xlsx";

// 4 signalements réalistes respectant strictement le modèle de la Section 5 du PDF
const urbanIssues = [
  {
    issueId: "CITY-2026-001",
    issueType: "StreetLight",
    location: "Avenue Mohammed V",
    description: "Streetlight not working, zone obscure la nuit",
    reportDate: "2026-11-19",
    priority: "High",
    reportedBy: "Citizen01",
    assignedTo: "UrbanTeam01",
    status: "Reported"
  },
  {
    issueId: "CITY-2026-002",
    issueType: "Pothole",
    location: "Boulevard Zerktouni",
    description: "Large pothole causing traffic and danger",
    reportDate: "2026-11-19",
    priority: "High",
    reportedBy: "Citizen02",
    assignedTo: "RoadTeam03",
    status: "Reported"
  },
  {
    issueId: "CITY-2026-003",
    issueType: "WaterLeak",
    location: "Rue Ibn Batouta",
    description: "Pipe leakage on pedestrian walkway",
    reportDate: "2026-11-20",
    priority: "Medium",
    reportedBy: "Citizen03",
    assignedTo: "WaterTeam01",
    status: "Reported"
  },
  {
    issueId: "CITY-2026-004",
    issueType: "WasteManagement",
    location: "Quartier Al Qods",
    description: "Overflowing public trash containers",
    reportDate: "2026-11-20",
    priority: "Low",
    reportedBy: "Citizen04",
    assignedTo: "CleanTeam02",
    status: "Reported"
  }
];

// Création du classeur Excel
const worksheet = XLSX.utils.json_to_sheet(urbanIssues);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Signalements");

// Sauvegarde dans le fichier officiel attendu
XLSX.writeFile(workbook, "urban_issues.xlsx");

console.log("✅ Fichier 'urban_issues.xlsx' genere avec succes avec les 9 colonnes du PDF !");