// Adresse officielle du Smart Contract UrbanIssueRegistry
export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const STATUS_LABELS = ["Reported", "Assigned", "InProgress", "Resolved", "Closed"];

export const CONTRACT_ABI = [
  "function reportIssue(string issueCode, string issueType, string location, string description, string reportDate, string priority) external returns (uint256)",
  "function assignTeam(uint256 id, string teamName, string comment) external",
  "function updateStatus(uint256 id, uint8 newStatus, string comment) external",
  "function batchRegisterIssues(string[] issueCodes, string[] issueTypes, string[] locations, string[] descriptions, string[] reportDates, string[] priorities, string[] assignedTeams, uint8[] initialStatuses) external",
  "function getIssue(uint256 id) external view returns (tuple(uint256 id, string issueCode, string issueType, string location, string description, string reportDate, string priority, address reporter, string assignedTo, uint8 status, bool exists))",
  "function getIssueHistory(uint256 id) external view returns (tuple(uint256 timestamp, uint8 status, string assignedTo, string comment, address actor)[])",
  "function getTotalIssues() external view returns (uint256)",
  "function municipalityAdmin() external view returns (address)"
];